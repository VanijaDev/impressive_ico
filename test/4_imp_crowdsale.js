let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_sharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");
let BigNumber = require('bignumber.js');

import mockToken from "./helpers/mocks/mockToken";
import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
import expectThrow from './helpers/expectThrow';
import ether from "./helpers/ether";

import {
    snapshot,
    revert
} from './helpers/reverter';
import {
    duration,
    increaseTimeTo
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

import {
    advanceBlock
} from './helpers/advanceToBlock';

contract("IMP_Crowdsale", (accounts) => {
    let token;
    let crowdsale;
    let sharedLedger;

    const ACC_1 = accounts[1];

    before("setup", async () => {
        await advanceBlock();
    });

    beforeEach("create crowdsale inst", async () => {
        let mockTokenData = mockToken();
        let mockCrowdsaleData = mockCrowdsale();

        const CROWDSALE_WALLET = accounts[9];

        let openingTime = latestTime() + duration.minutes(1);
        let timings = []; //  [opening, stageEdges]
        for (let i = 0; i < 7; i++) {
            timings[i] = openingTime + duration.weeks(i);
        }

        token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);
        await crowdsale.addToWhitelist(ACC_1);
        await snapshot();
    });

    afterEach('revert', async () => {
        await revert();
    });

    describe("validate initial Crowdsaletype", () => {
        it("should be preICO", async () => {
            assert.equal(new BigNumber(await crowdsale.currentCrowdsaleType.call()).toNumber(), 0, "should be 0 as preICO");
        });
    });

    describe("validate percents and values on start", () => {
        it("should validate percents", async () => {
            assert.equal(new BigNumber(await sharedLedger.tokenPercentageReserved_preICO.call()).toNumber(), 30, "wrong percentage for preICO");
            assert.equal(new BigNumber(await sharedLedger.tokenPercentageReserved_ico.call()).toNumber(), 44, "wrong percentage for ico");
            assert.equal(new BigNumber(await sharedLedger.tokenPercentageReserved_team.call()).toNumber(), 18, "wrong percentage for team");
            assert.equal(new BigNumber(await sharedLedger.tokenPercentageReserved_platform.call()).toNumber(), 5, "wrong percentage for platform");
            assert.equal(new BigNumber(await sharedLedger.tokenPercentageReserved_airdrops.call()).toNumber(), 2, "wrong percentage for airdrops");
        });

        it("should validate amounts from percents", async () => {
            let totalSupply = new BigNumber(await sharedLedger.tokenLimitTotalSupply_crowdsale.call());

            //  1
            let percents_preICO = new BigNumber(await sharedLedger.tokenPercentageReserved_preICO.call());
            let tokens_preICO = totalSupply.dividedBy(100).multipliedBy(percents_preICO).toNumber();
            assert.equal(tokens_preICO, 300000000000, "wrong percentage for preICO");

            let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call()).toNumber();
            assert.equal(tokensAvailableToMint_purchase, tokens_preICO, "wrong tokensAvailableToMint_purchase");

            //  2
            let percents_team = new BigNumber(await sharedLedger.tokenPercentageReserved_team.call());
            let tokens_team = totalSupply.dividedBy(100).multipliedBy(percents_team).toNumber();
            assert.equal(tokens_team, 180000000000, "wrong percentage for team");

            let tokensAvailableToMint_team = new BigNumber(await crowdsale.tokensAvailableToMint_team.call()).toNumber();
            assert.equal(tokensAvailableToMint_team, tokens_team, "wrong tokensAvailableToMint_team");

            //  3
            let percents_platform = new BigNumber(await sharedLedger.tokenPercentageReserved_platform.call());
            let tokens_platform = totalSupply.dividedBy(100).multipliedBy(percents_platform).toNumber();
            assert.equal(tokens_platform, 50000000000, "wrong percentage for platform");

            let tokensAvailableToMint_platform = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call()).toNumber();
            assert.equal(tokensAvailableToMint_platform, tokens_platform, "wrong tokensAvailableToMint_platform");

            //  4
            let percents_airdrops = new BigNumber(await sharedLedger.tokenPercentageReserved_airdrops.call());
            let tokens_airdrops = totalSupply.dividedBy(100).multipliedBy(percents_airdrops).toNumber();
            assert.equal(tokens_airdrops, 20000000000, "wrong percentage for airdrops");

            let tokensAvailableToMint_airdrops = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call()).toNumber();
            assert.equal(tokensAvailableToMint_airdrops, tokens_airdrops, "wrong tokensAvailableToMint_airdrops");
        });
    });

    describe("purchase", () => {
        let mockCrowdsaleData = mockCrowdsale();
        let minWei = mockCrowdsaleData.minimumPurchaseWei

        it("should reject if minimum purchase wei value not reached", async () => {
            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: minWei / 10
            }), "should revert, because wei value is too low");
        });

        it("should pass if purchase wei value is > minimum", async () => {
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: minWei
            });
        });

        it("wei should be transferred to vault contract", async () => {
            let vault = await sharedLedger.vault.call();

            // 1
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });

            let balance = new BigNumber(await web3.eth.getBalance(vault)).toNumber();
            assert.equal(balance, new BigNumber(ether(1)).toNumber(), "wrong vault balance after purchase 1 ETH");

            //  2
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(2.5)
            });

            balance = new BigNumber(await web3.eth.getBalance(vault)).toNumber();
            assert.equal(balance, new BigNumber(ether(3.5)).toNumber(), "wrong vault balance after purchase 2.5 ETH");

            let crowdsaleWeiRaised = new BigNumber(await crowdsale.crowdsaleWeiRaised.call()).toNumber();
            assert.equal(crowdsaleWeiRaised, new BigNumber(ether(3.5)).toNumber(), "wrong crowdsaleWeiRaised value");
        });
    });

    describe("correct token amount is being calculated during purchase", () => {
        it("should validate token amount is correct for 1 ETH", async () => {
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });

            let balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, 1200000, "wrong balance for 1 ETH");

        });

        it("should validate token amount is correct for two transactions 1 ETH + 0.5 ETH", async () => {
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(0.5)
            });

            let balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, 1800000, "wrong balance for 2 transactions");
        });
    });

    describe("tokensAvailableToMint_ for diff purposes methods", () => {
        const ONE_FULL_TOKEN = 10000;

        it("should decrease preICO", async () => {
            let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(0.5)
            });

            let tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            let diff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(diff, 600000, "wrong decrease value for tokensAvailableToMint_preICO");

            await crowdsale.tokensAvailableToMint_purchase.call({
                from: ACC_1
            }); //  any user can check

        });

        it("should decrease team", async () => {
            let tokensAvailableToMint_team = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());

            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);

            let tokensAvailableToMint_team_after = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());
            let diff = tokensAvailableToMint_team.minus(tokensAvailableToMint_team_after).toNumber();

            assert.equal(diff, 10000, "wrong decrease value for tokensAvailableToMint_team");

            await expectThrow(crowdsale.tokensAvailableToMint_team.call({
                from: ACC_1
            }), "should not let anyone check tokensAvailableToMint_team");
        });

        it("should decrease platform", async () => {
            let tokensAvailableToMint_platform = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());

            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN * 2);

            let tokensAvailableToMint_platform_after = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());
            let diff = tokensAvailableToMint_platform.minus(tokensAvailableToMint_platform_after).toNumber();

            assert.equal(diff, 20000, "wrong decrease value for tokensAvailableToMint_platform");

            await expectThrow(crowdsale.tokensAvailableToMint_platform.call({
                from: ACC_1
            }), "should not let anyone check tokensAvailableToMint_platform");
        });

        it("should decrease airdrops", async () => {
            let tokensAvailableToMint_airdrops = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());

            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);

            let tokensAvailableToMint_airdrops_after = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());
            let diff = tokensAvailableToMint_airdrops.minus(tokensAvailableToMint_airdrops_after).toNumber();

            assert.equal(diff, 10000, "wrong decrease value for tokensAvailableToMint_airdrops");

            await expectThrow(crowdsale.tokensAvailableToMint_airdrops.call({
                from: ACC_1
            }), "should not let anyone check tokensAvailableToMint_airdrops");
        });
    });

    describe("manual transfers", () => {
        const ONE_FULL_TOKEN = 10000;

        it("should reject manualMint_ functions if not owner", async () => {
            await expectThrow(crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN, {
                from: ACC_1
            }), "should not let manualMint_team if not owner");

            await expectThrow(crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN, {
                from: ACC_1
            }), "should not let manualMint_platform if not owner");

            await expectThrow(crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN, {
                from: ACC_1
            }), "should not let manualMint_airdrops if not owner");
        });

        it("should validate manualMint_team transfers tokens correctly", async () => {
            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);
            let balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN, "wrong tokens after manualMint_team ONE_FULL_TOKEN");

            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);
            balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN * 2, "wrong tokens after next manualMint_team ONE_FULL_TOKEN");
        });

        it("should validate manualMint_platform transfers tokens correctly", async () => {
            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
            let balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN, "wrong tokens after manualMint_team ONE_FULL_TOKEN");

            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
            balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN * 2, "wrong tokens after next manualMint_platform ONE_FULL_TOKEN");
        });

        it("should validate manualMint_airdrops transfers tokens correctly", async () => {
            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
            let balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN, "wrong tokens after manualMint_team ONE_FULL_TOKEN");

            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
            balance = new BigNumber(await token.balanceOf.call(ACC_1)).toNumber();
            assert.equal(balance, ONE_FULL_TOKEN * 2, "wrong tokens after next manualMint_airdrops ONE_FULL_TOKEN");
        });
    });

    describe("tokensMinted_", () => {
        const ONE_ETH_IN_WEI = ether(1);
        const ONE_FULL_TOKEN = 10000;

        it("should validate preICO updating", async () => {
            let tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ONE_ETH_IN_WEI
            });
            let tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            let diff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(diff, 1200000, "wrong tokensMinted_preICO");
        });

        // it("should validate ico updating", async () => {
        //     //  Implemented separately
        // });

        it("should validate team updating", async () => {
            let tokensMinted_team = new BigNumber(await crowdsale.tokensMinted_team.call());
            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN * 2);
            let tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());

            let diff = tokensMinted_team_after.minus(tokensMinted_team).toNumber();
            assert.equal(diff, 20000, "wrong tokensMinted_team");
        });

        it("should validate platform updating", async () => {
            let tokensMinted_platform = new BigNumber(await crowdsale.tokensMinted_platform.call());
            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
            let tokensMinted_platform_after = new BigNumber(await crowdsale.tokensMinted_platform.call());

            let diff = tokensMinted_platform_after.minus(tokensMinted_platform).toNumber();
            assert.equal(diff, 10000, "wrong tokensMinted_platform");
        });

        it("should validate airdrops updating", async () => {
            let tokensMinted_airdrops = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
            let tokensMinted_airdrops_after = new BigNumber(await crowdsale.tokensMinted_airdrops.call());

            let diff = tokensMinted_airdrops_after.minus(tokensMinted_airdrops).toNumber();
            assert.equal(diff, 10000, "wrong tokensMinted_airdrops");
        });
    });

    describe("validate token mint limits", () => {
        const ACC_2 = accounts[2];
        //  NOTE: preICO and ICO minting limits tested separately

        it("should validate team minting limits", async () => {
            let maxTokens = new BigNumber(await crowdsale.tokenLimitReserved_team.call()).toNumber();

            await expectThrow(crowdsale.manualMint_team(ACC_1, maxTokens + 1), "should not allow mint team tokens more than limit at once");

            await crowdsale.manualMint_team(ACC_1, maxTokens - 1);
            await crowdsale.manualMint_team(ACC_2, 1);
            await expectThrow(crowdsale.manualMint_team(ACC_2, 1), "should not allow mint team tokens more than limit");
        });

        it("should validate platform minting limits", async () => {
            let maxTokens = new BigNumber(await crowdsale.tokenLimitReserved_platform.call()).toNumber();

            await expectThrow(crowdsale.manualMint_platform(ACC_1, maxTokens + 1), "should not allow mint platform tokens more than limit at once");

            await crowdsale.manualMint_platform(ACC_1, maxTokens - 1);
            await crowdsale.manualMint_platform(ACC_2, 1);
            await expectThrow(crowdsale.manualMint_platform(ACC_2, 1), "should not allow mint platform tokens more than limit");
        });

        it("should validate airdrops minting limits", async () => {
            let maxTokens = new BigNumber(await crowdsale.tokenLimitReserved_airdrops.call()).toNumber();

            await expectThrow(crowdsale.manualMint_airdrops(ACC_1, maxTokens + 1), "should not allow mint airdrops tokens more than limit at once");
            await crowdsale.manualMint_airdrops(ACC_1, maxTokens - 1);
            await crowdsale.manualMint_airdrops(ACC_2, 1);
            await expectThrow(crowdsale.manualMint_airdrops(ACC_2, 1), "should not allow mint airdrops tokens more than limit");
        });
    });

    describe("validate finalize function", () => {
        it("should validate limits are being recalculated after finalization", async () => {
            const ACC_2 = accounts[2];
            await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

            //  1. purchase
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(90) //  == 180 000 0000 tokens
            });

            // 2. team
            const teamSent = new BigNumber(50000000); //  5000
            await crowdsale.manualMint_team(ACC_2, teamSent.toNumber());


            //  3. platform
            const platformSent = new BigNumber(40000000); //  4000
            await crowdsale.manualMint_platform(ACC_2, platformSent.toNumber());


            //  4. airdrops
            const airdropsSent = new BigNumber(30000000); //  3000
            await crowdsale.manualMint_airdrops(ACC_2, airdropsSent.toNumber());

            let unspentPurchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call()); //  currently preICO
            let unspentTeam = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());
            let unspentPlatform = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());
            let unspentAirdrops = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());
            let unspentPurchase_ICO = new BigNumber(await sharedLedger.tokenLimitReserved_ico.call());
            // console.log("unspentPurchase: ", unspentPurchase.toNumber());
            // console.log("unspentTeam: ", unspentTeam.toNumber());
            // console.log("unspentPlatform: ", unspentPlatform.toNumber());
            // console.log("unspentAirdrops: ", unspentAirdrops.toNumber());
            // console.log("unspentPurchase_ICO: ", unspentPurchase_ICO.toNumber());

            let closing = new BigNumber(await crowdsale.closingTime.call());
            await increaseTimeTo(closing.plus(duration.minutes(1)));

            // tx to finalize preICO
            assert.isFalse(await crowdsale.isFinalized.call(), "should not be finalized yet");
            let finalizePreICOTx = await crowdsale.sendTransaction({
                from: ACC_1,
                value: web3.toWei(1, 'ether') //  == 180 000 0000 tokens
            });
            await assert.equal(web3.eth.getCode(crowdsale.address), 0, "crowdsale should not exist");

            // event
            let logs = finalizePreICOTx.logs;
            // console.log(logs);
            assert.equal(logs.length, 3, "finalizePreICOTx should have 3 events");
            let finalizeEvent = logs[0];
            let finalizeEventName = finalizeEvent.event;
            assert.equal(finalizeEventName, "FinalizedWithResults");

            //  new contract for ICO
            const CROWDSALE_WALLET = accounts[9];
            const CROWDSALE_OPENING = latestTime() + duration.days(8);

            let timings = [];
            for (let i = 0; i < 4; i++) {
                timings[i] = CROWDSALE_OPENING + duration.hours(i);
            }

            let mockCrowdsaleData = mockCrowdsale();

            crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsaleICODiscounts);

            await sharedLedger.transferOwnership(crowdsale.address);
            await token.transferOwnership(crowdsale.address);

            let unspentPurchaseUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            let unspentTeamUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());
            let unspentPlatformUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());
            let unspentAirdropsUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());
            // console.log("\n\n\nunspentPurchaseUpdated: ", unspentPurchaseUpdated.toNumber());
            // console.log("unspentTeamUpdated: ", unspentTeamUpdated.toNumber());
            // console.log("unspentPlatformUpdated: ", unspentPlatformUpdated.toNumber());
            // console.log("unspentAirdropsUpdated: ", unspentAirdropsUpdated.toNumber());

            //  test ICO values
            assert.equal(unspentPurchaseUpdated.toNumber(), unspentPurchase_ICO.plus(unspentPurchase).toNumber(), "wrong token purchase limit for ICO");
            assert.equal(unspentTeamUpdated.toNumber(), unspentTeam.toNumber(), "wrong token purchase limit for team");
            assert.equal(unspentPlatformUpdated.toNumber(), unspentPlatform.toNumber(), "wrong token purchase limit for platform");
            assert.equal(unspentAirdropsUpdated.toNumber(), unspentAirdrops.toNumber(), "wrong token purchase limit for airdrops");
        });
    });
});