import { Field, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon } from 'o1js';
import { add } from 'o1js/dist/node/lib/provable/gadgets/native-curve';
import { Pool } from './Pool';


export class PoolState extends Struct({
    reserve0: UInt64,
    reserve1: UInt64,
    totalSupply: UInt64,
    init: Bool
}) {

}

// minimum liquidity permanently blocked in the pool
const minimunLiquidity = 10 ** 3;
const poolCompile = await Pool.compile();

export class SimpleToken extends TokenContract {
    init() {
        super.init();
    }

    @method async approveBase(forest: AccountUpdateForest) {
        this.checkZeroBalanceChange(forest);
    }
}

/**
 * Pool contract who holds token
 */
export class Factory extends SmartContract {
    @state(PublicKey) token0 = State<PublicKey>();
    @state(PublicKey) token1 = State<PublicKey>();
    @state(PoolState) poolState = State<PoolState>();
    @state(Field) kLast = State<Field>();

    init() {
        super.init();
    }

    @method.returns(UInt64)
    async createPool(_token0: PublicKey, _token1: PublicKey, _amount0: UInt64, _amount1: UInt64) {
        let hashPool = Poseidon.hash(_token0.toFields().concat(_token1.toFields()));
        let poolAddress = PublicKey.fromFields(hashPool.toFields());

        let pool = new Pool(poolAddress);
        let poolState = pool.poolState.getAndRequireEquals();
        poolState.init.assertFalse("Pool already exist");

        const update = AccountUpdate.createSigned(poolAddress, this.tokenId);
        update.body.update.verificationKey = { isSome: Bool(true), value: poolCompile.verificationKey };

        let liquidity = pool.create(_token0, _token1, _amount0, _amount1);

        return liquidity;
    }

}
