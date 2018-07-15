let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");
let BigNumber = require('bignumber.js');

import mockToken from "./helpers/mocks/mockToken";
import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
import ether from "./helpers/ether";

import {
    snapshot,
    revert
} from "./helpers/reverter";
import {
    duration,
    increaseTimeTo
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

import {
    advanceBlock
} from './helpers/advanceToBlock';

contract("MP_Crowdsale - refundable, soft cap NOT REACHED", (accounts) => {
    const SOFT_CAP_ETH = 2;
    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];
    const ACC_3 = accounts[3];

    const ACC_1_ETH_SEND = SOFT_CAP_ETH / 2;
    const ACC_2_ETH_SEND = SOFT_CAP_ETH / 4;

    let token;
    let crowdsale;
    let sharedLedger;

    before("setup", async () => {
        await advanceBlock();
    });

    beforeEach('create crowdsale inst', async () => {
        const CROWDSALE_WALLET = accounts[9];

        let openingTime = latestTime() + duration.minutes(1);
        let timings = [];
        for (let i = 0; i < 7; i++) {
            timings[i] = openingTime + duration.hours(i);
        }

        let mockTokenData = mockToken();
        let mockCrowdsaleData = mockCrowdsale();

        token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        sharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], SOFT_CAP_ETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);

        await crowdsale.addManyToWhitelist([ACC_1, ACC_2, ACC_3]);

        await crowdsale.sendTransaction({
            from: ACC_1,
            value: ether(ACC_1_ETH_SEND)
        });

        await crowdsale.sendTransaction({
            from: ACC_2,
            value: ether(ACC_2_ETH_SEND)
        });

        //  finalize preICO and move to ICO period
        let closing = new BigNumber(await crowdsale.closingTime.call());
        await increaseTimeTo(closing.plus(duration.minutes(1)));

        //  tx to finish preICO
        await crowdsale.sendTransaction({
            from: ACC_3,
            value: ether(1)
        });

        //  new contract for ICO
        openingTime = latestTime() + duration.minutes(2);
        timings = [];
        for (let i = 0; i < 4; i++) {
            timings[i] = openingTime + duration.hours(i);
        }

        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsaleICODiscounts);

        closing = new BigNumber(await crowdsale.closingTime.call());

        await sharedLedger.transferOwnership(crowdsale.address);
        await token.transferOwnership(crowdsale.address);
        await increaseTimeTo(closing.plus(duration.minutes(1)));

        await snapshot();
    });

    afterEach('revert', async () => {
        await revert();
    });

    describe("tests for soft cap not reached", () => {
        it("should check funds transferred back to address, which finalized crowdsale", async () => {
            let balanceBefore = new BigNumber(await web3.eth.getBalance(ACC_1));

            //  tx to finish preICO
            let tx = await crowdsale.sendTransaction({
                from: ACC_1,
                value: ether(40)
            });

            let gasUsed = new BigNumber(tx.receipt.gasUsed);
            // console.log("gasUsed: ", gasUsed);

            let txx = await web3.eth.getTransaction(tx.tx);
            // console.log(txx);

            let gasPrice = new BigNumber(txx.gasPrice);
            // console.log("gasPrice: ", gasPrice);

            let ethUsed = gasUsed.multipliedBy(gasPrice);
            // console.log("ethUsed: ", ethUsed);

            assert.equal(new BigNumber(await web3.eth.getBalance(ACC_1)).toNumber(), balanceBefore.minus(ethUsed).toNumber(), "wrong balance after finishable tx");
        });

        it("should check refunds", async () => {
            //  tx to finish preICO
            await crowdsale.sendTransaction({
                from: ACC_3,
                value: ether(1)
            });

            //  ACC_1
            let beforeClaim_ACC_1 = new BigNumber(await web3.eth.getBalance(ACC_1));
            let tx_claim_ACC_1 = await sharedLedger.claimRefund({
                from: ACC_1
            });
            let afterClaim_ACC_1 = new BigNumber(await web3.eth.getBalance(ACC_1));

            let txx = await web3.eth.getTransaction(tx_claim_ACC_1.tx);
            let ethUsed = new BigNumber(tx_claim_ACC_1.receipt.gasUsed).multipliedBy(new BigNumber(txx.gasPrice));
            assert.equal(afterClaim_ACC_1.toNumber(), beforeClaim_ACC_1.minus(ethUsed).plus(ether(ACC_1_ETH_SEND)).toNumber(), "wrong ACC_1 balance after refund");

            //  ACC_2
            let beforeClaim_ACC_2 = new BigNumber(await web3.eth.getBalance(ACC_2));
            let tx_claim_ACC_2 = await sharedLedger.claimRefund({
                from: ACC_2
            });
            let afterClaim_ACC_2 = new BigNumber(await web3.eth.getBalance(ACC_2));

            txx = await web3.eth.getTransaction(tx_claim_ACC_2.tx);
            ethUsed = new BigNumber(tx_claim_ACC_2.receipt.gasUsed).multipliedBy(new BigNumber(txx.gasPrice));
            assert.equal(afterClaim_ACC_2.toNumber(), beforeClaim_ACC_2.minus(ethUsed).plus(ether(ACC_2_ETH_SEND)).toNumber(), "wrong ACC_2 balance after refund");

        });
    });
});