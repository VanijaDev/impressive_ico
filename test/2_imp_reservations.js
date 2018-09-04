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

contract("Reservations", (accounts) => {
    let token;
    let crowdsale;

    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];

    const CROWDSALE_WALLET = accounts[9];

    beforeEach("create crowdsale inst", async () => {
        await advanceBlock();

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
        await increaseTimeTo(privatePlacementTimings[0]);
        assert.isTrue(await crowdsale.hasOpened.call(), "crowdsale should be running in beforeEach");
    });

    describe("test reservation values", () => {
        it("should test private placement tokens", async () => {
            let privatePlacementTokens = new BigNumber(await crowdsale.tokensReserved_privatePlacement.call());
            assert.equal(privatePlacementTokens.toNumber(), 50000000000, "wrong private placement tokens");
        });

        it("should test preICO tokens", async () => {
            let preICOTokens = new BigNumber(await crowdsale.tokensReserved_preICO.call());
            assert.equal(preICOTokens.toNumber(), 300000000000, "wrong preICO tokens");
        });

        it("should test ICO tokens", async () => {
            let ICOTokens = new BigNumber(await crowdsale.tokensReserved_ico.call());
            assert.equal(ICOTokens.toNumber(), 740000000000, "wrong ICO tokens");
        });

        it("should test team tokens", async () => {
            let teamTokens = new BigNumber(await crowdsale.tokensReserved_team.call());
            assert.equal(teamTokens.toNumber(), 180000000000, "wrong team tokens");
        });

        it("should test bountiesAirdrops tokens", async () => {
            let bountiesAirdropsTokens = new BigNumber(await crowdsale.tokensReserved_bountiesAirdrops.call());
            assert.equal(bountiesAirdropsTokens.toNumber(), 30000000000, "wrong bountiesAirdrops tokens");
        });

        it("should test companies tokens", async () => {
            let companiesTokens = new BigNumber(await crowdsale.tokensReserved_companies.call());
            assert.equal(companiesTokens.toNumber(), 50000000000, "wrong companies tokens");
        });

        it("should test unsoldTokens tokens", async () => {
            let unsoldTokens = new BigNumber(await crowdsale.unsoldTokens.call());
            assert.equal(unsoldTokens.toNumber(), 1000000000000, "wrong unsoldTokens tokens");
        });
    });
});