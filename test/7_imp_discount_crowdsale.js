let IMP_Token = artifacts.require("./IMP_Token");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
let IMP_CrowdsaleSharedLedger = artifacts.require("./IMP_CrowdsaleSharedLedger");
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

contract("IMP_Crowdsale - discounts testing", (accounts) => {
    let token;
    let crowdsale;
    let sharedLedger;

    const ACC_1 = accounts[1];
    const ACC_2 = accounts[2];

    before("setup", async () => {
        await advanceBlock();
    });

    beforeEach("create crowdsale inst", async function () {
        let mockTokenData = mockToken();
        let mockCrowdsaleData = mockCrowdsale();

        const CROWDSALE_WALLET = accounts[9];

        let openingTime = latestTime() + duration.minutes(1);
        let timings = []; //  [opening, stageEdges]
        for (let i = 0; i < 7; i++) {
            timings[i] = openingTime + duration.weeks(i);
        }

        token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
        sharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
        crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);

        increaseTimeTo(openingTime);
    });

    describe("validate discounts and mintedTokens", () => {
        it("should validate discounts and mintedTokens are calculated correctly", async () => {
            console.log("ACC_2    1: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());
            await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

            //  stage 1
            let currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 20, "1 - should be 20%");

            let calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(0.5, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 600000, "1 - should be 60 tokens");

            let tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
            let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: web3.toWei(0.5, "ether")
            });

            assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 600000, "1 - wrong balance of ACC_1");

            //  minted
            let tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            let mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 600000, "1 - wrong tokensMinted_preICO");

            //  available to mint
            let tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            let availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 600000, "1 - wrong decrease value for tokensAvailableToMint_preICO");


            //  stage 2
            await increaseTimeTo((await crowdsale.stageEdges.call(0)).toNumber() + duration.minutes(1));

            currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 18, "2 - should be 18%");

            calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(1.5, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 1770000, "2 - should be 1770000 tokens");

            await crowdsale.sendTransaction({
                from: ACC_1,
                value: web3.toWei(1.5, "ether")
            });

            assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 2370000, "2 - wrong balance of ACC_1");

            //  minted
            tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 2370000, "2 - wrong tokensMinted_preICO");

            //  available to mint
            tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 2370000, "2 - wrong decrease value for tokensAvailableToMint_preICO");


            //  stage 3
            await increaseTimeTo((await crowdsale.stageEdges.call(1)).toNumber() + duration.minutes(1));

            currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 16, "3 - should be 16%");

            calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(2, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 2320000, "3 - should be 2320000 tokens");

            await crowdsale.sendTransaction({
                from: ACC_2,
                value: web3.toWei(2, "ether")
            });
            assert.equal(new BigNumber(await token.balanceOf.call(ACC_2)).toNumber(), 2320000, "3 - wrong balance of ACC_2");

            //  minted
            tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 4690000, "3 - wrong tokensMinted_preICO");

            //  available to mint
            tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 4690000, "3 - wrong decrease value for tokensAvailableToMint_preICO");


            //  stage 4
            await increaseTimeTo((await crowdsale.stageEdges.call(2)).toNumber() + duration.minutes(1));

            currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 14, "4 - should be 14%");

            calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(3, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 3420000, "4 - should be 3420000 tokens");

            await crowdsale.sendTransaction({
                from: ACC_2,
                value: web3.toWei(3, "ether")
            });

            assert.equal(new BigNumber(await token.balanceOf.call(ACC_2)).toNumber(), 5740000, "4 - wrong balance of ACC_2");

            //  minted
            tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 8110000, "4 - wrong tokensMinted_preICO");

            //  available to mint
            tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 8110000, "4 - wrong decrease value for tokensAvailableToMint_preICO");


            //  stage 5
            await increaseTimeTo((await crowdsale.stageEdges.call(3)).toNumber() + duration.minutes(1));

            currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 12, "5 - should be 12%");

            calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(4, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 4480000, "5 - should be 4480000 tokens");

            await crowdsale.sendTransaction({
                from: ACC_2,
                value: web3.toWei(4, "ether")
            });

            assert.equal(new BigNumber(await token.balanceOf.call(ACC_2)).toNumber(), 10220000, "5 - wrong balance of ACC_2");

            //  minted
            tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 12590000, "5 - wrong tokensMinted_preICO");

            //  available to mint
            tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 12590000, "5 - wrong decrease value for tokensAvailableToMint_preICO");


            //  stage 6
            await increaseTimeTo((await crowdsale.stageEdges.call(4)).toNumber() + duration.minutes(1));

            currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
            assert.equal(currentDiscount, 10, "6 - should be 10%");

            calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(5, "ether"))).toNumber();
            assert.equal(calculatedTokenAmount, 5500000, "6 - should be 5500000 tokens");

            await crowdsale.sendTransaction({
                from: ACC_2,
                value: web3.toWei(5, "ether")
            });

            assert.equal(new BigNumber(await token.balanceOf.call(ACC_2)).toNumber(), 15720000, "6 - wrong balance of ACC_2");

            //  minted
            tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

            mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
            assert.equal(mintedDiff, 18090000, "6 - wrong tokensMinted_preICO");

            //  available to mint
            tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
            availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

            assert.equal(availableToMintDiff, 18090000, "6 - wrong decrease value for tokensAvailableToMint_preICO");
        });
    });

    // describe("validate correct calculations while ICO minting", () => {
    //     const ONE_FULL_TOKEN = 10000;

    //     it("should decrease ICO", async () => {
    //         console.log("ACC_2    3: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());
    //         await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

    //         await crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(5, "ether")
    //         });
    //         // let tokensMinted_purchasePreICO = new BigNumber(await crowdsale.tokensMinted_purchase.call());

    //         //  finalize preICO and move to ICO period
    //         let closing = new BigNumber(await crowdsale.closingTime.call());
    //         await increaseTimeTo(closing.plus(duration.minutes(1)));

    //         //  tx to finish preICO
    //         await crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(5, "ether")
    //         });

    //         //  new contract for ICO
    //         const CROWDSALE_WALLET = accounts[4];
    //         const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + duration.minutes(18);

    //         let timings = [];
    //         for (let i = 0; i < 4; i++) {
    //             timings[i] = CROWDSALE_OPENING + duration.hours(i);
    //         }

    //         let mockCrowdsaleData = mockCrowdsale();
    //         crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsaleICODiscounts);

    //         await sharedLedger.transferOwnership(crowdsale.address);
    //         await token.transferOwnership(crowdsale.address);
    //         increaseTimeTo(CROWDSALE_OPENING);


    //         //  test manual mintings
    //         let tokensMinted_team = new BigNumber(await crowdsale.tokensMinted_team.call());
    //         await crowdsale.manualMint_team(ACC_2, ONE_FULL_TOKEN * 2);
    //         let tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());
    //         let tokensMinted_team_Diff = tokensMinted_team_after.minus(tokensMinted_team).toNumber();
    //         assert.equal(tokensMinted_team_Diff, 20000, "wrong tokensMinted_team");

    //         let tokensMinted_platform = new BigNumber(await crowdsale.tokensMinted_platform.call());
    //         await crowdsale.manualMint_platform(ACC_2, ONE_FULL_TOKEN);
    //         let tokensMinted_platform_after = new BigNumber(await crowdsale.tokensMinted_platform.call());
    //         let tokensMinted_platform_Diff = tokensMinted_platform_after.minus(tokensMinted_platform).toNumber();
    //         assert.equal(tokensMinted_platform_Diff, 10000, "wrong tokensMinted_platform");

    //         let tokensMinted_airdrops = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
    //         await crowdsale.manualMint_airdrops(ACC_2, ONE_FULL_TOKEN);
    //         let tokensMinted_airdrops_after = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
    //         let tokensMinted_airdrops_Diff = tokensMinted_airdrops_after.minus(tokensMinted_airdrops).toNumber();
    //         assert.equal(tokensMinted_airdrops_Diff, 10000, "wrong tokensMinted_airdrops");

    //         assert.equal(new BigNumber(await token.balanceOf(ACC_2)).toNumber(), 40000, "wrong ACC_2 balance after manual transfers");

    //         //  test purchase calculations
    //         await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

    //         //  stage 1
    //         let currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
    //         assert.equal(currentDiscount, 10, "1 - should be 10%");

    //         let calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(1, "ether"))).toNumber();
    //         assert.equal(calculatedTokenAmount, 5500000000, "1 - should be 5500000000 tokens");

    //         let tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
    //         let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

    //         await crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(1, "ether")
    //         });

    //         assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 5506000000, "1 - wrong balance of ACC_1");

    //         //  minted
    //         let tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

    //         let mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
    //         assert.equal(mintedDiff, 5500000000, "1 - wrong tokensMinted_ICO");

    //         //  available to mint
    //         let tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
    //         let availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

    //         assert.equal(availableToMintDiff, 5500000000, "1 - wrong decrease value for tokensAvailableToMint_ICO");


    //         //  stage 2
    //         await increaseTimeTo((await crowdsale.stageEdges.call(0)).toNumber() + duration.minutes(1));

    //         currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
    //         assert.equal(currentDiscount, 9, "2 - should be 9%");

    //         calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(2, "ether"))).toNumber();
    //         assert.equal(calculatedTokenAmount, 10900000000, "1 - should be 10900000000 tokens");

    //         tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
    //         tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

    //         await crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(2, "ether")
    //         });

    //         assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 16406000000, "2 - wrong balance of ACC_1");

    //         //  minted
    //         tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

    //         mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
    //         assert.equal(mintedDiff, 10900000000, "2 - wrong tokensMinted_ICO");

    //         //  available to mint
    //         tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
    //         availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

    //         assert.equal(availableToMintDiff, 10900000000, "2 - wrong decrease value for tokensAvailableToMint_ICO");


    //         //  stage 3
    //         await increaseTimeTo((await crowdsale.stageEdges.call(1)).toNumber() + duration.minutes(1));

    //         currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
    //         assert.equal(currentDiscount, 8, "3 - should be 8%");

    //         calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(3, "ether"))).toNumber();
    //         assert.equal(calculatedTokenAmount, 16200000000, "3 - should be 16200000000 tokens");

    //         tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
    //         tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

    //         await crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(3, "ether")
    //         });

    //         assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 32606000000, "3 - wrong balance of ACC_1");

    //         //  minted
    //         tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

    //         mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
    //         assert.equal(mintedDiff, 16200000000, "3 - wrong tokensMinted_ICO");

    //         //  available to mint
    //         tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
    //         availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

    //         assert.equal(availableToMintDiff, 16200000000, "3 - wrong decrease value for tokensAvailableToMint_ICO");

    //         console.log("ACC_2    4: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());

    //         //  exceed limit
    //         await crowdsale.sendTransaction({
    //             from: ACC_2,
    //             value: web3.toWei(99, "ether")
    //         });

    //         await expectThrow(crowdsale.sendTransaction({
    //             from: ACC_1,
    //             value: web3.toWei(88, "ether")
    //         }), "should not exceed purchase limit");
    //     });
    // });
});

// contract("IMP_Crowdsale - ICO minting limits", (accounts) => {
//   const ACC_1 = accounts[1];
//   const ACC_2 = accounts[2];

//   let token;
//   let crowdsaleSharedLedger;
//   let crowdsale;

//   before('setup', async () => {
//     const CROWDSALE_WALLET = accounts[4];
//     const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + duration.days(16);

//     let timings = [];
//     for (let i = 0; i < 7; i++) {
//       timings[i] = CROWDSALE_OPENING + duration.hours(i);
//     }

//     let mockToken = MockToken.getMock();
//     let mockCrowdsale = MockCrowdsale.getMock();

//     token = await IMP_Token.new(mockToken.tokenName, mockToken.tokenSymbol, mockToken.tokenDecimals);
//     crowdsaleSharedLedger = await IMP_CrowdsaleSharedLedger.new(token.address, mockCrowdsale.crowdsaleTotalSupplyLimit, [mockCrowdsale.tokenPercentageReservedPreICO, mockCrowdsale.tokenPercentageReservedICO, mockCrowdsale.tokenPercentageReservedTeam, mockCrowdsale.tokenPercentageReservedPlatform, mockCrowdsale.tokenPercentageReservedAirdrops], mockCrowdsale.crowdsaleSoftCapETH, CROWDSALE_WALLET);
//     crowdsale = await IMP_Crowdsale.new(token.address, crowdsaleSharedLedger.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth, timings, mockCrowdsale.crowdsalePreICODiscounts);

//     await crowdsaleSharedLedger.transferOwnership(crowdsale.address);
//     await token.transferOwnership(crowdsale.address);

//     increaseTimeTo(CROWDSALE_OPENING + duration.minutes(1));

//     await Reverter.snapshot();
//   });

//   afterEach('revert', async () => {
//     await Reverter.revert();
//   });

//   describe("validate correct calculations while ICO minting", () => {
//     const ONE_FULL_TOKEN = 10000;

//     it("should decrease ICO", async () => {
//       console.log("ACC_2    3: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());
//       await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

//       await crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(5, "ether")
//       });
//       // let tokensMinted_purchasePreICO = new BigNumber(await crowdsale.tokensMinted_purchase.call());

//       //  finalize preICO and move to ICO period
//       let closing = new BigNumber(await crowdsale.closingTime.call());
//       await increaseTimeTo(closing.plus(duration.minutes(1)));

//       //  tx to finish preICO
//       await crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(5, "ether")
//       });

//       //  new contract for ICO
//       const CROWDSALE_WALLET = accounts[4];
//       const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + duration.minutes(18);

//       let timings = [];
//       for (let i = 0; i < 4; i++) {
//         timings[i] = CROWDSALE_OPENING + duration.hours(i);
//       }

//       let mockCrowdsale = MockCrowdsale.getMock();
//       crowdsale = await IMP_Crowdsale.new(token.address, crowdsaleSharedLedger.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth * 5000, timings, mockCrowdsale.crowdsaleICODiscounts);

//       await crowdsaleSharedLedger.transferOwnership(crowdsale.address);
//       await token.transferOwnership(crowdsale.address);
//       increaseTimeTo(CROWDSALE_OPENING);


//       //  test manual mintings
//       let tokensMinted_team = new BigNumber(await crowdsale.tokensMinted_team.call());
//       await crowdsale.manualMint_team(ACC_2, ONE_FULL_TOKEN * 2);
//       let tokensMinted_team_after = new BigNumber(await crowdsale.tokensMinted_team.call());
//       let tokensMinted_team_Diff = tokensMinted_team_after.minus(tokensMinted_team).toNumber();
//       assert.equal(tokensMinted_team_Diff, 20000, "wrong tokensMinted_team");

//       let tokensMinted_platform = new BigNumber(await crowdsale.tokensMinted_platform.call());
//       await crowdsale.manualMint_platform(ACC_2, ONE_FULL_TOKEN);
//       let tokensMinted_platform_after = new BigNumber(await crowdsale.tokensMinted_platform.call());
//       let tokensMinted_platform_Diff = tokensMinted_platform_after.minus(tokensMinted_platform).toNumber();
//       assert.equal(tokensMinted_platform_Diff, 10000, "wrong tokensMinted_platform");

//       let tokensMinted_airdrops = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
//       await crowdsale.manualMint_airdrops(ACC_2, ONE_FULL_TOKEN);
//       let tokensMinted_airdrops_after = new BigNumber(await crowdsale.tokensMinted_airdrops.call());
//       let tokensMinted_airdrops_Diff = tokensMinted_airdrops_after.minus(tokensMinted_airdrops).toNumber();
//       assert.equal(tokensMinted_airdrops_Diff, 10000, "wrong tokensMinted_airdrops");

//       assert.equal(new BigNumber(await token.balanceOf(ACC_2)).toNumber(), 40000, "wrong ACC_2 balance after manual transfers");

//       //  test purchase calculations
//       await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);

//       //  stage 1
//       let currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
//       assert.equal(currentDiscount, 10, "1 - should be 10%");

//       let calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(1, "ether"))).toNumber();
//       assert.equal(calculatedTokenAmount, 5500000000, "1 - should be 5500000000 tokens");

//       let tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
//       let tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

//       await crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(1, "ether")
//       });

//       assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 5506000000, "1 - wrong balance of ACC_1");

//       //  minted
//       let tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

//       let mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
//       assert.equal(mintedDiff, 5500000000, "1 - wrong tokensMinted_ICO");

//       //  available to mint
//       let tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
//       let availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

//       assert.equal(availableToMintDiff, 5500000000, "1 - wrong decrease value for tokensAvailableToMint_ICO");


//       //  stage 2
//       await increaseTimeTo((await crowdsale.stageEdges.call(0)).toNumber() + duration.minutes(1));

//       currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
//       assert.equal(currentDiscount, 9, "2 - should be 9%");

//       calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(2, "ether"))).toNumber();
//       assert.equal(calculatedTokenAmount, 10900000000, "1 - should be 10900000000 tokens");

//       tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
//       tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

//       await crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(2, "ether")
//       });

//       assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 16406000000, "2 - wrong balance of ACC_1");

//       //  minted
//       tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

//       mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
//       assert.equal(mintedDiff, 10900000000, "2 - wrong tokensMinted_ICO");

//       //  available to mint
//       tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
//       availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

//       assert.equal(availableToMintDiff, 10900000000, "2 - wrong decrease value for tokensAvailableToMint_ICO");


//       //  stage 3
//       await increaseTimeTo((await crowdsale.stageEdges.call(1)).toNumber() + duration.minutes(1));

//       currentDiscount = new BigNumber(await crowdsale.currentDiscount.call()).toNumber();
//       assert.equal(currentDiscount, 8, "3 - should be 8%");

//       calculatedTokenAmount = new BigNumber(await crowdsale.calculateTokenAmount.call(web3.toWei(3, "ether"))).toNumber();
//       assert.equal(calculatedTokenAmount, 16200000000, "3 - should be 16200000000 tokens");

//       tokensMinted_purchase = new BigNumber(await crowdsale.tokensMinted_purchase.call());
//       tokensAvailableToMint_purchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());

//       await crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(3, "ether")
//       });

//       assert.equal(new BigNumber(await token.balanceOf.call(ACC_1)).toNumber(), 32606000000, "3 - wrong balance of ACC_1");

//       //  minted
//       tokensMinted_purchase_after = new BigNumber(await crowdsale.tokensMinted_purchase.call());

//       mintedDiff = tokensMinted_purchase_after.minus(tokensMinted_purchase).toNumber();
//       assert.equal(mintedDiff, 16200000000, "3 - wrong tokensMinted_ICO");

//       //  available to mint
//       tokensAvailableToMint_purchase_after = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
//       availableToMintDiff = tokensAvailableToMint_purchase.minus(tokensAvailableToMint_purchase_after).toNumber();

//       assert.equal(availableToMintDiff, 16200000000, "3 - wrong decrease value for tokensAvailableToMint_ICO");

//       console.log("ACC_2    4: ", new BigNumber(await web3.eth.getBalance(ACC_2)).toNumber());

//       //  exceed limit
//       await crowdsale.sendTransaction({
//         from: ACC_2,
//         value: web3.toWei(99, "ether")
//       });

//       await expectThrow(crowdsale.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(88, "ether")
//       }), "should not exceed purchase limit");
//     });
//   });
// });