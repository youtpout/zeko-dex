import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion, Experimental } from 'o1js';
import { Pool } from './Pool';
import { SimpleToken } from './SimpleToken';


const { OffchainState, OffchainStateCommitments } = Experimental;

const poolVerificationKey = Field(26618645536336213325431774059351923049674013586182583967347193072091618779579n);
const vk = "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";

export const MINIMUN_LIQUIDITY = 10 ** 3;

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey
}) {
    hash(): Field {
        return Poseidon.hash(this.token0.toFields().concat(this.token1.toFields()));
    }

    toFields(): Field[] {
        return this.token0.toFields().concat(this.token1.toFields());
    }
}

export class PoolState extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    reserve0: UInt64,
    reserve1: UInt64,
    totalSupply: UInt64,
    init: Bool,
    kLast: Field,
    liquidityManager: PublicKey
}) {

    static empty(): PoolState {
        return new PoolState({ token0: PublicKey.empty(), token1: PublicKey.empty(), reserve0: UInt64.zero, reserve1: UInt64.zero, totalSupply: UInt64.zero, init: Bool(false), kLast: Field(0), liquidityManager: PublicKey.empty() });
    }

    hashPair(): Field {
        return Poseidon.hash(this.token0.toFields().concat(this.token1.toFields()));
    }

    toJson(): string {
        return JSON.stringify({
            token0: this.token0.toJSON(),
            token1: this.token1.toJSON(),
            reserve0: this.reserve0.toJSON(),
            reserve1: this.reserve1.toJSON(),
            totalSupply: this.totalSupply.toJSON(),
            init: this.init.toJSON(),
            kLast: this.kLast.toJSON(),
            liquidityManager: this.liquidityManager.toJSON()
        });
    }
}

export const hashPairFunction = (_token0: PublicKey, _token1: PublicKey) => {
    return Poseidon.hash(_token0.toFields().concat(_token1.toFields()));
};

export const hashLiqudityFunction = (_token0: PublicKey, _token1: PublicKey, _owner: PublicKey) => {
    return Poseidon.hash(_token0.toFields().concat(_token1.toFields()).concat(_owner.toFields()));
};

export const orderToken = (_tokenIn: PublicKey, _tokenOut: PublicKey) => {
    return Provable.if(_tokenIn.x.lessThan(_tokenOut.x), new Pair({ token0: _tokenIn, token1: _tokenOut }), new Pair({ token0: _tokenIn, token1: _tokenOut }));
};


export const offchainState = OffchainState(
    {
        numberPool: OffchainState.Field(UInt64),
        poolsState: OffchainState.Map(Field, PoolState),
        liquidities: OffchainState.Map(Field, UInt64)
    }
);

class StateProof extends offchainState.Proof { }

/**
 * Factory who list pools
 */
export class PoolManager extends TokenContract {

    @state(OffchainStateCommitments) offchainState = State(
        OffchainStateCommitments.empty()
    );

    init() {
        super.init();
        this.account.permissions.set({
            ...Permissions.default(),
            editState: Permissions.proofOrSignature(),
            editActionState: Permissions.proofOrSignature(),
            send: Permissions.proofOrSignature(),
            incrementNonce: Permissions.proofOrSignature(),

        });
    }

    @method
    async settle(proof: StateProof) {
        await offchainState.settle(proof);
    }

    @method async approveBase(forest: AccountUpdateForest) {
        this.checkZeroBalanceChange(forest);
    }


    @method.returns(Field)
    async createPool(_newAccount: PublicKey, _token0: PublicKey, _token1: PublicKey) {
        _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");

        const hashPair = await hashPairFunction(_token0, _token1);

        let poolState = await offchainState.fields.poolsState.get(hashPair);
        let poolStateValue = poolState.orElse(PoolState.empty());
        poolStateValue.hashPair().assertNotEquals(hashPair, "This pair already exist");

        poolStateValue.token0 = _token0;
        poolStateValue.token1 = _token1;

        offchainState.fields.poolsState.update(hashPair, {
            from: undefined,
            to: poolStateValue
        });

        let numberPool = await offchainState.fields.numberPool.get();
        let numberPoolValue = numberPool.orElse(0n);
        offchainState.fields.numberPool.update({
            from: numberPool,
            to: numberPoolValue.add(1)
        });

        return hashPair;
    }

    @method.returns(UInt64)
    async supplyLiquidity(_token0: PublicKey, _token1: PublicKey, _amount0: UInt64, _amount1: UInt64) {
        _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");
        const hashPair = hashPairFunction(_token0, _token1);

        let poolState = await offchainState.fields.poolsState.get(hashPair);
        let poolStateValue = poolState.orElse(PoolState.empty());
        poolStateValue.hashPair().assertEquals(hashPair, "Pair not created");

        let senderPublicKey = this.sender.getUnconstrained();
        let simpleToken0 = new SimpleToken(_token0);
        let simpleToken1 = new SimpleToken(_token1);
        _amount0.assertGreaterThan(UInt64.zero, "Insufficient amount 0");
        _amount1.assertGreaterThan(UInt64.zero, "Insufficient amount 1");

        await simpleToken0.transfer(senderPublicKey, this.address, _amount0);
        await simpleToken1.transfer(senderPublicKey, this.address, _amount1);

        let liquidity = UInt64.zero;

        // use field for sqrt
        let field0 = new Field(_amount0.value);
        let field1 = new Field(_amount1.value);

        let liquidityField = field0.mul(field1).sqrt().sub(MINIMUN_LIQUIDITY);
        liquidityField.assertGreaterThan(0, "Insufficient liquidity for minimun liquidity");
        liquidityField.assertLessThanOrEqual(UInt64.MAXINT().value, " Supply too much liquidities");
        liquidity = UInt64.Unsafe.fromField(liquidityField);
        liquidity.assertGreaterThan(UInt64.zero, "Insufficient liquidity");

        // attribute minimun to address 0    
        let addressZero = Poseidon.hash(_token0.toFields().concat(_token1.toFields()).concat(PublicKey.empty().toFields()));
        offchainState.fields.liquidities.update(addressZero, {
            from: undefined,
            to: new UInt64(MINIMUN_LIQUIDITY)
        });

        // attribute rest to user
        let addressUser = hashLiqudityFunction(_token0, _token1, senderPublicKey);
        offchainState.fields.liquidities.update(addressUser, {
            from: undefined,
            to: liquidity
        });

        poolStateValue.totalSupply = UInt64.from(MINIMUN_LIQUIDITY).add(liquidity);

        poolStateValue.init = Bool(true);
        poolStateValue.reserve0 = _amount0;
        poolStateValue.reserve1 = _amount1;

        offchainState.fields.poolsState.update(hashPair, {
            from: poolState,
            to: poolStateValue
        });

        return liquidity;
    }

    @method.returns(UInt64)
    async swapExactIn(_tokenIn: PublicKey, _tokenOut: PublicKey, _amountIn: UInt64, _amountOutMin: UInt64) {
        _amountIn.assertGreaterThan(UInt64.zero, "Insufficient amount in");

        // todo safety verification
        let pair = orderToken(_tokenIn, _tokenOut);
        let hashPair = pair.hash();

        let poolState = await offchainState.fields.poolsState.get(hashPair);
        let poolStateValue = poolState.orElse(PoolState.empty());
        poolStateValue.hashPair().assertEquals(hashPair, "Pair not created");
        poolStateValue.init.assertEquals(Bool(true), "This pair is not inited");

        let reserveIn = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve0, poolStateValue.reserve1);
        let reserveOut = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve1, poolStateValue.reserve0);

        reserveIn.assertGreaterThan(_amountIn, "Insufficient reserve in");
        reserveOut.assertGreaterThan(_amountOutMin, "Insufficient reserve out");


        // 0.5 % tax, use value to convert Uint64 to field to prevent from uint64 overflow
        let amountInWithFee = _amountIn.value.mul(995);
        let numerator = amountInWithFee.mul(reserveOut.value);
        let denominator = reserveIn.value.mul(1000).add(amountInWithFee);

        let amountOutField = Field(0);
        Provable.asProver(() => {
            let amountBigInt = Field.toValue(numerator) / Field.toValue(denominator);
            amountOutField = Field(amountBigInt);
        });
        amountOutField.assertLessThanOrEqual(UInt64.MAXINT().value, "Amount out too big");

        // check if the operation is correct  num - 1 <= numCalc <= num + 1
        amountOutField.add(1).mul(denominator).assertGreaterThanOrEqual(numerator, "Incorrect operation result");
        amountOutField.sub(1).mul(denominator).assertLessThanOrEqual(numerator, "Incorrect operation result");

        let amountOut = UInt64.Unsafe.fromField(amountOutField);
        amountOut.assertGreaterThanOrEqual(_amountOutMin, "Insufficient amout out");

        let senderPublicKey = this.sender.getUnconstrained();
        let simpleTokenIn = new SimpleToken(_tokenIn);
        let simpleTokenOut = new SimpleToken(_tokenOut);
        let tranferOut = new SimpleToken(this.address, simpleTokenOut.deriveTokenId());
        //let tranferOut2 = new SimpleToken(senderPublicKey, simpleTokenOut.deriveTokenId());

        // transfer from user to pool
        await simpleTokenIn.transfer(senderPublicKey, this.address, _amountIn);
        // transfer from pool to user
        // await simpleTokenOut.transfer(this.self, senderPublicKey, amountOut);
        let acc = new SimpleToken(this.address, simpleTokenOut.deriveTokenId());
        //await simpleTokenOut.approve(acc);
        await tranferOut.balance.subInPlace(amountOut);
        await simpleTokenOut.approve(acc.self);
        await acc.balance.addInPlace(amountOut);
        await simpleTokenOut.transfer(tranferOut.self, acc.self, amountOut);
        // await tranferOut.send({ to: senderPublicKey, amount: amountOut });
        //await tranferOut2.balance.addInPlace(amountOut);

        // update reserve
        poolStateValue.reserve0 = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve0.add(_amountIn), poolStateValue.reserve0.sub(amountOut));
        poolStateValue.reserve1 = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve1.sub(amountOut), poolStateValue.reserve1.add(_amountIn));

        offchainState.fields.poolsState.update(hashPair, {
            from: poolState,
            to: poolStateValue
        });

        return amountOut;
    }

    @method.returns(PoolState)
    async getPoolState(token0: PublicKey, token1: PublicKey) {
        const hashPair = hashPairFunction(token0, token1);
        return (await offchainState.fields.poolsState.get(hashPair)).orElse(PoolState.empty());
    }

}
