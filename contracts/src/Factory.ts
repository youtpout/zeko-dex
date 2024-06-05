import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion } from 'o1js';
import { Pool } from './Pool';

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    pool: PublicKey
}) {

}

const poolVerificationKey = Field(15741874926307191066637755900537557830862568039590237802024571690267749239089n);
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
