let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");

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


contract("Pausable", (accounts) => {
    let crowdsale;

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

        let token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        let sharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);
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
                value: ether(1)
            });

            await crowdsale.pause();

            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            }), "should not be available for purchase");

            await crowdsale.unpause();

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
        });

        const ONE_FULL_TOKEN = 10000;

        it("should not allow manualMint_team while paused", async () => {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN), "manualMint_team not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_team(ACC_1, ONE_FULL_TOKEN);
        });

        it("should not allow manualMint_platform while paused", async () => {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN), "manualMint_platform not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_platform(ACC_1, ONE_FULL_TOKEN);
        });

        it("should not allow manualMint_airdrops while paused", async () => {
            await crowdsale.pause();
            await expectThrow(crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN), "manualMint_airdrops not allowed while paused");

            await advanceBlock();
            await crowdsale.unpause();
            await crowdsale.manualMint_airdrops(ACC_1, ONE_FULL_TOKEN);
        });
    });
});