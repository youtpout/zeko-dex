import { Field, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account } from 'o1js';
import { Pool } from './Pool';

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    pool: PublicKey
}) {

}

const poolVerificationKey = Field(32);

/**
 * Factory who list pools
 */
export class PoolList extends SmartContract {

    reducer = Reducer({ actionType: Pair });

    @state(Field) numberPool = State<Field>();

    init() {
        super.init();
    }

    @method
    async register(_token0: PublicKey, _token1: PublicKey) {
        // we will check sender vk and not the signature
        let sender = this.sender.getUnconstrained();

        const acc1 = AccountUpdate.create(sender);
        const hashVk = acc1.body.update.verificationKey.value.hash;
        hashVk.assertEquals(poolVerificationKey);

        let newPair = new Pair({ token0: _token0, token1: _token1, pool: sender });
        this.reducer.dispatch(newPair);
    }

    @method
    async registerTest(_pool: PublicKey, _token0: PublicKey, _token1: PublicKey) {

        const acc1 = AccountUpdate.create(_pool);
        const hashVk = acc1.body.update.verificationKey.value.hash;
        hashVk.assertEquals(poolVerificationKey);

        let newPair = new Pair({ token0: _token0, token1: _token1, pool: _pool });
        this.reducer.dispatch(newPair);
    }

}
