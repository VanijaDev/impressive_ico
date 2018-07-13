let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");

import mockTokenData from "./helpers/mocks/MockToken";
import mockCrowdsaleData from "./helpers/mocks/MockCrowdsale";
import expectThrow from './helpers/expectThrow';

import {
  duration
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

import {
  advanceBlock
} from './helpers/advanceToBlock';

contract("IMP_WhitelistedCrowdsale", (accounts) => {
  let crowdsale;

  const ACC_1 = accounts[1];
  const CROWDSALE_WALLET = accounts[9];

  before("setup", async () => {
    await advanceBlock();
  });

  beforeEach("create crowdsale inst", async () => {
    let crowdsaleOpening = latestTime();

    let mockToken = mockTokenData();
    let mockCrowdsale = mockCrowdsaleData();
    let timings = [];
    for (let i = 0; i < 7; i++) {
      timings[i] = crowdsaleOpening + duration.hours(i);
    }

    let token = await IMP_Token.new(mockToken.tokenName, mockToken.tokenSymbol, mockToken.tokenDecimals);
    let crowdsaleSharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsale.crowdsaleTotalSupplyLimit, [mockCrowdsale.tokenPercentageReservedPreICO, mockCrowdsale.tokenPercentageReservedICO, mockCrowdsale.tokenPercentageReservedTeam, mockCrowdsale.tokenPercentageReservedPlatform, mockCrowdsale.tokenPercentageReservedAirdrops], mockCrowdsale.crowdsaleSoftCapETH, CROWDSALE_WALLET);
    crowdsale = await IMP_Crowdsale.new(token.address, crowdsaleSharedLedger.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth, timings, mockCrowdsale.crowdsalePreICODiscounts);

    await token.transferOwnership(crowdsale.address);
    await crowdsaleSharedLedger.transferOwnership(crowdsale.address);
  });

  describe.only("should validate whitelisted functional", () => {
    it("should validate address can be whitelisted by owner only", async () => {
      assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted yet");

      crowdsale.addToWhitelist(ACC_1);
      assert.isTrue(await crowdsale.whitelist(ACC_1), "ACC_1 should be whitelisted");

      await expectThrow(crowdsale.addToWhitelist(ACC_1, {
        from: ACC_1
      }), "should test not owner account");
    });

    it("should validate address can be removed from whitelist by owner only", async () => {
      assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted yet");

      crowdsale.removeFromWhitelist(ACC_1);
      assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted");

      await expectThrow(crowdsale.removeFromWhitelist(ACC_1, {
        from: ACC_1
      }), "should test not owner account");
    });

    it("should prevent user not in whitelist from purchase", async () => {
      await expectThrow(crowdsale.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, "ether")
      }, "should fail, because ACC_1 is not in whitelist"));

      await crowdsale.addToWhitelist(ACC_1);

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, 'ether')
      });
    });
  });
});