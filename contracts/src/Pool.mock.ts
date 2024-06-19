import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer } from 'o1js';
import { Prover } from 'o1js/dist/node/lib/proof-system/zkprogram';
import { add } from 'o1js/dist/node/lib/provable/gadgets/native-curve';
import { Pool, PoolState } from './Pool';


/**
 * Pool contract who holds token
 */
export class PoolMock extends Pool {
  @state(PublicKey) token0 = State<PublicKey>();
  @state(PublicKey) token1 = State<PublicKey>();
  @state(PoolState) poolState = State<PoolState>();
  @state(Field) kLast = State<Field>();


  init() {
    super.init();
    // create account for the first liquidity iwner
    this.internal.mint({ address: PublicKey.empty(), amount: 0 });
  }

  @method async create(_token0: PublicKey, _token1: PublicKey) {
    _token0.x.assertLessThan(_token1.x, "token 0 need to be lower than token1");
    let _poolState = this.poolState.getAndRequireEquals();
    _poolState.init.assertFalse("Pool already inited");
    this.token0.set(_token0);
    this.token1.set(_token1);

  }

  // precreate account to limit number of account update
  @method async createAccount() {
    let senderPublicKey = this.sender.getAndRequireSignature();
    // create account for the first liquidity iwner
    this.internal.mint({ address: senderPublicKey, amount: 0 });
  }


  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }


}
