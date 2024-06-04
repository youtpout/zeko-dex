import { AccountUpdate, Field, Mina, PrivateKey, PublicKey } from 'o1js';
import { Factory } from './Factory';
import { Pool, SimpleToken } from './Pool';


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

    zkToken0PrivateKey = PrivateKey.random();
    zkToken0Address = zkToken0PrivateKey.toPublicKey();
    zkToken0 = new SimpleToken(zkToken0Address);

    zkToken1PrivateKey = PrivateKey.random();
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

  it('get verification key', async () => {
    /* const pool = await Pool.compile();
     console.log((await pool).verificationKey);*/
  });


  // it('correctly updates the num state on the `Add` smart contract', async () => {
  //   await localDeploy();

  //   // update transaction
  //   const txn = await Mina.transaction(senderAccount, async () => {
  //     await zkApp.update();
  //   });
  //   await txn.prove();
  //   await txn.sign([senderKey]).send();

  //   const updatedNum = zkApp.num.get();
  //   expect(updatedNum).toEqual(Field(3));
  // });
});
