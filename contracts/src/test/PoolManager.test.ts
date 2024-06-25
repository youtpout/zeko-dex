import { AccountUpdate, Bool, Field, MerkleList, Mina, Poseidon, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { PoolManager, MINIMUN_LIQUIDITY, offchainState, hashPairFunction } from '../PoolManager';
import { SimpleToken } from '../SimpleToken';
import { DexTokenHolder } from '../DexTokenHolder';


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
    zkApp: PoolManager,
    zkToken0Address: PublicKey,
    zkToken0PrivateKey: PrivateKey,
    zkToken0: SimpleToken,
    zkToken1Address: PublicKey,
    zkToken1PrivateKey: PrivateKey,
    zkToken1: SimpleToken,
    dexTokenHolder1: DexTokenHolder;

  beforeAll(async () => {
    if (proofsEnabled) {
      await offchainState.compile();
      await SimpleToken.compile();
      await PoolManager.compile();
    }
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new PoolManager(zkAppAddress);

    let keyTokenX = PrivateKey.random();
    let keyTokenY = PrivateKey.random();

    offchainState.setContractInstance(zkApp);

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

    dexTokenHolder1 = new DexTokenHolder(zkAppAddress, zkToken1.deriveTokenId());
    const txn1 = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 1);
      await dexTokenHolder1.deploy();
      await zkToken1.approveAccountUpdate(dexTokenHolder1.self);
    });
    await txn1.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn1.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('generates and deploys the `PoolManager` smart contract', async () => {
    await localDeploy();
  });



  it('deploy a pool', async () => {
    await localDeploy();

    let amt = UInt64.from(10 * 10 ** 9);
    let newAddress = await createPool(zkToken0Address, zkToken1Address);
    let hashPair = await hashPairFunction(zkToken0Address, zkToken1Address);

    expect(newAddress).toEqual(hashPair);

    let proof = await offchainState.createSettlementProof();
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.settle(proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    await mintToken();

    let liquidity = UInt64.zero;
    const txn2 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      liquidity = await zkApp.supplyLiquidity(zkToken0Address, zkToken1Address, amt, amt);
    });
    await txn2.prove();
    await txn2.sign([senderKey]).send();

    const expected = amt.value.mul(amt.value).sqrt().sub(MINIMUN_LIQUIDITY);
    expect(liquidity.value).toEqual(expected);

    //await offchainStateProve();

    // swap token
    const txn5 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      await zkToken0.mintTo(deployerAccount, UInt64.from(1000 * 10 ** 9));
    });
    await txn5.prove();
    await txn5.sign([senderKey, zkToken0PrivateKey]).send();

    let amtIn = UInt64.from(5 * 10 ** 9);
    let amtOutMin = UInt64.from(1 * 10 ** 9);

    // deposit before swap
    const txn51 = await Mina.transaction(deployerAccount, async () => {
      await zkApp.depositToken(zkToken0Address, amtIn);
    });
    console.log(txn51.toPretty());
    await txn51.prove();
    await txn51.sign([deployerKey]).send();

    await offchainStateProve();

    const deposit = await zkApp.getDeposit(deployerAccount, zkToken0Address);
    console.log("deposit amount", deposit.toString());

    const balanceApp = Mina.getBalance(zkAppAddress, zkToken1.deriveTokenId());
    console.log("balance 1", balanceApp.toString());

    const poolState = await zkApp.getPoolState(zkToken0Address, zkToken1Address);
    console.log('pool state', poolState.toJson());

    const txn6 = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount, 1);
      const amount = await zkApp.swapExactIn(zkToken0Address, zkToken1Address, amtIn, amtOutMin);
    });
    console.log(txn6.toPretty());
    await txn6.prove();
    await txn6.sign([deployerKey]).send();

    const balanceToken1 = Mina.getBalance(deployerAccount, zkToken1.deriveTokenId());
    console.log("balance 1", balanceToken1.toString());
    expect(balanceToken1.greaterThanOrEqual(amtOutMin)).toEqual(Bool(true));


    let amountOut = UInt64.zero;
    // too much account update
    const txn7 = await Mina.transaction(deployerAccount, async () => {
      amountOut = await zkApp.swapExactTransferIn(zkToken0Address, zkToken1Address, amtIn, amtOutMin);
    });
    console.log("user", deployerAccount.toBase58());
    console.log(txn7.toPretty());
    await txn7.prove();
    await txn7.sign([deployerKey]).send();
    expect(amountOut.greaterThanOrEqual(amtOutMin)).toEqual(Bool(true));

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

  async function offchainStateProve() {
    let proof = await offchainState.createSettlementProof();
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.settle(proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

  }

  async function createPool(token0: PublicKey, token1: PublicKey): Promise<Field> {

    const newAccount = PrivateKey.random();
    let newAddress = Field(0);
    // register pool
    const txn0 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 1);
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), token0, token1);
    });
    await txn0.prove();
    await txn0.sign([senderKey, newAccount]).send();

    return newAddress;
  }

});
