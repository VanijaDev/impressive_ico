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
        crowdsale = await IMP_Crowdsale.new(token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET, [privatePlacementTimings[0], icoTimings[icoTimings.length - 1]]);
        await token.transferOwnership(crowdsale.address);
        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

        //  increase to openingTime
        increaseTimeTo(privatePlacementTimings[0]);
        assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");
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
            await crowdsale.addAddressToWhitelist(ACC_1);

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
    });
});