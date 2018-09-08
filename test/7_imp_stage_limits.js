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

contract("Stage limits", (accounts) => {
  let token;
  let crowdsale;

  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  const CROWDSALE_WALLET = accounts[9];

  const PRIVATE_PLACEMENT_DISCOUNTS = [50];
  const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
  const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

  beforeEach("create crowdsale inst", async () => {
    await advanceBlock();

    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

    let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(1));
    let privatePlacementTimings = timings[0];
    let preICOTimings = timings[1];
    let icoTimings = timings[2];


    token = await IMP_Token.new();
    crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
    await token.transferOwnership(crowdsale.address);
    await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

    // //  increase to openingTime
    await increaseTimeTo(privatePlacementTimings[0]);
    assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");

    //  add to whitelist
    await crowdsale.addAddressesToWhitelist([ACC_1, ACC_2]);
  });

  describe("validate cannot purchase more than any stage limit", () => {
    // it("should validate cannot purchase more than private placement limit", async () => {
    //   //  IMPORTANT: need to update privatePlacementRateEth to 3000000 for this test
    //   await crowdsale.sendTransaction({
    //     from: ACC_1,
    //     value: ether(1.2)
    //   });
    // });

    it("should validate cannot purchase more than limit amount preICO", async () => {
      let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.weeks(1));
      let privatePlacementTimings = timings[0];
      let preICOTimings = timings[1];
      let icoTimings = timings[2];

      //  update
      await crowdsale.updatePreICOAndICO(33333333, preICOTimings, PRE_ICO_DISCOUNTS, 222, icoTimings, ICO_DISCOUNTS);

      //  increase to preICOTimings[0]
      await increaseTimeTo(new BigNumber(await crowdsale.preICOTimings.call(0)));

      //  almost limit
      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(0.75)
      });

      await expectThrow(crowdsale.sendTransaction({
        from: ACC_2,
        value: ether(0.01)
      }), "should throw, because more than limit");
    });

    it("should validate cannot purchase more than limit amount ICO", async () => {
      let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.weeks(1));
      let privatePlacementTimings = timings[0];
      let preICOTimings = timings[1];
      let icoTimings = timings[2];

      //  update
      await crowdsale.updatePreICOAndICO(33333333, preICOTimings, PRE_ICO_DISCOUNTS, 44444444, icoTimings, ICO_DISCOUNTS);

      //  increase to icoTimings[1]
      await increaseTimeTo(new BigNumber(await crowdsale.icoTimings.call(1)));

      //  almost limit
      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(1.52)
      });

      await expectThrow(crowdsale.sendTransaction({
        from: ACC_2,
        value: ether(0.01)
      }), "should throw, because more than limit");
    });
  });
});