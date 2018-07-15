let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_sharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");
let Reverter = require('./helpers/reverter');
let BigNumber = require('bignumber.js');

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


contract('TimedCrowdsale', (accounts) => {
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

        await crowdsale.addToWhitelist(ACC_1);

        await Reverter.snapshot();
    });

    afterEach('revert', async () => {
        await Reverter.revert();
    });

    describe('before Crowdsale started', () => {
        it('should be false for hasOpened', async () => {
            await assert.isFalse(await crowdsale.hasOpened.call(), "should not be started yet");
        });

        it("should fail on purchase before", async () => {
            await crowdsale.addToWhitelist(ACC_1);

            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: web3.toWei(1, 'ether')
            }));
        });
    });

    describe("after Crowdsale finishes", () => {
        it('should validate hasClosed', async () => {
            await increaseTimeTo(new BigNumber(await crowdsale.openingTime.call()).plus(duration.seconds(1)));
            await crowdsale.addToWhitelist(ACC_1);

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: web3.toWei(1, 'ether')
            });

            let closeTime = new BigNumber(await crowdsale.closingTime.call()).plus(duration.seconds(1));
            await increaseTimeTo(closeTime);

            await assert.isTrue(await crowdsale.hasClosed.call(), "should be closed already");
        });
    });
});