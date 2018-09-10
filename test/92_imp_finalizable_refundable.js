let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let BigNumber = require('bignumber.js');

import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
import buildTimings from "./helpers/buildTimings";
import expectThrow from './helpers/expectThrow';
import ether from "./helpers/ether";

import {
  duration,
  increaseTimeTo
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

import {
  advanceBlock
} from './helpers/advanceToBlock';

contract("Finalizable Refundable", (accounts) => {
  let token;
  let crowdsale;

  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  const CROWDSALE_WALLET = accounts[9];

  const PRIVATE_PLACEMENT_DISCOUNTS = [50];
  const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
  const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

  let icoTimings;

  beforeEach("create crowdsale inst", async () => {
    await advanceBlock();

    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

    let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(1));
    let privatePlacementTimings = timings[0];
    let preICOTimings = timings[1];
    icoTimings = timings[2];

    token = await IMP_Token.new();
    crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
    await token.transferOwnership(crowdsale.address);
    await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

    //  add to whitelist
    await crowdsale.addAddressesToWhitelist([ACC_1, ACC_2]);

    //  increase to openingTime
    await increaseTimeTo(privatePlacementTimings[0]);
    assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");
  });

  describe('deposit unsold token escrow', () => {
    it('should not deposit if soft cap not reached', async () => {
      //  purchase
      await crowdsale.sendTransaction({
        from: ACC_2,
        value: ether(10)
      });

      //  increase to closingTime
      await increaseTimeTo(icoTimings[icoTimings.length - 1] + 1);
      assert.isTrue(await crowdsale.hasClosed.call(), "crowdsale should be closed");

      //  balance before
      let escrowBalanceBefore = new BigNumber(await token.balanceOf.call(await crowdsale.unsoldTokenEscrow.call()));
      assert.equal(escrowBalanceBefore.toNumber(), 0, "unsold escrow balance should be 0 before");

      //  finalize by owner
      await crowdsale.finalize();

      //  balance after
      let escrowBalanceAfter = new BigNumber(await token.balanceOf.call(await crowdsale.unsoldTokenEscrow.call()));
      assert.equal(escrowBalanceAfter.toNumber(), 0, "unsold escrow balance should be 0 after");
    });

    it('should deposit correct token amount', async () => {
      //  update soft cap
      await crowdsale.updateSoftAndHardCap(ether(1), ether(3));

      //  purchase
      await crowdsale.sendTransaction({
        from: ACC_2,
        value: ether(2)
      });

      //  manualMint_team
      await crowdsale.manuallyMint_team(accounts[3], 170000000000);

      //  manualMint_conpanies
      await crowdsale.manuallyMint_companies(accounts[3], 50000000000);

      //  increase to closingTime
      await increaseTimeTo(icoTimings[icoTimings.length - 1] + 1);
      assert.isTrue(await crowdsale.hasClosed.call(), "crowdsale should be closed");

      //  balance before
      let escrowBalanceBefore = new BigNumber(await token.balanceOf.call(await crowdsale.unsoldTokenEscrow.call()));
      assert.equal(escrowBalanceBefore.toNumber(), 0, "unsold escrow balance should be 0 before");

      //  finalize by owner
      await crowdsale.finalize();

      //  balance after: 100 000 000 0000 - 17 000 000 0000 - 5 000 000 0000 = 780 000 0000
      let escrowBalanceAfter = new BigNumber(await token.balanceOf.call(await crowdsale.unsoldTokenEscrow.call()));
      assert.equal(escrowBalanceAfter.toNumber(), 7800000000, "unsold escrow balance should be 0 after");

    });
  });
});