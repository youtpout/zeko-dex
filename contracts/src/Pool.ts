import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account } from 'o1js';

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


  // precreate account to limit number of account update
  @method async createAccount(user: PublicKey) {
    this.internal.mint({ address: user, amount: 1 });
  }


  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method
  async depositToken0(_amount: UInt64) {
    let _token0 = this.token0.getAndRequireEquals();
    let _token1 = this.token1.getAndRequireEquals();

    _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");


    let simpleToken0 = new SimpleToken(_token0);

    let senderPublicKey = this.sender.getUnconstrained();

    await simpleToken0.transfer(senderPublicKey, this.address, _amount);


  }

  @method
  async depositToken1(_amount: UInt64) {
    let _token0 = this.token0.getAndRequireEquals();
    let _token1 = this.token1.getAndRequireEquals();

    _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");

    let simpleToken0 = new SimpleToken(_token0);

    let senderPublicKey = this.sender.getUnconstrained();

    await simpleToken0.transfer(senderPublicKey, this.address, _amount);
  }

  @method.returns(UInt64)
  async createFirstDeposit() {
    let _token0 = this.token0.getAndRequireEquals();
    let _token1 = this.token1.getAndRequireEquals();

    _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");

    let _poolState = this.poolState.getAndRequireEquals();
    _poolState.init.assertFalse("Pool already inited");


    let simpleToken0 = new SimpleToken(_token0);
    let simpleToken1 = new SimpleToken(_token1);

    let account0 = new SimpleToken(this.address, simpleToken0.deriveTokenId());
    let account1 = new SimpleToken(this.address, simpleToken1.deriveTokenId());

    let _amount0 = account0.account.balance.getAndRequireEquals();
    let _amount1 = account1.account.balance.getAndRequireEquals();

    _amount0.assertGreaterThan(UInt64.zero, "Insufficient amount 0");
    _amount1.assertGreaterThan(UInt64.zero, "Insufficient amount 1");

    let senderPublicKey = this.sender.getUnconstrained();

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
    //this.internal.mint({ address: PublicKey.empty(), amount: minimunLiquidity });
    _poolState.totalSupply.add(minimunLiquidity);

    // attribute rest to user
    this.internal.mint({ address: senderPublicKey, amount: liquidity });
    _poolState.totalSupply.add(liquidity);

    _poolState.init = Bool(true);
    _poolState.reserve0.add(_amount0);
    _poolState.reserve1.add(_amount1);

    this.poolState.set(_poolState);

    return liquidity;
  }


  @method
  async mintLiquidity() {

    // let senderAccount = this.sender.getAndRequireSignature();

    // // type for the "accumulated output" of reduce -- the `stateType`
    // let stateType = UInt64;

    // // example actions data
    // let actions = this.reducer.getActions();

    // // state and actionState before applying actions
    // let initial = UInt64.zero;

    // let tokenToMint: UInt64 = this.reducer.reduce(
    //   actions,
    //   stateType,
    //   (state: UInt64, action: Liquidity) => Provable.if(action.minted.and(action.owner.equals(senderAccount)), state.sub(action.amount), state.add(action.amount)),
    //   initial
    // );

    // tokenToMint.assertGreaterThan(UInt64.zero, "Nothing to mint");

    // this.internal.mint({ address: senderAccount, amount: tokenToMint });

    // let liquidityUser = new Liquidity({ owner: senderAccount, amount: tokenToMint, minted: Bool(true) });
    // this.reducer.dispatch(liquidityUser);

  }

}
