import { AccountUpdate, Bool, Field, MerkleList, Mina, Poseidon, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { Factory, Pair } from './Factory';
import { Pool, SimpleToken, minimunLiquidity } from './Pool';
import { add } from 'o1js/dist/node/lib/provable/gadgets/native-curve';


/*
 * This file specifies how to test the `Add` example smart contract. It is safe to delete this file and replace
 * with your own tests.
 *
 * See https://docs.minaprotocol.com/zkapps for more info.
 */

let proofsEnabled = false;

describe('Add', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Factory,
    zkToken0Address: PublicKey,
    zkToken0PrivateKey: PrivateKey,
    zkToken0: SimpleToken,
    zkToken1Address: PublicKey,
    zkToken1PrivateKey: PrivateKey,
    zkToken1: SimpleToken;

  beforeAll(async () => {
    if (proofsEnabled) await Factory.compile();
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Factory(zkAppAddress);

    let keyTokenX = PrivateKey.random();
    let keyTokenY = PrivateKey.random();

    // order token to create pool
    let xIsLower = keyTokenX.toPublicKey().x.lessThan(keyTokenY.toPublicKey().x);

    zkToken0PrivateKey = xIsLower.toBoolean() ? keyTokenX : keyTokenY;
    zkToken0Address = zkToken0PrivateKey.toPublicKey();
    zkToken0 = new SimpleToken(zkToken0Address);

    zkToken1PrivateKey = xIsLower.toBoolean() ? keyTokenY : keyTokenX;
    zkToken1Address = zkToken1PrivateKey.toPublicKey();
    zkToken1 = new SimpleToken(zkToken1Address);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 3);
      await zkApp.deploy();
      await zkToken0.deploy();
      await zkToken1.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey, zkToken0PrivateKey, zkToken1PrivateKey]).send();
  }

  it('generates and deploys the `Add` smart contract', async () => {
    await localDeploy();
    const num = zkApp.numberPool.get();
    expect(num).toEqual(Field(0));
  });



  it('deploy a pool', async () => {
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
      (state: Bool, action: Pair) => state.or(action.token0.equals(zkToken0Address).and(action.token1.equals(zkToken1Address))),
      initial
    );

    // const pair = actions.data.get()[0].element.data.get()[0];
    // console.log("actions", pair.element.token0.toBase58());
    // console.log("actions", pair.element.pool.toBase58());
    // console.log("newAddress", newAddress.toBase58());
    expect(result).toEqual(Bool(true));

    // the pool is located to new address
    const zkPool = new Pool(newAddress);
    // the pool is not init
    const poolState0 = zkPool.poolState.get();
    expect(poolState0.init).toEqual(Bool(false));

    const poolToken0 = zkPool.token0.get();
    const poolToken1 = zkPool.token1.get();

    expect(poolToken0).toEqual(zkToken0Address);
    expect(poolToken1).toEqual(zkToken1Address);

    await mintToken();

    const balance = Mina.getBalance(senderAccount, zkToken0.deriveTokenId());
    //console.log("balance user", balance.toString());

    const balanceMina = Mina.getBalance(senderAccount);
    //console.log("balance mina user", balanceMina.toString());

    //await approveTransfer(zkPool.self);

    const txn0 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 2);
      await zkPool.createFirstDeposit(amt, amt);
    });
    await txn0.prove();
    await txn0.sign([senderKey]).send();

    const token0Pool = Mina.getBalance(zkPool.address, zkToken0.deriveTokenId());
    const token1Pool = Mina.getBalance(zkPool.address, zkToken1.deriveTokenId());

    console.log("token 0 pool", token0Pool.toString());
    console.log("token 1 pool", token1Pool.toString());

    // mint liqudity
    const txn = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      await zkPool.mintLiquidity();
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const poolState = zkPool.poolState.get();
    expect(poolState.init).toEqual(Bool(true));

    const liquidityUser = Mina.getBalance(senderAccount, zkPool.deriveTokenId());
    const expected = amt.value.mul(amt.value).sqrt().sub(minimunLiquidity);
    //console.log("balance liquidity user", liquidityUser.toString());
    expect(liquidityUser.value).toEqual(expected);

  });

  it('deploy twice', async () => {

    await localDeploy();

    const newAccount = PrivateKey.random();
    let newAddress = PublicKey.empty();

    const newAccount2 = PrivateKey.random();
    let newAddress2 = PublicKey.empty();

    // register pool
    const txn00 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), zkToken0Address, zkToken1Address);
    });
    await txn00.prove();
    await txn00.sign([senderKey, newAccount]).send();


    await expect(Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      newAddress = await zkApp.createPool(newAccount2.toPublicKey(), zkToken0Address, zkToken1Address);
    })).rejects.toThrow("Pool already created");


  });

  it('deploy with same account', async () => {

    await localDeploy();

    const newAccount = PrivateKey.random();
    let newAddress = PublicKey.empty();

    // register pool
    const txn00 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), zkToken0Address, zkToken1Address);
    });
    await txn00.prove();
    await txn00.sign([senderKey, newAccount]).send();


    const txn1 = await Mina.transaction(senderAccount, async () => {
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), PublicKey.empty(), zkToken1Address);
    });
    await txn1.prove();
    await expect(txn1.sign([senderKey, newAccount]).send()).rejects.toThrow();


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


  async function approveTransfer(account: AccountUpdate) {
    // approve transfer
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkToken0.approveAccountUpdate(account);
      await zkToken1.approveAccountUpdate(account);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  }

});
