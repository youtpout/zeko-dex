import { Field, SmartContract, state, Permissions, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Poseidon, VerificationKey, Reducer, Account, assert, fetchAccount, MerkleList, TransactionVersion } from 'o1js';
import { Pool } from './Pool';

export class Pair extends Struct({
    token0: PublicKey,
    token1: PublicKey,
    pool: PublicKey
}) {

}

const poolVerificationKey = Field(2285853966793120280738260962265042363232030062886923177340054122272562620474n);
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
