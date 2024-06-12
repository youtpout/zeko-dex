import { AccountUpdate, Bool, Field, MerkleList, Mina, Poseidon, PrivateKey, PublicKey, UInt64, fetchAccount } from 'o1js';
import { PoolManager, MINIMUN_LIQUIDITY, offchainState } from './PoolManager';
import { SimpleToken } from './SimpleToken';


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
    zkToken1: SimpleToken;

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
  }

  it('generates and deploys the `PoolManager` smart contract', async () => {
    await localDeploy();
    // const num = await offchainState.fields.numberPool.get();
    // const numValue = num.orElse(0n);
    //expect(numValue).toEqual(UInt64.zero);
  });



  it('deploy a pool', async () => {
    await localDeploy();

    let amt = UInt64.from(10 * 10 ** 9);
    let newAddress = await createPool(zkToken0Address, zkToken1Address);
    let hashPair = await zkApp.hashPair(zkToken0Address, zkToken1Address);

    expect(newAddress).toEqual(hashPair);

    let proof = await offchainState.createSettlementProof();
    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.settle(proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const txn2 = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount, 4);
      await zkApp.supplyLiquidity(zkToken0Address, zkToken1Address, amt, amt);
    });
    console.log(txn2.toPretty());
    await txn2.prove();
    await txn2.sign([senderKey]).send();
  });

  /*
    it('deposit liquidity', async () => {
      await localDeploy();
      let amt = UInt64.from(10 * 10 ** 9);
      let newAddress = await createPool(zkToken0Address, zkToken1Address);
  
      // the pool is located to new address
      const zkPool = new Pool(newAddress);
      offchainState.setContractInstance(zkPool);
  
      await mintToken();
  
      const txn2 = await Mina.transaction(senderAccount, async () => {
        AccountUpdate.fundNewAccount(senderAccount, 2);
        await zkPool.createFirstDeposit(amt, amt);
      });
      await txn2.prove();
      await txn2.sign([senderKey]).send();
  
      let proof = await offchainState.createSettlementProof();
      const txn = await Mina.transaction(senderAccount, async () => {
        await zkPool.settle(proof);
      });
      await txn.prove();
      await txn.sign([senderKey]).send();
  
      const txn3 = await Mina.transaction(senderAccount, async () => {
        AccountUpdate.fundNewAccount(senderAccount, 1);
        await zkPool.mintLiquidity();
      });
      await txn3.prove();
      await txn3.sign([senderKey]).send();
  
      // const offchainstate = await offchainState.fields.poolState.get();
      // const poolState = offchainstate.value;
      // expect(poolState.init).toEqual(Bool(true));
  
      const liquidityUser = Mina.getBalance(senderAccount, zkPool.deriveTokenId());
      const expected = amt.value.mul(amt.value).sqrt().sub(minimunLiquidity);
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
  */

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

  async function createPool(token0: PublicKey, token1: PublicKey): Promise<Field> {

    const newAccount = PrivateKey.random();
    let newAddress = Field(0);
    // register pool
    const txn0 = await Mina.transaction(senderAccount, async () => {
      newAddress = await zkApp.createPool(newAccount.toPublicKey(), token0, token1);
    });
    await txn0.prove();
    await txn0.sign([senderKey, newAccount]).send();

    return newAddress;
  }

});
