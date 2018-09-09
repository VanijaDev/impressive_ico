let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
// let RefundEscrow = require("../node_modules/openzeppelin-solidity/contracts/payment/RefundEscrow.sol");
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

contract("Purchase", (accounts) => {
    let token;
    let crowdsale;

    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];

    const CROWDSALE_WALLET = accounts[9];

    let timings;
    let privatePlacementTimings;
    let preICOTimings;
    let icoTimings;

    beforeEach("create crowdsale inst", async () => {
        await advanceBlock();

        const CROWDSALE_WALLET = accounts[9];
        const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

        const PRIVATE_PLACEMENT_DISCOUNTS = [50];
        const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
        const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

        timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(1));
        privatePlacementTimings = timings[0];
        preICOTimings = timings[1];
        icoTimings = timings[2];

        token = await IMP_Token.new();
        crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

        //  increase to openingTime
        await increaseTimeTo(privatePlacementTimings[0]);
        assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");

        //  add to whitelist
        await crowdsale.addAddressesToWhitelist([ACC_1, ACC_2]);
    });

    describe("private placement purchase flow", () => {
        it("should validate correct token calculations balances, reservations updates for private placement", async () => {
            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_privatePlacement_before = new BigNumber(await crowdsale.tokensMinted_privatePlacement.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 3000000 + (3000000 * 0.5)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 4500000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_privatePlacement_after = new BigNumber(await crowdsale.tokensMinted_privatePlacement.call());
            assert.equal(tokensMinted_privatePlacement_after.minus(tokensMinted_privatePlacement_before).toNumber(), 4500000, "wrong tokensMinted_privatePlacement after purchase");
        });
    });

    describe("no more than hard cap", () => {
        it("should not allow purchace if more than hard cap", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), ether(2));
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1.5)
            });
            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(0.51)
            }), "should not allow purchace if more than hard cap");
        });
    });

    describe("preICO purchase flow", () => {
        it("should validate correct token calculations balances, reservations updates for preICO[0]", async () => {
            //  increase time
            await increaseTimeTo(preICOTimings[0]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_preICO_before = new BigNumber(await crowdsale.tokensMinted_preICO.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 2000000 + (2000000 * 0.2)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 2400000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_preICO_after = new BigNumber(await crowdsale.tokensMinted_preICO.call());
            assert.equal(tokensMinted_preICO_after.minus(tokensMinted_preICO_before).toNumber(), 2400000, "wrong tokensMinted_preICO after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for preICO[1]", async () => {
            //  increase time
            await increaseTimeTo(preICOTimings[1]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_preICO_before = new BigNumber(await crowdsale.tokensMinted_preICO.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 2000000 + (2000000 * 0.18)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 2360000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_preICO_after = new BigNumber(await crowdsale.tokensMinted_preICO.call());
            assert.equal(tokensMinted_preICO_after.minus(tokensMinted_preICO_before).toNumber(), 2360000, "wrong tokensMinted_preICO after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for preICO[2]", async () => {
            //  increase time
            await increaseTimeTo(preICOTimings[2]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_preICO_before = new BigNumber(await crowdsale.tokensMinted_preICO.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 2000000 + (2000000 * 0.16)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 2320000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_preICO_after = new BigNumber(await crowdsale.tokensMinted_preICO.call());
            assert.equal(tokensMinted_preICO_after.minus(tokensMinted_preICO_before).toNumber(), 2320000, "wrong tokensMinted_preICO after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for preICO[3]", async () => {
            //  increase time
            await increaseTimeTo(preICOTimings[3]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_preICO_before = new BigNumber(await crowdsale.tokensMinted_preICO.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 2000000 + (2000000 * 0.14)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 2280000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_preICO_after = new BigNumber(await crowdsale.tokensMinted_preICO.call());
            assert.equal(tokensMinted_preICO_after.minus(tokensMinted_preICO_before).toNumber(), 2280000, "wrong tokensMinted_preICO after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for preICO[4]", async () => {
            //  increase time
            await increaseTimeTo(preICOTimings[4]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_preICO_before = new BigNumber(await crowdsale.tokensMinted_preICO.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 2000000 + (2000000 * 0.12)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 2240000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_preICO_after = new BigNumber(await crowdsale.tokensMinted_preICO.call());
            assert.equal(tokensMinted_preICO_after.minus(tokensMinted_preICO_before).toNumber(), 2240000, "wrong tokensMinted_preICO after purchase");
        });
    });

    describe("ICO purchase flow", () => {
        it("should validate correct token calculations balances, reservations updates for ICO[0]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[0]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.1)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1100000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1100000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[1]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[1]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.09)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1090000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1090000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[2]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[2]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.08)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1080000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1080000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[3]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[3]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.07)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1070000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1070000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[4]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[4]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.06)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1060000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1060000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[5]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[5]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.05)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1050000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1050000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[6]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[6]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.04)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1040000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1040000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[7]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[7]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.03)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1030000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1030000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[8]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[8]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.02)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1020000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1020000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate correct token calculations balances, reservations updates for ICO[9]", async () => {
            //  increase time
            await increaseTimeTo(icoTimings[9]);

            let ACC_1_before = new BigNumber(await token.balanceOf(ACC_1));
            let tokensMinted_ico_before = new BigNumber(await crowdsale.tokensMinted_ico.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            let ACC_1_after = new BigNumber(await token.balanceOf(ACC_1));

            //  ACC_1 balance: 1000000 + (1000000 * 0.01)
            assert.equal(ACC_1_after.minus(ACC_1_before).toNumber(), 1010000, "wrong ACC_1 balance after purchase");

            //  reservations updated
            let tokensMinted_ico_after = new BigNumber(await crowdsale.tokensMinted_ico.call());
            assert.equal(tokensMinted_ico_after.minus(tokensMinted_ico_before).toNumber(), 1010000, "wrong tokensMinted_ico after purchase");
        });

        it("should validate value less < minimumPurchase not allowed", async () => {
            //  allowed
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: 100000000000000000
            })

            //  throw
            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: 10000000000000000
            }), "should throw because value < minimumPurchase");
        });
    });
});