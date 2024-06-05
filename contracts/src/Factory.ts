import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion } from 'o1js';
import { Pool } from './Pool';

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    pool: PublicKey
}) {

}

const poolVerificationKey = Field(4476838408891924137379222136012132370693159892959050257785308099148346410591n);
const vk: string = "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";

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


        // update.body.update.appState = [
        //     { isSome: Bool(true), value: _token0.x },
        //     { isSome: Bool(true), value: _token0.x.isOdd().toField() },
        //     { isSome: Bool(true), value: _token1.x },
        //     { isSome: Bool(true), value: _token1.x.isOdd().toField() },
        //     { isSome: Bool(true), value: Field(0) },
        //     { isSome: Bool(true), value: Field(0) },
        //     { isSome: Bool(true), value: Field(0) },
        //     { isSome: Bool(true), value: Field(0) },
        // ];

        let newPair = new Pair({ token0: _token0, token1: _token1, pool: update.publicKey });
        this.reducer.dispatch(newPair);

        return update.publicKey;
    }

}
