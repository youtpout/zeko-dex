import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion, Experimental } from 'o1js';
import { Pool } from './Pool';


const { OffchainState, OffchainStateCommitments } = Experimental;

const poolVerificationKey = Field(26618645536336213325431774059351923049674013586182583967347193072091618779579n);
const vk = "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";

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    liquidityManager: PublicKey
}) {

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
}



export class Liquidity extends Struct({
    owner: PublicKey,
    amount: UInt64,
    minted: Bool
}) {

}


export const offchainState = OffchainState(
    {
        numberPool: OffchainState.Field(UInt64),
        poolsState: OffchainState.Map(Field, PoolState)
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

        const hashPair = await this.hashPair(_token0, _token1);

        let poolState = await offchainState.fields.poolsState.get(hashPair);
        let poolStateValue = poolState.orElse(PoolState.empty());
        poolStateValue.hashPair().assertNotEquals(hashPair, "This pair already exist");


        // create a pool as this new address
        const update = AccountUpdate.createSigned(_newAccount, this.deriveTokenId());

        update.body.update.verificationKey = { isSome: Bool(true), value: { data: vk, hash: poolVerificationKey } };
        update.body.update.permissions = {
            isSome: Bool(true),
            value: {
                ...Permissions.default(),
                setVerificationKey: {
                    auth: Permissions.impossible(),
                    txnVersion: TransactionVersion.current()
                },
                editState: Permissions.proof()
            },
        };

        let fields0 = _token0.toFields();
        let fields1 = _token1.toFields();

        update.body.update.appState = [
            { isSome: Bool(true), value: fields0[0] },
            { isSome: Bool(true), value: fields0[1] },
            { isSome: Bool(true), value: fields1[0] },
            { isSome: Bool(true), value: fields1[1] },
            { isSome: Bool(true), value: Field(0) },
            { isSome: Bool(true), value: Field(0) },
            { isSome: Bool(true), value: Field(0) },
            { isSome: Bool(true), value: Field(0) },
        ];



        return hashPair;
    }

    @method.returns(Field)
    async hashPair(token0: PublicKey, token1: PublicKey) {
        return Poseidon.hash(token0.toFields().concat(token1.toFields()));
    }

}
