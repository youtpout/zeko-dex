import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option, Int64 } from 'o1js';
import { PoolManager, SimpleToken } from './index.js';
import { orderToken } from './PoolManager.js';

export class DexTokenHolder extends SmartContract {

    static poolManagerAddress: PublicKey;

    // this works for both directions (in our case where both tokens use the same contract)
    @method.returns(UInt64)
    async swap(
        user: PublicKey,
        _tokenIn: PublicKey,
        _tokenOut: PublicKey,
        _amountIn: UInt64,
        _amountOutMin: UInt64
    ) {
        let pm = new PoolManager(DexTokenHolder.poolManagerAddress);
        let poolStateValue = await pm.getPoolState(_tokenIn, _tokenOut);

        let pair = orderToken(_tokenIn, _tokenOut);

        // let simpleTokenIn = new SimpleToken(_tokenIn);
        // transfer from user to pool
        // await simpleTokenIn.transfer(user, DexTokenHolder.poolManagerAddress, _amountIn);

        let reserveIn = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve0, poolStateValue.reserve1);
        let reserveOut = Provable.if(pair.token0.equals(_tokenIn), poolStateValue.reserve1, poolStateValue.reserve0);

        reserveIn.assertGreaterThan(_amountIn, "Insufficient reserve in");
        reserveOut.assertGreaterThan(_amountOutMin, "Insufficient reserve out");

        // 0.5 % tax, use value to convert Uint64 to field to prevent from uint64 overflow
        let amountInWithFee = _amountIn.value.mul(995);
        let numerator = amountInWithFee.mul(reserveOut.value);
        let denominator = reserveIn.value.mul(1000).add(amountInWithFee);

        let amountOutField = Provable.witness(Field, () => {
            let amountBigInt = Field.toValue(numerator) / Field.toValue(denominator);
            return Field(amountBigInt);
        });
        amountOutField.assertLessThanOrEqual(UInt64.MAXINT().value, "Amount out too big");

        // check if the operation is correct  num - 1 <= numCalc <= num + 1
        amountOutField.add(1).mul(denominator).assertGreaterThanOrEqual(numerator, "Incorrect operation result");
        amountOutField.sub(1).mul(denominator).assertLessThanOrEqual(numerator, "Incorrect operation result");

        let amountOut = UInt64.Unsafe.fromField(amountOutField);
        amountOut.assertGreaterThanOrEqual(_amountOutMin, "Insufficient amout out");

        // send token to the user
        let receiverAU = this.send({ to: user, amount: amountOut });
        receiverAU.body.mayUseToken = AccountUpdate.MayUseToken.InheritFromParent;

        return amountOut;
    }
}