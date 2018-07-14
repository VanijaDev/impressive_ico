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

contract("IMP_WhitelistedCrowdsale", function (accounts) {
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

    describe("should validate whitelisted functional", async function () {
        it("should validate address can be whitelisted by owner only", async function () {
            assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted yet");

            await crowdsale.addToWhitelist(ACC_1);
            assert.isTrue(await crowdsale.whitelist(ACC_1), "ACC_1 should be whitelisted");

            await expectThrow(crowdsale.addToWhitelist(ACC_1, {
                from: ACC_1
            }), "should test not owner account");
        });

        it("should validate address can be removed from whitelist by owner only", async function () {
            assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted yet");

            await crowdsale.removeFromWhitelist(ACC_1);
            assert.isFalse(await crowdsale.whitelist(ACC_1), "ACC_1 should not be whitelisted");

            await expectThrow(crowdsale.removeFromWhitelist(ACC_1, {
                from: ACC_1
            }), "should test not owner account");
        });

        it("should prevent user not in whitelist from purchase", async function () {
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