import { AccountUpdate, Bool, Field, MerkleList, Mina, Poseidon, PrivateKey, PublicKey, Reducer, UInt64, fetchAccount } from 'o1js';
import { Pair, PoolList } from './PoolList';
import { Pool, SimpleToken, minimunLiquidity } from './Pool';


/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Pool list', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: PoolList,
    zkPoolAddress: PublicKey,
    zkPoolPrivateKey: PrivateKey,
    zkPool: Pool,
    zkToken0Address: PublicKey,
    zkToken0PrivateKey: PrivateKey,
    zkToken0: SimpleToken,
    zkToken1Address: PublicKey,
    zkToken1PrivateKey: PrivateKey,
    zkToken1: SimpleToken;

  beforeAll(async () => {
    if (proofsEnabled) await PoolList.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new PoolList(zkAppAddress);

    zkToken0PrivateKey = PrivateKey.random();
    zkToken0Address = zkToken0PrivateKey.toPublicKey();
    zkToken0 = new SimpleToken(zkToken0Address);

    zkToken1PrivateKey = PrivateKey.random();
    zkToken1Address = zkToken1PrivateKey.toPublicKey();
    zkToken1 = new SimpleToken(zkToken1Address);

    zkPoolPrivateKey = PrivateKey.random();
    zkPoolAddress = zkPoolPrivateKey.toPublicKey();
    zkPool = new Pool(zkPoolAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 4);
      await zkApp.deploy();
      await zkPool.deploy();
      await zkToken0.deploy();
      await zkToken1.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, zkToken0PrivateKey, zkToken1PrivateKey, zkPoolPrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
    const num = zkApp.numberPool.get();
    expect(num).toEqual(Field(0));
  });

  it('create a pool', async () => {

    await localDeploy();
    let amt = UInt64.from(10 * 10 ** 9);

    const newAccount = PrivateKey.random();
    let newAddress = PublicKey.empty();
    // register pool
    const txn00 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), zkToken0Address, zkToken1Address);
    });
    await txn00.prove();
    await txn00.sign([senderKey, newAccount]).send();

    let initial = Bool(false);
    let stateType = Bool;

    // example actions data
    let actions: MerkleList<MerkleList<Pair>> = zkApp.reducer.getActions();

    let result = zkApp.reducer.reduce(
      actions,
      stateType,
      (state: Bool, action: Pair) => state.or(action.token0.equals(zkToken0Address) && action.token1.equals(zkToken1Address)),
      initial
    );

    const pair = actions.data.get()[0].element.data.get()[0];
    console.log("actions", pair.element.token0.toBase58());
    console.log("actions", pair.element.pool.toBase58());
    console.log("newAddress", newAddress.toBase58());
    expect(result).toEqual(Bool(true));

    // the pool is located to new address
    zkPool = new Pool(newAddress);
    // the pool is not init
    const poolState0 = zkPool.poolState.get();
    expect(poolState0.init).toEqual(Bool(false));

    await mintToken();

    const balance = Mina.getBalance(senderAccount, zkToken0.deriveTokenId());
    console.log("balance user", balance.toString());

    const balanceMina = Mina.getBalance(senderAccount);
    console.log("balance mina user", balanceMina.toString());

    const txn0 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 2);
      await zkToken0.transfer(senderAccount, newAddress, amt);
      await zkToken1.transfer(senderAccount, newAddress, amt);
    });
    await txn0.prove();
    await txn0.sign([senderKey]).send();

    // create pool
    const txn = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      await zkPool.create(zkToken0Address, zkToken1Address);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const poolState = zkPool.poolState.get();
    expect(poolState.init).toEqual(Bool(true));

    const liquidityUser = Mina.getBalance(senderAccount, zkPool.deriveTokenId());
    const expected = amt.value.mul(amt.value).sqrt().sub(minimunLiquidity);
    console.log("balance liquidity user", liquidityUser.toString());
    expect(liquidityUser.value).toEqual(expected);

  });




  async function mintToken() {
    // update transaction
    const txn = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      await zkToken0.mintTo(senderAccount, UInt64.from(1000 * 10 ** 9));
    });
    await txn.prove();
    await txn.sign([senderKey, zkToken0PrivateKey]).send();

    const txn2 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      await zkToken1.mintTo(senderAccount, UInt64.from(1000 * 10 ** 9));
    });
    await txn2.prove();
    await txn2.sign([senderKey, zkToken1PrivateKey]).send();
  }

});
