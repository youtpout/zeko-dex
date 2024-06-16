import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option } from 'o1js';
import { PoolManager } from './PoolManager';


class UInt64x2 extends Struct([UInt64, UInt64]) { }

export class SimpleToken extends TokenContract {
  init() {
    super.init();

    // permission to be sent from zkapp
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proof(),
      send: Permissions.proofOrSignature(),
    });
  }

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async mintTo(to: PublicKey, amount: UInt64) {
    this.internal.mint({ address: to, amount });
  }
}

export class DexTokenHolder extends SmartContract {

  // this works for both directions (in our case where both tokens use the same contract)
  @method.returns(UInt64)
  async swap(
    amount: UInt64
  ) {
    // compute and send dy
    let dy = amount;
    // just subtract dy balance and let adding balance be handled one level higher
    this.balance.subInPlace(dy);
    return dy;
  }
}