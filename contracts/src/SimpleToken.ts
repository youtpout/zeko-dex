import { Field, Permissions, SmartContract, state, State, method, Struct, UInt64, PublicKey, Bool, Circuit, Provable, TokenContract, AccountUpdate, AccountUpdateForest, Reducer, Account, Experimental, Option, Int64 } from 'o1js';
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

  @method async transferAway(amount: UInt64) {
    // TODO: in a real zkApp, here would be application-specific checks for whether we want to allow sending tokens

    this.balance.subInPlace(amount);
    this.self.body.mayUseToken = AccountUpdate.MayUseToken.ParentsOwnToken;

  }

  @method async transferMagic(from: AccountUpdate, toPub: PublicKey, amount: UInt64) {

    // coerce the inputs to AccountUpdate and pass to `approveBase()`
    let tokenId = this.deriveTokenId();

    let to = AccountUpdate.defaultAccountUpdate(toPub, tokenId);
    to.label = `${this.constructor.name}.transfer() (to)`;

    from.balanceChange = Int64.from(amount).neg();
    to.balanceChange = Int64.from(amount);
    let forest = AccountUpdateForest.fromFlatArray([from, to]);
    await this.approveBase(forest);
  }
}

export class DexTokenHolder extends SmartContract {

  // this works for both directions (in our case where both tokens use the same contract)
  @method.returns(UInt64)
  async swap(
    contract: PublicKey,
    user: PublicKey,
    tokenIn: PublicKey,
    amountIn: UInt64,
    amount: UInt64
  ) {
    let simpleTokenIn = new SimpleToken(tokenIn);
    await simpleTokenIn.transfer(user, contract, amountIn);
    // compute and send dy
    let dy = amount;
    // just subtract dy balance and let adding balance be handled one level higher
    this.balance.subInPlace(dy);


    return dy;
  }
}