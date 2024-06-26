import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option } from 'o1js';


const { OffchainState, OffchainStateCommitments } = Experimental;

export class PoolState extends Struct({
  reserve0: UInt64,
  reserve1: UInt64,
  totalSupply: UInt64,
  init: Bool
}) {

}

export class Liquidity extends Struct({
  owner: PublicKey,
  amount: UInt64,
  minted: Bool
}) {

}

export const offchainState = OffchainState(
  {
    liquidities: OffchainState.Map(PublicKey, UInt64),
    kLast: OffchainState.Field(Field),
    token0: OffchainState.Field(PublicKey),
    token1: OffchainState.Field(PublicKey),
    poolState: OffchainState.Field(PoolState)
  }
);

class StateProof extends offchainState.Proof { }

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
export class PoolTry extends TokenContract {
  @state(OffchainStateCommitments) offchainState = State(
    OffchainStateCommitments.empty()
  );

  @state(PublicKey) token0 = State<PublicKey>();
  @state(PublicKey) token1 = State<PublicKey>();
  @state(PoolState) poolState = State<PoolState>();

  init() {
    super.init();
  }

  @method
  async settle(proof: StateProof) {
    await offchainState.settle(proof);
  }


  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }


  @method.returns(UInt64)
  async createFirstDeposit(_amount0: UInt64, _amount1: UInt64) {
    let token0 = await offchainState.fields.token0.get();
    let token1 = await offchainState.fields.token1.get();
    let poolState = await offchainState.fields.poolState.get();
    let _token0 = token0.value;
    let _token1 = token1.value;

    _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");

    let _poolState = poolState.value;
    _poolState.init.assertFalse("Pool already inited");

    let senderPublicKey = this.sender.getUnconstrained();

    let simpleToken0 = new SimpleToken(_token0);
    let simpleToken1 = new SimpleToken(_token1);

    await simpleToken0.transfer(senderPublicKey, this.address, _amount0);
    await simpleToken1.transfer(senderPublicKey, this.address, _amount1);

    _amount0.assertGreaterThan(UInt64.zero, "Insufficient amount 0");
    _amount1.assertGreaterThan(UInt64.zero, "Insufficient amount 1");

    let liquidity = UInt64.zero;

    // use field for sqrt
    let field0 = new Field(_amount0.value);
    let field1 = new Field(_amount1.value);

    let liquidityField = field0.mul(field1).sqrt().sub(minimunLiquidity);
    liquidityField.assertGreaterThan(0, "Insufficient liquidity for minimun liquidity");
    liquidityField.assertLessThanOrEqual(UInt64.MAXINT().value, " Supply too much liquidities");
    liquidity = UInt64.Unsafe.fromField(liquidityField);
    liquidity.assertGreaterThan(UInt64.zero, "Insufficient liquidity");

    // attribute minimun to address 0    
    offchainState.fields.liquidities.update(PublicKey.empty(), {
      from: undefined,
      to: new UInt64(minimunLiquidity),
    });
    _poolState.totalSupply.add(minimunLiquidity);


    // attribute rest to user
    offchainState.fields.liquidities.update(senderPublicKey, {
      from: undefined,
      to: liquidity,
    });
    _poolState.totalSupply.add(liquidity);

    _poolState.init = Bool(true);
    _poolState.reserve0.add(_amount0);
    _poolState.reserve1.add(_amount1);

    offchainState.fields.poolState.update({
      from: undefined,
      to: _poolState
    });

    return liquidity;
  }


  @method
  async mintLiquidity() {

    let senderAccount = this.sender.getAndRequireSignature();

    let userLiquidity = await offchainState.fields.liquidities.get(senderAccount);

    let tokenToMint = userLiquidity.orElse(0n);
    tokenToMint.assertGreaterThan(UInt64.zero, "Nothing to mint");

    // mint liquidity amount to user account
    this.internal.mint({ address: senderAccount, amount: tokenToMint });

    offchainState.fields.liquidities.update(PublicKey.empty(), {
      from: userLiquidity,
      to: UInt64.zero,
    });
  }

}
