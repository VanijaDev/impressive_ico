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

contract("Manual transfers", (accounts) => {
  let token;
  let crowdsale;

  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  const CROWDSALE_WALLET = accounts[9];

  before("setup", async () => {
    await advanceBlock();
  });

  beforeEach("create crowdsale inst", async () => {
    let mockCrowdsaleData = mockCrowdsale();

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
    crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET);
    await token.transferOwnership(crowdsale.address);
    await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

    //  increase to openingTime
    increaseTimeTo(privatePlacementTimings[0]);
    assert.isTrue(await crowdsale.crowdsaleRunning.call(), "crowdsale should be running in beforeEach");
  });

  describe("test team manual transfers", () => {
    const MANUAL_MINT_ACC = accounts[8];

    it("should test team manual transfer", async () => {
      let teamTokens = 12345;
      let tokensMinted_team_before = new BigNumber(await crowdsale.tokensMinted_team.call());

      //  1
      let team_balance_before = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      await crowdsale.manuallyMint_team(MANUAL_MINT_ACC, teamTokens);
      let team_balance_after = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      assert.equal(team_balance_after.minus(team_balance_before).toNumber(), teamTokens, "wrong team tokens");

      //  2
      let tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());
      assert.equal(tokensMinted_team_after.minus(tokensMinted_team_before).toNumber(), teamTokens, "wrong tokensMinted_team after mint");

      //  3 sum
      await crowdsale.manuallyMint_team(MANUAL_MINT_ACC, teamTokens);
      tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());
      assert.equal(tokensMinted_team_after.minus(tokensMinted_team_before).toNumber(), teamTokens * 2, "wrong tokensMinted_team after second mint");
    });

    it("should test bountiesAirdrops manual transfer", async () => {
      let bountiesAirdropsTokens = 123456;
      let tokensMinted_bountiesAirdrops_before = new BigNumber(await crowdsale.tokensMinted_bountiesAirdrops.call());

      //  1
      let bountiesAirdrops_balance_before = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      await crowdsale.manuallyMint_bountiesAirdrops(MANUAL_MINT_ACC, bountiesAirdropsTokens);
      let bountiesAirdrops_balance_after = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      assert.equal(bountiesAirdrops_balance_after.minus(bountiesAirdrops_balance_before).toNumber(), bountiesAirdropsTokens, "wrong bountiesAirdrops tokens");

      //  2
      let tokensMinted_bountiesAirdrops_after = new BigNumber(await crowdsale.tokensMinted_bountiesAirdrops.call());
      assert.equal(tokensMinted_bountiesAirdrops_after.minus(tokensMinted_bountiesAirdrops_before).toNumber(), bountiesAirdropsTokens, "wrong tokensMinted_bountiesAirdrops after mint");

      //  3 sum
      await crowdsale.manuallyMint_bountiesAirdrops(MANUAL_MINT_ACC, bountiesAirdropsTokens);
      tokensMinted_bountiesAirdrops_after = new BigNumber(await crowdsale.tokensMinted_bountiesAirdrops.call());
      assert.equal(tokensMinted_bountiesAirdrops_after.minus(tokensMinted_bountiesAirdrops_before).toNumber(), bountiesAirdropsTokens * 2, "wrong tokensMinted_bountiesAirdrops after second mint");
    });

    it("should test companies manual transfer", async () => {
      let companiesTokens = 1234567;
      let tokensMinted_companies_before = new BigNumber(await crowdsale.tokensMinted_companies.call());

      //  1
      let companies_balance_before = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      await crowdsale.manuallyMint_companies(MANUAL_MINT_ACC, companiesTokens);
      let companies_balance_after = new BigNumber(await token.balanceOf(MANUAL_MINT_ACC));
      assert.equal(companies_balance_after.minus(companies_balance_before).toNumber(), companiesTokens, "wrong companiesTokens tokens");

      //  2
      let tokensMinted_companies_after = new BigNumber(await crowdsale.tokensMinted_companies.call());
      assert.equal(tokensMinted_companies_after.minus(tokensMinted_companies_before).toNumber(), companiesTokens, "wrong tokensMinted_companies after mint");

      //  3 sum
      await crowdsale.manuallyMint_companies(MANUAL_MINT_ACC, companiesTokens);
      tokensMinted_companies_after = new BigNumber(await crowdsale.tokensMinted_companies.call());
      assert.equal(tokensMinted_companies_after.minus(tokensMinted_companies_before).toNumber(), companiesTokens * 2, "wrong tokensMinted_companies after second mint");
    });

    it("should validate unsoldTokens amount", async () => {
      let teamTokens = 12345;
      await crowdsale.manuallyMint_team(MANUAL_MINT_ACC, teamTokens);

      let bountiesAirdropsTokens = 123456;
      await crowdsale.manuallyMint_bountiesAirdrops(MANUAL_MINT_ACC, bountiesAirdropsTokens);

      let companiesTokens = 1234567;
      await crowdsale.manuallyMint_companies(MANUAL_MINT_ACC, companiesTokens);

      let totalTokens = new BigNumber(await crowdsale.tokenLimitTotalSupply_crowdsale.call());
      let unsoldTokens = new BigNumber(await crowdsale.unsoldTokens.call());
      assert.equal(unsoldTokens.toNumber(), totalTokens.minus(new BigNumber(teamTokens + bountiesAirdropsTokens + companiesTokens)).toNumber(), "wrong unsoldTokens tokens");
    });
  });
});