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

contract("Soft and Hard caps update", (accounts) => {
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

        //  add to whitelist
        await crowdsale.addAddressesToWhitelist([ACC_1, ACC_2]);
    });

    describe("Soft cap update", () => {
        it("should allow to update soft cap to owner", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), 0);
            assert.equal(new BigNumber(await crowdsale.goal.call()).toNumber(), ether(1), "soft cap not updated correctly");
        });

        it("should not allow to update soft cap to not owner", async () => {
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(1), 0, {
                from: ACC_2
            }), "not owner should not be able to update soft cap");
        });

        it("should not allow to update soft cap if soft cap already reached", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), 0);
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(2), 0), "soft cap can not be updated once current soft cap is been reached");
        });

        it("should not allow to update soft cap if weiRaised is more than updated softCap", async () => {
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(0.5), 0), "soft cap can not be updated once weiRaised is more than updated softCap");
        });

        it("should not allow to update softCap if more than hardCap", async () => {
            let hardCap = new BigNumber(await crowdsale.crowdsaleHardCap.call());
            await expectThrow(crowdsale.updateSoftAndHardCap(hardCap.plus(ether(1)).toNumber(), 0), "soft cap can not be updated because more than hardCap");
        });
    });

    describe("Hard cap update", () => {
        it("should allow to update hard cap to owner", async () => {
            let softCap = new BigNumber(await crowdsale.goal.call());
            let hardCap = softCap.plus(ether(1));

            await crowdsale.updateSoftAndHardCap(0, hardCap.toNumber());
            assert.equal(new BigNumber(await crowdsale.crowdsaleHardCap.call()).toNumber(), hardCap.toNumber(), "hard cap not updated correctly");
        });

        it("should not allow to update hard cap to not owner", async () => {
            let softCap = new BigNumber(await crowdsale.goal.call());
            let hardCap = softCap.plus(ether(1));

            await expectThrow(crowdsale.updateSoftAndHardCap(0, hardCap.toNumber(), {
                from: ACC_2
            }), "not owner should not be able to update hard cap");
        });

        it("should not allow to update hard cap to less than softCap", async () => {
            let softCap = new BigNumber(await crowdsale.goal.call());
            let hardCap = softCap.minus(ether(1));

            await expectThrow(crowdsale.updateSoftAndHardCap(0, hardCap.toNumber()), "should not be able to update hard cap to less than softCap");
        });

        it("should not allow to update hard cap if less than weiRaised", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), 0);
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(2)
            });
            await expectThrow(crowdsale.updateSoftAndHardCap(0, ether(1.5)), "should not be able to update hard cap if less than weiRaised");
        });
    });

    describe("both soft and hard update", () => {
        it("should allow to update both caps to owner", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), ether(2));
            assert.equal(new BigNumber(await crowdsale.goal.call()).toNumber(), ether(1), "soft cap not updated correctly for both");
            assert.equal(new BigNumber(await crowdsale.crowdsaleHardCap.call()).toNumber(), ether(2), "hard cap not updated correctly for both");
        });

        it("should not allow to update both caps to not owner", async () => {
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(1), ether(2), {
                from: ACC_2
            }), "not owner should not be able to update both caps");
        });

        it("should not update is new softCap is more that new hardCap", async () => {
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(2), ether(1)), "should not allow to update is new softCap is more that new hardCap");
        });

        it("should not allow to update both caps if soft cap already reached", async () => {
            await crowdsale.updateSoftAndHardCap(ether(1), 0);
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(2), ether(2)), "both caps can not be updated once current soft cap is been reached");
        });

        it("should not allow to update both caps if weiRaised is more than updated softCap", async () => {
            await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            });
            await expectThrow(crowdsale.updateSoftAndHardCap(ether(0.5), ether(10)), "both caps can not be updated once weiRaised is more than updated softCap");
        });
    });
});