import { Account, AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
import { Factory } from './Factory';
import { Pool, SimpleToken } from './Pool';



describe('Pool', () => {

    it('compile', async () => {
        const key = await Pool.compile();
        console.log("key pool", key.verificationKey.data);
        console.log("key pool hash", key.verificationKey.hash.toBigInt());
    });


});