import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion } from 'o1js';
import { Pool } from './Pool';

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    pool: PublicKey
}) {

}

const poolVerificationKey = Field(28599546663355909804373721435537234575013599741278396197454984214277086045001n);
const vk = "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";

/**
 * Factory who list pools
 */
export class Factory extends SmartContract {

    reducer = Reducer({ actionType: Pair });

    @state(Field) numberPool = State<Field>();

    init() {
        super.init();
    }

    @method.returns(PublicKey)
    async createPool(_newAccount: PublicKey, _token0: PublicKey, _token1: PublicKey) {
        _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");

        // create a pool as this new address
        const update = AccountUpdate.createSigned(_newAccount, this.tokenId);

        let initial = Bool(false);
        let stateType = Bool;

        // example actions data
        let actions: MerkleList<MerkleList<Pair>> = this.reducer.getActions();

        let result = this.reducer.reduce(
            actions,
            stateType,
            (state: Bool, action: Pair) => state.or(action.token0.equals(_token0).and(action.token1.equals(_token1))),
            initial
        );

        result.assertFalse("Pool already created");

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

        let newPair = new Pair({ token0: _token0, token1: _token1, pool: update.publicKey });
        this.reducer.dispatch(newPair);

        return update.publicKey;
    }

}
