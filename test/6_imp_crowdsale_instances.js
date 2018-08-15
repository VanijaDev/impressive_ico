let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_sharedLedger = artifacts.require("./IMP_crowdsaleSharedLedger");
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

contract("IMP_Crowdsale - test preICO purchase limits", (accounts) => {
    let crowdsale;

    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];

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
        let sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);
        await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);
    });

    describe("validate token mint limits", () => {
        it("should validate can not mint more tnan preICO limit", async () => {
            // let maxTokens = new BigNumber(await crowdsale.tokenLimitReserved_purchase.call()).toNumber();

            // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(30)
            });
            // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());

            await crowdsale.sendTransaction({
                from: ACC_2,
                value: ether(20)
            });
            // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());

            await expectThrow(crowdsale.sendTransaction({
                from: ACC_2,
                value: ether(1)
            }), "should throw, because exceeds maximum limit");
        });
    });

    //  Note: ICO minitng limits tested in 7_imp_discount_crowdsale.js
});

contract("MP_Crowdsale - soft cap REACHED", (accounts) => {
    const ACC_1 = accounts[1];
    const CROWDSALE_WALLET = accounts[9];

    const SOFT_CAP_ETH = 2;

    let token;
    let sharedLedger;
    let crowdsale;
    let walletFundsBefore;

    before("setup", async () => {
        await advanceBlock();
    });

    beforeEach('setup', async () => {
        let opening = latestTime() + duration.days(10);

        walletFundsBefore = new BigNumber(await web3.eth.getBalance(CROWDSALE_WALLET));

        let timings = [];
        for (let i = 0; i < 7; i++) {
            timings[i] = opening + duration.hours(i);
        }

        let mockTokenData = mockToken();
        let mockCrowdsaleData = mockCrowdsale();

        token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], SOFT_CAP_ETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(opening + duration.minutes(1));

        await crowdsale.addToWhitelist(ACC_1);
        await crowdsale.sendTransaction({
            from: ACC_1,
            value: ether(SOFT_CAP_ETH)
        });

        //  finalize preICO and move to ICO period
        let closing = new BigNumber(await crowdsale.closingTime.call());
        await increaseTimeTo(closing.plus(duration.minutes(1)));

        console.log("0: ", await crowdsale.hasClosed.call());
        //  tx to finish preICO
        await crowdsale.sendTransaction({
            from: ACC_1,
            value: ether(1)
        });

        //  new contract for ICO
        opening = latestTime() + duration.minutes(1);

        timings = [];
        for (let i = 0; i < 4; i++) {
            timings[i] = opening + duration.hours(i);
        }

        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsaleICODiscounts);

        closing = new BigNumber(await crowdsale.closingTime.call());

        await sharedLedger.transferOwnership(crowdsale.address);
        await token.transferOwnership(crowdsale.address);
        await increaseTimeTo(closing.plus(duration.minutes(1)));
    });

    describe.only("tests for soft cap reached", () => {
        it("should check crowdsale and sharedLedged were destroyed", async () => {
            //  tx to finish preICO
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });

            await assert.equal(web3.eth.getCode(crowdsale.address), 0, "crowdsale should not exist");
            await assert.equal(web3.eth.getCode(sharedLedger.address), 0, "sharedLedger should not exist");
        });

        it("should check funds were transfered to wallet", async () => {
            let raised = new BigNumber(await crowdsale.crowdsaleWeiRaised.call());

            //  tx to finish preICO
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });

            assert.equal(new BigNumber(await web3.eth.getBalance(CROWDSALE_WALLET)).toNumber(), walletFundsBefore.plus(raised).toNumber(), "wrong wallet balance after crowdsale finished");
        });
    });
});