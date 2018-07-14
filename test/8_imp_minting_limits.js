let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");
let Reverter = require('./helpers/reverter');
let BigNumber = require('bignumber.js');

import mockToken from "./helpers/mocks/mockToken";
import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
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

contract("IMP_Crowdsale - ICO calculations", (accounts) => {
  let token;
  let crowdsale;

  let sharedLedger;

  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  before("setup", async () => {
    await advanceBlock();
  });

  beforeEach("create crowdsale inst", async function () {
    let mockTokenData = mockToken();
    let mockCrowdsaleData = mockCrowdsale();

    const CROWDSALE_WALLET = accounts[9];

    let openingTime = latestTime() + duration.minutes(1);
    let timings = []; //  [opening, stageEdges]
    for (let i = 0; i < 7; i++) {
      timings[i] = openingTime + duration.weeks(i);
    }

    token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
    sharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
    crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

    await token.transferOwnership(crowdsale.address);
    await sharedLedger.transferOwnership(crowdsale.address);

    increaseTimeTo(openingTime);
    // await Reverter.snapshot();
  });

  // afterEach('revert', async () => {
  //   await Reverter.revert();
  // });

  describe("validate correct calculations while ICO minting", () => {
    const ONE_FULL_TOKEN = 10000;

    it("should decrease ICO", async () => {
      console.log("ACC_2    3: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());
      await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(5)
      });
      // let tokensMinted_purchasePreICO = new BigNumber(await crowdsale.tokensMinted_purchase.call());

      //  finalize preICO and move to ICO period
      let closing = new BigNumber(await crowdsale.closingTime.call());
      await increaseTimeTo(closing.plus(duration.minutes(1)));

      //  tx to finish preICO
      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(5)
      });

      //  new contract for ICO
      const CROWDSALE_WALLET = accounts[4];
      const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + duration.minutes(18);

      let timings = [];
      for (let i = 0; i < 4; i++) {
        timings[i] = CROWDSALE_OPENING + duration.hours(i);
      }

      let mockCrowdsaleData = mockCrowdsale();
      crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsaleICODiscounts);

      await sharedLedger.transferOwnership(crowdsale.address);
      await token.transferOwnership(crowdsale.address);
      increaseTimeTo(CROWDSALE_OPENING);


      //  test manual mintings
      let tokensMinted_team = new BigNumber(await crowdsale.tokensMinted_team.call());
      await crowdsale.manualMint_team(ACC_2, ONE_FULL_TOKEN * 2);
      let tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());
      let tokensMinted_team_Diff = tokensMinted_team_after.minus(tokensMinted_team).toNumber();
      assert.equal(tokensMinted_team_Diff, 20000, "wrong tokensMinted_team");

      let tokensMinted_platform = new BigNumber(await crowdsale.tokensMinted_platform.call());
      await crowdsale.manualMint_platform(ACC_2, ONE_FULL_TOKEN);
      let tokensMinted_platform_after = new BigNumber(await crowdsale.tokensMinted_platform.call());
      let tokensMinted_platform_Diff = tokensMinted_platform_after.minus(tokensMinted_platform).toNumber();
      assert.equal(tokensMinted_platform_Diff, 10000, "wrong tokensMinted_platform");

      let tokensMinted_airdrops = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
      await crowdsale.manualMint_airdrops(ACC_2, ONE_FULL_TOKEN);
      let tokensMinted_airdrops_after = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
      let tokensMinted_airdrops_Diff = tokensMinted_airdrops_after.minus(tokensMinted_airdrops).toNumber();
      assert.equal(tokensMinted_airdrops_Diff, 10000, "wrong tokensMinted_airdrops");

      assert.equal(new BigNumber(await token.balanceOf(ACC_2)).toNumber(), 40000, "wrong ACC_2 balance after manual transfers");

      //  test purchase calculations
      await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

      //  stage 1
      let currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
      assert.equal(currentDiscount, 10, "1 - should be 10%");

      let calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(1, "ether"))).toNumber();
      assert.equal(calculatedTokenAmount, 5500000000, "1 - should be 5500000000 tokens");

      let tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
      let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(1)
      });

      assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 5506000000, "1 - wrong balance of ACC_1");

      //  minted
      let tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

      let mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
      assert.equal(mintedDiff, 5500000000, "1 - wrong tokensMinted_ICO");

      //  available to mint
      let tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
      let availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

      assert.equal(availableToMintDiff, 5500000000, "1 - wrong decrease value for tokensAvailableToMint_ICO");


      //  stage 2
      await increaseTimeTo((await crowdsale.stageEdges.call(0)).toNumber() + duration.minutes(1));

      currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
      assert.equal(currentDiscount, 9, "2 - should be 9%");

      calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(2, "ether"))).toNumber();
      assert.equal(calculatedTokenAmount, 10900000000, "1 - should be 10900000000 tokens");

      tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
      tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(2)
      });

      assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 16406000000, "2 - wrong balance of ACC_1");

      //  minted
      tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

      mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
      assert.equal(mintedDiff, 10900000000, "2 - wrong tokensMinted_ICO");

      //  available to mint
      tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
      availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

      assert.equal(availableToMintDiff, 10900000000, "2 - wrong decrease value for tokensAvailableToMint_ICO");


      //  stage 3
      await increaseTimeTo((await crowdsale.stageEdges.call(1)).toNumber() + duration.minutes(1));

      currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
      assert.equal(currentDiscount, 8, "3 - should be 8%");

      calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(3, "ether"))).toNumber();
      assert.equal(calculatedTokenAmount, 16200000000, "3 - should be 16200000000 tokens");

      tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
      tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

      await crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(3)
      });

      assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 32606000000, "3 - wrong balance of ACC_1");

      //  minted
      tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

      mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
      assert.equal(mintedDiff, 16200000000, "3 - wrong tokensMinted_ICO");

      //  available to mint
      tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
      availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

      assert.equal(availableToMintDiff, 16200000000, "3 - wrong decrease value for tokensAvailableToMint_ICO");

      console.log("ACC_2    4: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());

      //  exceed limit
      await crowdsale.sendTransaction({
        from: ACC_2,
        value: ether(99)
      });

      await expectThrow(crowdsale.sendTransaction({
        from: ACC_1,
        value: ether(88)
      }), "should not exceed purchase limit");
    });
  });
});