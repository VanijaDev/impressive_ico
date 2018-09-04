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

contract("Rate and discount", (accounts) => {
    let token;
    let crowdsale;

    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];

    const CROWDSALE_WALLET = accounts[9];
    const PRIVATE_PLACEMENT_DISCOUNTS = [50];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    beforeEach("create crowdsale inst", async () => {
        await advanceBlock();

        let mockCrowdsaleData = mockCrowdsale();

        const CROWDSALE_WALLET = accounts[9];
        const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

        let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(1));
        let privatePlacementTimings = timings[0];
        let preICOTimings = timings[1];
        let icoTimings = timings[2];


        token = await IMP_Token.new();
        crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

        //  increase to openingTime
        await increaseTimeTo(privatePlacementTimings[0]);
        assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");
    });

    describe("validate current rate and discount", () => {
        it("should validate privatePlacement rate and discount", async () => {
            let res = await crowdsale.currentRateAndDiscount.call();
            let rate = new BigNumber(res[0]).toNumber();
            let discount = new BigNumber(res[1]).toNumber();

            assert.equal(rate, 300, "privatePlacement rate should be 300");
            assert.equal(discount, 50, "privatePlacement discount should be 50");
        });

        it("should validate preICO rate and discount", async () => {
            for (let i = 0; i < PRE_ICO_DISCOUNTS.length; i++) {
                //  increase time
                await increaseTimeTo(new BigNumber(await crowdsale.preICOTimings.call(i)).toNumber());

                //  rate & discount
                let res = await crowdsale.currentRateAndDiscount.call();
                let rate = new BigNumber(res[0]).toNumber();
                let discount = new BigNumber(res[1]).toNumber();

                assert.equal(rate, 200, "wrong rate for preICO");

                if (i == 0) {
                    assert.equal(discount, 20, "wrong discounts for preICO[0], should be 20");
                } else if (i == 1) {
                    assert.equal(discount, 18, "wrong discounts for preICO[1], should be 18");
                } else if (i == 2) {
                    assert.equal(discount, 16, "wrong discounts for preICO[2], should be 16");
                } else if (i == 3) {
                    assert.equal(discount, 14, "wrong discounts for preICO[3], should be 14");
                } else if (i == 4) {
                    assert.equal(discount, 12, "wrong discounts for preICO[4], should be 12");
                } else {
                    console.log("ERROR: !!! should not be here !!!");
                }
            }
        });

        it("should validate ICO rate and discount", async () => {
            for (let i = 0; i < ICO_DISCOUNTS.length; i++) {
                //  increase time
                await increaseTimeTo(new BigNumber(await crowdsale.icoTimings.call(i)).toNumber());

                //  rate & discount
                let res = await crowdsale.currentRateAndDiscount.call();
                let rate = new BigNumber(res[0]).toNumber();
                let discount = new BigNumber(res[1]).toNumber();

                assert.equal(rate, 100, "wrong rate for preICO");

                if (i == 0) {
                    assert.equal(discount, 10, "wrong discounts for preICO[0], should be 10");
                } else if (i == 1) {
                    assert.equal(discount, 9, "wrong discounts for preICO[1], should be 9");
                } else if (i == 2) {
                    assert.equal(discount, 8, "wrong discounts for preICO[2], should be 8");
                } else if (i == 3) {
                    assert.equal(discount, 7, "wrong discounts for preICO[3], should be 7");
                } else if (i == 4) {
                    assert.equal(discount, 6, "wrong discounts for preICO[4], should be 6");
                } else if (i == 5) {
                    assert.equal(discount, 5, "wrong discounts for preICO[4], should be 5");
                } else if (i == 6) {
                    assert.equal(discount, 4, "wrong discounts for preICO[4], should be 4");
                } else if (i == 7) {
                    assert.equal(discount, 3, "wrong discounts for preICO[4], should be 3");
                } else if (i == 8) {
                    assert.equal(discount, 2, "wrong discounts for preICO[4], should be 2");
                } else if (i == 9) {
                    assert.equal(discount, 1, "wrong discounts for preICO[4], should be 1");
                } else {
                    console.log("ERROR: !!! should not be here !!!");
                }
            }
        });
    });
});