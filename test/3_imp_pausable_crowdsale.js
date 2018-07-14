let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");

import mockToken from "./helpers/mocks/mockToken";
import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
import expectThrow from './helpers/expectThrow';

import {
    duration,
    increaseTimeTo
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

import {
    advanceBlock
} from './helpers/advanceToBlock';


contract("Pausable", function (accounts) {
    let crowdsale;

    const ACC_1 = accounts[1];

    before("setup", async () => {
        advanceBlock();
    });

    beforeEach("create crowdsale inst", async function () {
        let mockTokenData = mockToken();
        let mockCrowdsaleData = mockCrowdsale();

        const CROWDSALE_WALLET = accounts[4];

        let openingTime = latestTime() + duration.minutes(1);
        let timings = []; //  [opening, stageEdges]
        for (let i = 0; i < 7; i++) {
            timings[i] = openingTime + duration.weeks(i);
        }

        let token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        let sharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);
    });

    describe("pausable functional", function () {
        it("should allow owner to pause / unpause crowdsale", async function () {
            await crowdsale.pause();
            await crowdsale.unpause();
        });

        it("should not allow not owner to pause / unpause crowdsale", async function () {
            await expectThrow(crowdsale.pause({
                from: ACC_1
            }), "should not allow not owner to pause");

            await expectThrow(crowdsale.unpause({
                from: ACC_1
            }), "should not allow not owner to unpause");
        });

        it("should not allow purchase while crowdsale is paused", async function () {
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

        it("should not allow manualMint_team while paused", async function () {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN), "manualMint_team not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);
        });

        it("should not allow manualMint_platform while paused", async function () {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN), "manualMint_platform not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
        });

        it("should not allow manualMint_airdrops while paused", async function () {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN), "manualMint_airdrops not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
        });
    });
});