import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option, Int64 } from 'o1js';
import { SimpleToken } from './index.js';

export class DexTokenHolder extends SmartContract {

    // this works for both directions (in our case where both tokens use the same contract)
    @method.returns(UInt64)
    async swap(
        contract: PublicKey,
        user: PublicKey,
        tokenIn: PublicKey,
        amountIn: UInt64,
        amount: UInt64
    ) {
        let simpleTokenIn = new SimpleToken(tokenIn);
        await simpleTokenIn.transfer(user, contract, amountIn);
        // compute and send dy
        let dy = amount;
        // just subtract dy balance and let adding balance be handled one level higher
        this.balance.subInPlace(dy);


        return dy;
    }
}