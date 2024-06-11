import { Account, AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { Factory } from './Factory';
import { Pool, SimpleToken, offchainState } from './Pool';



describe('Pool', () => {

    beforeAll(async () => {
        const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
        Mina.setActiveInstance(Local);
        let [sender, receiver, contractAccount, other] = Local.testAccounts;

        const zkAppPrivateKey = PrivateKey.random();
        const zkAppAddress = zkAppPrivateKey.toPublicKey();

        const zkApp = new Pool(zkAppAddress);

        offchainState.setContractInstance(zkApp);

        console.time('compile token');
        const tokenKey = await SimpleToken.compile();
        console.timeEnd('compile token');
        console.time('compile offchainState');
        const offKey = await offchainState.compile();
        console.timeEnd('compile offchainState');
        console.time('compile pool');
        const key = await Pool.compile();
        console.timeEnd('compile pool');
        console.log("key pool", key.verificationKey.data);
        console.log("key pool hash", key.verificationKey.hash.toBigInt());


        const txn = await Mina.transaction(sender, async () => {
            AccountUpdate.fundNewAccount(sender, 1);
            await zkApp.deploy();
        });
        await txn.prove();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await txn.sign([sender.key, zkAppPrivateKey]).send();

    });

    it('compile', async () => {
        //
    });


});