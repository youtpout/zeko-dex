import { Account, AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { Factory } from './Factory';
import { Pool, SimpleToken, minimunLiquidity, offchainState } from './Pool';

let proofsEnabled = false;

describe('Pool', () => {
    let deployerAccount: Mina.TestPublicKey,
        deployerKey: PrivateKey,
        senderAccount: Mina.TestPublicKey,
        senderKey: PrivateKey,
        zkAppAddress: PublicKey,
        zkAppPrivateKey: PrivateKey,
        zkApp: Pool,
        zkToken0Address: PublicKey,
        zkToken0PrivateKey: PrivateKey,
        zkToken0: SimpleToken,
        zkToken1Address: PublicKey,
        zkToken1PrivateKey: PrivateKey,
        zkToken1: SimpleToken;

    beforeAll(async () => {
        const Local = await Mina.LocalBlockchain({ proofsEnabled });
        Mina.setActiveInstance(Local);
        [deployerAccount, senderAccount] = Local.testAccounts;
        deployerKey = deployerAccount.key;
        senderKey = senderAccount.key;

        zkAppPrivateKey = PrivateKey.random();
        zkAppAddress = zkAppPrivateKey.toPublicKey();
        zkApp = new Pool(zkAppAddress);

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

        offchainState.setContractInstance(zkApp);

        if (proofsEnabled) {
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
        }


        const txn = await Mina.transaction(deployerAccount, async () => {
            AccountUpdate.fundNewAccount(deployerAccount, 3);
            await zkApp.deploy();
            await zkToken0.deploy();
            await zkToken1.deploy();
        });
        await txn.prove();
        // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
        await txn.sign([deployerKey, zkAppPrivateKey, zkToken0PrivateKey, zkToken1PrivateKey]).send();

    });

    it('init', async () => {
        //
        await mintToken();


        const txn = await Mina.transaction(senderAccount, async () => {
            zkApp.initTokenTest(zkToken0Address, zkToken1Address);
        });
        await txn.prove();
        await txn.sign([senderKey]).send();

        let amt = UInt64.from(10 * 10 ** 9);
        const txn2 = await Mina.transaction(senderAccount, async () => {
            AccountUpdate.fundNewAccount(senderAccount, 2);
            await zkApp.createFirstDeposit(amt, amt);
        });
        await txn2.prove();
        await txn2.sign([senderKey]).send();

        let proof = await offchainState.createSettlementProof();
        const txnProof = await Mina.transaction(senderAccount, async () => {
            await zkApp.settle(proof);
        });
        await txnProof.prove();
        await txnProof.sign([senderKey]).send();

        const txn3 = await Mina.transaction(senderAccount, async () => {
            AccountUpdate.fundNewAccount(senderAccount, 1);
            await zkApp.mintLiquidity();
        });
        await txn3.prove();
        await txn3.sign([senderKey]).send();

        const liquidityUser = Mina.getBalance(senderAccount, zkApp.deriveTokenId());
        const expected = amt.value.mul(amt.value).sqrt().sub(minimunLiquidity);
        console.log("liquidity user", liquidityUser.toString());
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