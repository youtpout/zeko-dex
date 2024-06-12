import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option } from 'o1js';



export class SimpleToken extends TokenContract {
  init() {
    super.init();

    // make account non-upgradable forever
    this.account.permissions.set({
      ...Permissions.default(),
      setVerificationKey:
        Permissions.VerificationKey.impossibleDuringCurrentVersion(),
      setPermissions: Permissions.impossible(),
      access: Permissions.proofOrSignature(),
    });
  }

  @method async approveBase(forest: AccountUpdateForest) {
    this.checkZeroBalanceChange(forest);
  }

  @method async mintTo(to: PublicKey, amount: UInt64) {
    this.internal.mint({ address: to, amount });
  }
}
