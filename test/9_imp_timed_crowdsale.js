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

contract("Updating crowdsale values", (accounts) => {
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

        //  add to whitelist
        await crowdsale.addAddressesToWhitelist([ACC_1, ACC_2]);
    });

    describe('before Crowdsale started', () => {
        it('should be false for hasOpened', async () => {
            await assert.isFalse(await crowdsale.hasOpened.call(), "should not be started yet");
        });

        it("should fail on purchase before", async () => {
            await expectThrow(crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(1)
            }));
        });
    });

    describe("validate anyStageOpen function", () => {
        it("should validate anyStageOpen is false if no stage is currently open", async () => {
            let timings = buildTimings(web3.eth.getBlock("latest").timestamp + duration.minutes(10));
            let privatePlacementTimings = timings[0];
            let preICOTimings = timings[1];
            let icoTimings = timings[2];

            //  update
            await crowdsale.updateICO(333, icoTimings, ICO_DISCOUNTS);

            //  increaseTime
            await increaseTimeTo(new BigNumber(await crowdsale.icoTimings.call(0)).minus(1));

            assert.isFalse(await crowdsale.anyStageOpen(), "no stages should be open");
        });
    });
});