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

// test ./test/3_imp_pausable_crowdsale.js
contract("Pausable", (accounts) => {
  let crowdsale;

  const ACC_1 = accounts[1];
  const CROWDSALE_WALLET = accounts[9];

  let mockToken = mockTokenData();
  let mockCrowdsale = mockCrowdsaleData();


  beforeEach("create crowdsale inst", async () => {
    await advanceBlock();

    let crowdsaleOpening = latestTime();

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

  describe("pausable functional", () => {
    it("should allow owner to pause / unpause crowdsale", async () => {
      await crowdsale.pause();
      await crowdsale.unpause();
    });

    it("should not allow not owner to pause / unpause crowdsale", async () => {
      await expectThrow(crowdsale.pause({
        from: ACC_1
      }), "should not allow not owner to pause");

      await expectThrow(crowdsale.unpause({
        from: ACC_1
      }), "should not allow not owner to unpause");
    });

    it("should not allow purchase while crowdsale is paused", async () => {
      await crowdsale.addToWhitelist(ACC_1);

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, "ether")
      });

      await crowdsale.pause();

      await expectThrow(crowdsale.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, "ether")
      }), "should not be available for purchase");

      await crowdsale.unpause();

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, "ether")
      });
    });

    const ONE_FULL_TOKEN = 10000;

    it("should not allow manualMint_team while paused", async () => {
      await crowdsale.pause();
      await expectThrow(crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN), "manualMint_team not allowed while paused");

      await crowdsale.unpause();
      await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);
    });

    it("should not allow manualMint_platform while paused", async () => {
      await crowdsale.pause();
      await expectThrow(crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN), "manualMint_platform not allowed while paused");

      await crowdsale.unpause();
      await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
    });

    it("should not allow manualMint_airdrops while paused", async () => {
      await crowdsale.pause();
      await expectThrow(crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN), "manualMint_airdrops not allowed while paused");

      await crowdsale.unpause();
      await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
    });
  });
});