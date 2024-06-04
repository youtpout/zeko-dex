import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest } from 'o1js';
import { Prover } from 'o1js/dist/node/lib/proof-system/zkprogram';
import { add } from 'o1js/dist/node/lib/provable/gadgets/native-curve';


export class PoolState extends Struct({
  reserve0: UInt64,
  reserve1: UInt64,
  totalSupply: UInt64,
  init: Bool
}) {

}

// minimum liquidity permanently blocked in the pool
export const minimunLiquidity = 10 ** 3;

export class SimpleToken extends TokenContract {
  init() {
    super.init();

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async mintTo(to: PublicKey, amount: UInt64) {
    this.internal.mint({ address: to, amount });
  }
}

/**
 * Pool contract who holds token
 */
export class Pool extends TokenContract {
  @state(PublicKey) token0 = State<PublicKey>();
  @state(PublicKey) token1 = State<PublicKey>();
  @state(PoolState) poolState = State<PoolState>();
  @state(Field) kLast = State<Field>();

  init() {
    super.init();
  }

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method.returns(UInt64)
  async create(_token0: PublicKey, _token1: PublicKey) {
    _token0.equals(_token1).assertFalse("Identical token");

    let _poolState = this.poolState.getAndRequireEquals();
    _poolState.init.assertFalse("Pool already created");

    let simpleToken0 = new SimpleToken(_token0);
    let simpleToken1 = new SimpleToken(_token1);


    let update0 = new SimpleToken(
      this.address,
      simpleToken0.deriveTokenId()
    );

    let update1 = new SimpleToken(
      this.address,
      simpleToken1.deriveTokenId()
    );

    // the amount need to be pretransfer to prevent from too much accoun update
    let amount0 = update0.account.balance.get();
    let amount1 = update1.account.balance.get();

    amount0.assertGreaterThan(UInt64.zero, "Insufficient amount 0");
    amount1.assertGreaterThan(UInt64.zero, "Insufficient amount 1");

    _poolState.init = Bool(true);
    this.token0.set(_token0);
    this.token1.set(_token1);

    let senderPublicKey = this.sender.getAndRequireSignature();

    let liquidity = UInt64.zero;

    // use field for sqrt
    let field0 = new Field(amount0.value);
    let field1 = new Field(amount1.value);

    let liquidityField = field0.mul(field1).sqrt().sub(minimunLiquidity);
    liquidityField.assertGreaterThan(0, "Insufficient liquidity for minimun liquidity");
    liquidityField.assertLessThanOrEqual(UInt64.MAXINT().value, "Too much liquidity");

    liquidity = UInt64.Unsafe.fromField(liquidityField);
    liquidity.assertGreaterThan(UInt64.zero, "Insufficient liquidity");

    // mint minimun to address 0
    this.internal.mint({ address: PublicKey.empty(), amount: minimunLiquidity });
    _poolState.totalSupply.add(minimunLiquidity);

    // mint to user
    this.internal.mint({ address: senderPublicKey, amount: liquidity });
    _poolState.totalSupply.add(liquidity);

    _poolState.reserve0.add(amount0);
    _poolState.reserve1.add(amount1);

    this.poolState.set(_poolState);

    return liquidity;
  }

  /*
  @method.returns(UInt64)
  async mintLiquidity(_amount0: UInt64, _amount1: UInt64) {
    let _poolState = this.poolState.getAndRequireEquals();
    _poolState.init.assertTrue("Pool wasn't created");
    let address0 = this.token0.getAndRequireEquals();
    let address1 = this.token1.getAndRequireEquals();

    let senderPublicKey = this.sender.getUnconstrained();
    let senderUpdate = AccountUpdate.createSigned(senderPublicKey);
    // senderUpdate.send({ to: this, amount: _amount0 });
    let simpleToken0 = new SimpleToken(address0);
    simpleToken0.transfer(senderUpdate, this.address, _amount0);

    let simpleToken1 = new SimpleToken(address1);
    simpleToken1.transfer(senderUpdate, this.address, _amount1);

    let liquidity = _amount0.mul(_poolState.totalSupply).div(_poolState.reserve0)
    liquidity.assertGreaterThan(UInt64.zero, "Insufficient liquidity");

    // mint to user
    this.internal.mint({ address: senderPublicKey, amount: liquidity });

    _poolState.reserve0.add(_amount0);
    _poolState.reserve1.add(_amount1);
    _poolState.totalSupply.add(liquidity);

    this.poolState.set(_poolState);


    return liquidity;
  }*/


}
