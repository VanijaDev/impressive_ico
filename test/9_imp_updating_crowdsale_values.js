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

contract("Reservations", (accounts) => {
  let token;
  let crowdsale;

  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  const CROWDSALE_WALLET = accounts[9];

  before("setup", async () => {
    await advanceBlock();
  });

  beforeEach("create crowdsale inst", async () => {
    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

    const PRIVATE_PLACEMENT_DISCOUNTS = [50];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(1));
    let privatePlacementTimings = timings[0];
    let preICOTimings = timings[1];
    let icoTimings = timings[2];


    token = await IMP_Token.new();
    crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
    await token.transferOwnership(crowdsale.address);
    await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

    //  increase to openingTime
    increaseTimeTo(privatePlacementTimings[0]);
    assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");
  });

  describe("updating preICO and ICO", () => {
    let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.weeks(1));
    let privatePlacementTimings = timings[0];
    let preICOTimings = timings[1];
    let icoTimings = timings[2];

    const PRE_ICO_DISCOUNTS_UPDATED = [21, 19, 17, 15, 13]; //  including each edge
    const ICO_DISCOUNTS_UPDATED = [30, 29, 28, 27, 26, 25, 24, 23, 22, 21]; //  including each edge

    it("should validate preICO rate, timings and discounts are being updated", async () => {
      await crowdsale.updatePreICOAndICO(111, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, icoTimings, ICO_DISCOUNTS_UPDATED);

      //  preICO
      assert.equal(111, new BigNumber(await crowdsale.preICORate.call()).toNumber(), "wrond preICO rate after update");

      assert.equal(preICOTimings[0], new BigNumber(await crowdsale.preICOTimings.call(0)).toNumber(), "wrond preICOTimings[0] after update");
      assert.equal(preICOTimings[1], new BigNumber(await crowdsale.preICOTimings.call(1)).toNumber(), "wrond preICOTimings[1] after update");
      assert.equal(preICOTimings[2], new BigNumber(await crowdsale.preICOTimings.call(2)).toNumber(), "wrond preICOTimings[2] after update");
      assert.equal(preICOTimings[3], new BigNumber(await crowdsale.preICOTimings.call(3)).toNumber(), "wrond preICOTimings[3] after update");
      assert.equal(preICOTimings[4], new BigNumber(await crowdsale.preICOTimings.call(4)).toNumber(), "wrond preICOTimings[4] after update");

      assert.equal(PRE_ICO_DISCOUNTS_UPDATED[0], new BigNumber(await crowdsale.preICODiscounts.call(0)).toNumber(), "wrond preICODiscounts[0] after update");
      assert.equal(PRE_ICO_DISCOUNTS_UPDATED[1], new BigNumber(await crowdsale.preICODiscounts.call(1)).toNumber(), "wrond preICODiscounts[1] after update");
      assert.equal(PRE_ICO_DISCOUNTS_UPDATED[2], new BigNumber(await crowdsale.preICODiscounts.call(2)).toNumber(), "wrond preICODiscounts[2] after update");
      assert.equal(PRE_ICO_DISCOUNTS_UPDATED[3], new BigNumber(await crowdsale.preICODiscounts.call(3)).toNumber(), "wrond preICODiscounts[3] after update");
      assert.equal(PRE_ICO_DISCOUNTS_UPDATED[4], new BigNumber(await crowdsale.preICODiscounts.call(4)).toNumber(), "wrond preICODiscounts[4] after update");

      //  ICO
      assert.equal(222, new BigNumber(await crowdsale.icoRate.call()).toNumber(), "wrond ICO rate after update");

      assert.equal(icoTimings[0], new BigNumber(await crowdsale.icoTimings.call(0)).toNumber(), "wrond icoTimings[0] after update");
      assert.equal(icoTimings[1], new BigNumber(await crowdsale.icoTimings.call(1)).toNumber(), "wrond icoTimings[1] after update");
      assert.equal(icoTimings[2], new BigNumber(await crowdsale.icoTimings.call(2)).toNumber(), "wrond icoTimings[2] after update");
      assert.equal(icoTimings[3], new BigNumber(await crowdsale.icoTimings.call(3)).toNumber(), "wrond icoTimings[3] after update");
      assert.equal(icoTimings[4], new BigNumber(await crowdsale.icoTimings.call(4)).toNumber(), "wrond icoTimings[4] after update");
      assert.equal(icoTimings[5], new BigNumber(await crowdsale.icoTimings.call(5)).toNumber(), "wrond icoTimings[5] after update");
      assert.equal(icoTimings[6], new BigNumber(await crowdsale.icoTimings.call(6)).toNumber(), "wrond icoTimings[6] after update");
      assert.equal(icoTimings[7], new BigNumber(await crowdsale.icoTimings.call(7)).toNumber(), "wrond icoTimings[7] after update");
      assert.equal(icoTimings[8], new BigNumber(await crowdsale.icoTimings.call(8)).toNumber(), "wrond icoTimings[8] after update");
      assert.equal(icoTimings[9], new BigNumber(await crowdsale.icoTimings.call(9)).toNumber(), "wrond icoTimings[9] after update");

      assert.equal(ICO_DISCOUNTS_UPDATED[0], new BigNumber(await crowdsale.icoDiscounts.call(0)).toNumber(), "wrond icoDiscounts[0] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[1], new BigNumber(await crowdsale.icoDiscounts.call(1)).toNumber(), "wrond icoDiscounts[1] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[2], new BigNumber(await crowdsale.icoDiscounts.call(2)).toNumber(), "wrond icoDiscounts[2] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[3], new BigNumber(await crowdsale.icoDiscounts.call(3)).toNumber(), "wrond icoDiscounts[3] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[4], new BigNumber(await crowdsale.icoDiscounts.call(4)).toNumber(), "wrond icoDiscounts[4] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[5], new BigNumber(await crowdsale.icoDiscounts.call(5)).toNumber(), "wrond icoDiscounts[5] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[6], new BigNumber(await crowdsale.icoDiscounts.call(6)).toNumber(), "wrond icoDiscounts[6] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[7], new BigNumber(await crowdsale.icoDiscounts.call(7)).toNumber(), "wrond icoDiscounts[7] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[8], new BigNumber(await crowdsale.icoDiscounts.call(8)).toNumber(), "wrond icoDiscounts[8] after update");
      assert.equal(ICO_DISCOUNTS_UPDATED[9], new BigNumber(await crowdsale.icoDiscounts.call(9)).toNumber(), "wrond icoDiscounts[9] after update");
    });

    it("should validate not owner cannot update", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, icoTimings, ICO_DISCOUNTS_UPDATED, {
        from: ACC_1
      }), "should throw if not owner tries to update crowdsale");
    });

    it("should validate cannot update with invalid preICO rate", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(0, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, icoTimings, ICO_DISCOUNTS_UPDATED), "should throw if tries to update crowdsale with invalid preICO rate");
    });

    it("should validate cannot update with invalid ICO rate", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 0, icoTimings, ICO_DISCOUNTS_UPDATED), "should throw if tries to update crowdsale with invalid ICO rate");
    });

    it("should validate cannot update with invalid preICO timings", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, privatePlacementTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, icoTimings, ICO_DISCOUNTS_UPDATED), "should throw if tries to update crowdsale with with invalid preICO timings");
    });

    it("should validate cannot update with invalid ICO timings", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, privatePlacementTimings, ICO_DISCOUNTS_UPDATED), "should throw if tries to update crowdsale with with invalid ICO timings");
    });

    it("should validate cannot update with invalid preICO discounts", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, preICOTimings, [21, 19, 17, 15], 222, icoTimings, ICO_DISCOUNTS_UPDATED), "should throw if tries to update crowdsale with invalid preICO discounts");
    });

    it("should validate cannot update with invalid ICO discounts", async () => {
      await expectThrow(crowdsale.updatePreICOAndICO(111, preICOTimings, PRE_ICO_DISCOUNTS_UPDATED, 222, icoTimings, [30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 22]), "should throw if tries to update crowdsale with invalid ICO rate");
    });
  });
});