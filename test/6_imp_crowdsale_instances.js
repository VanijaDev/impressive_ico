// let IMP_Token = artifacts.require("./IMP_Token");
// let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale");
// let IMP_sharedLedger = artifacts.require("./IMP_crowdsaleSharedLedger");
// let BigNumber = require('bignumber.js');

// import mockToken from "./helpers/mocks/mockToken";
// import mockCrowdsale from "./helpers/mocks/mockCrowdsale";
// import expectThrow from './helpers/expectThrow';
// import ether from "./helpers/ether";

// import {
//     duration,
//     increaseTimeTo
// } from './helpers/increaseTime';
// import latestTime from './helpers/latestTime';

// import {
//     advanceBlock
// } from './helpers/advanceToBlock';


// contract("IMP_Crowdsale - test preICO purchase limits", (accounts) => {
//     let crowdsale;

//     const ACC_1 = accounts[1];
//     const ACC_2 = accounts[2];

//     before("setup", async () => {
//         await advanceBlock();
//     });

//     beforeEach("create crowdsale inst", async function () {
//         let mockTokenData = mockToken();
//         let mockCrowdsaleData = mockCrowdsale();

//         const CROWDSALE_WALLET = accounts[9];

//         let openingTime = latestTime() + duration.minutes(1);
//         let timings = []; //  [opening, stageEdges]
//         for (let i = 0; i < 7; i++) {
//             timings[i] = openingTime + duration.weeks(i);
//         }

//         let token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
//         let sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
//         crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

//         await token.transferOwnership(crowdsale.address);
//         await sharedLedger.transferOwnership(crowdsale.address);

//         increaseTimeTo(openingTime);
//         await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);
//     });

//     describe("validate token mint limits", () => {
//         it("should validate can not mint more tnan preICO limit", async () => {
//             // let maxTokens = new BigNumber(await crowdsale.tokenLimitReserved_purchase.call()).toNumber();

//             // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());
//             await crowdsale.sendTransaction({
//                 from: ACC_1,
//                 value: ether(30)
//             });
//             // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());

//             await crowdsale.sendTransaction({
//                 from: ACC_2,
//                 value: ether(20)
//             });
//             // console.log("freeForPurchase: ", (await crowdsale.tokensAvailableToMint_purchase.call()).toFixed());

//             await expectThrow(crowdsale.sendTransaction({
//                 from: ACC_2,
//                 value: ether(1)
//             }), "should throw, because exceeds maximum limit");
//         });
//     });

//     //  Note: ICO minitng limits tested in 7_imp_discount_crowdsale.js
// });

// contract("IMP_Crowdsale - test finalization calculations", (accounts) => {
//     let token;
//     let crowdsale;
//     let sharedLedger;

//     const ACC_1 = accounts[1];
//     const ACC_2 = accounts[2];

//     before("setup", async () => {
//         await advanceBlock();
//     });

//     beforeEach("create crowdsale inst", async function () {
//         let mockTokenData = mockToken();
//         let mockCrowdsaleData = mockCrowdsale();

//         const CROWDSALE_WALLET = accounts[9];

//         let openingTime = latestTime() + duration.minutes(1);
//         let timings = []; //  [opening, stageEdges]
//         for (let i = 0; i < 7; i++) {
//             timings[i] = openingTime + duration.weeks(i);
//         }

//         token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
//         sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], mockCrowdsaleData.crowdsaleSoftCapETH, CROWDSALE_WALLET);
//         crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

//         await token.transferOwnership(crowdsale.address);
//         await sharedLedger.transferOwnership(crowdsale.address);

//         increaseTimeTo(openingTime);
//         await crowdsale.addManyToWhitelist([ACC_1, ACC_2]);
//     });

//     describe("validate finalize function", () => {
//         it("should validate limits are being recalculated after finalization", async () => {
//             //  1. purchase
//             await crowdsale.sendTransaction({
//                 from: ACC_1,
//                 value: web3.toWei(90, 'ether') //  == 180 000 0000 tokens
//             });

//             // 2. team
//             const teamSent = new BigNumber(50000000); //  5000
//             await crowdsale.manualMint_team(ACC_2, teamSent.toNumber());


//             //  3. platform
//             const platformSent = new BigNumber(40000000); //  4000
//             await crowdsale.manualMint_platform(ACC_2, platformSent.toNumber());


//             //  4. airdrops
//             const airdropsSent = new BigNumber(30000000); //  3000
//             await crowdsale.manualMint_airdrops(ACC_2, airdropsSent.toNumber());

//             let unspentPurchase = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call()); //  currently preICO
//             let unspentTeam = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());
//             let unspentPlatform = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());
//             let unspentAirdrops = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());
//             let unspentPurchase_ICO = new BigNumber(await sharedLedger.tokenLimitReserved_ico.call());
//             // console.log("unspentPurchase: ", unspentPurchase.toNumber());
//             // console.log("unspentTeam: ", unspentTeam.toNumber());
//             // console.log("unspentPlatform: ", unspentPlatform.toNumber());
//             // console.log("unspentAirdrops: ", unspentAirdrops.toNumber());
//             // console.log("unspentPurchase_ICO: ", unspentPurchase_ICO.toNumber());

//             let closing = new BigNumber(await crowdsale.closingTime.call());
//             await increaseTimeTo(closing.plus(duration.minutes(1)));

//             // tx to finalize preICO
//             assert.isFalse(await crowdsale.isFinalized.call(), "should not be finalized yet");
//             let finalizePreICOTx = await crowdsale.sendTransaction({
//                 from: ACC_1,
//                 value: web3.toWei(1, 'ether') //  == 180 000 0000 tokens
//             });
//             await assert.equal(web3.eth.getCode(crowdsale.address), 0, "crowdsale should not exist");

//             // event
//             let logs = finalizePreICOTx.logs;
//             // console.log(logs);
//             assert.equal(logs.length, 3, "finalizePreICOTx should have 3 events");
//             let finalizeEvent = logs[0];
//             let finalizeEventName = finalizeEvent.event;
//             assert.equal(finalizeEventName, "FinalizedWithResults");

//             //  new contract for ICO
//             const CROWDSALE_WALLET = accounts[9];
//             const CROWDSALE_OPENING = latestTime() + duration.days(8);

//             let timings = [];
//             for (let i = 0; i < 4; i++) {
//                 timings[i] = CROWDSALE_OPENING + duration.hours(i);
//             }

//             let mockCrowdsaleData = mockCrowdsale();

//             crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsaleICODiscounts);

//             await sharedLedger.transferOwnership(crowdsale.address);
//             await token.transferOwnership(crowdsale.address);

//             let unspentPurchaseUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_purchase.call());
//             let unspentTeamUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_team.call());
//             let unspentPlatformUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_platform.call());
//             let unspentAirdropsUpdated = new BigNumber(await crowdsale.tokensAvailableToMint_airdrops.call());
//             // console.log("\n\n\nunspentPurchaseUpdated: ", unspentPurchaseUpdated.toNumber());
//             // console.log("unspentTeamUpdated: ", unspentTeamUpdated.toNumber());
//             // console.log("unspentPlatformUpdated: ", unspentPlatformUpdated.toNumber());
//             // console.log("unspentAirdropsUpdated: ", unspentAirdropsUpdated.toNumber());

//             //  test ICO values
//             assert.equal(unspentPurchaseUpdated.toNumber(), unspentPurchase_ICO.plus(unspentPurchase).toNumber(), "wrong token purchase limit for ICO");
//             assert.equal(unspentTeamUpdated.toNumber(), unspentTeam.toNumber(), "wrong token purchase limit for team");
//             assert.equal(unspentPlatformUpdated.toNumber(), unspentPlatform.toNumber(), "wrong token purchase limit for platform");
//             assert.equal(unspentAirdropsUpdated.toNumber(), unspentAirdrops.toNumber(), "wrong token purchase limit for airdrops");
//         });
//     });
// });


// //  test ./test/6_imp_crowdsale_instanses.js
// contract("MP_Crowdsale - soft cap REACHED", (accounts) => {
//     const ACC_1 = accounts[1];
//     const CROWDSALE_WALLET = accounts[9];

//     const SOFT_CAP_ETH = 2;

//     let token;
//     let sharedLedger;
//     let crowdsale;
//     let walletFundsBefore;

//     before('setup', async () => {
//         const CROWDSALE_WALLET = accounts[9];
//         let CROWDSALE_OPENING = latestTime() + duration.days(10);

//         walletFundsBefore = new BigNumber(await web3.eth.getBalance(CROWDSALE_WALLET));

//         let timings = [];
//         for (let i = 0; i < 7; i++) {
//             timings[i] = CROWDSALE_OPENING + duration.hours(i);
//         }

//         let mockTokenData = mockToken();
//         let mockCrowdsaleData = mockCrowdsale();

//         token = await IMP_Token.new(mockTokenData.tokenName, mockTokenData.tokenSymbol, mockTokenData.tokenDecimals);
//         sharedLedger = await IMP_sharedLedger.new(token.address, mockCrowdsaleData.crowdsaleTotalSupplyLimit, [mockCrowdsaleData.tokenPercentageReservedPreICO, mockCrowdsaleData.tokenPercentageReservedICO, mockCrowdsaleData.tokenPercentageReservedTeam, mockCrowdsaleData.tokenPercentageReservedPlatform, mockCrowdsaleData.tokenPercentageReservedAirdrops], SOFT_CAP_ETH, CROWDSALE_WALLET);
//         crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth, timings, mockCrowdsaleData.crowdsalePreICODiscounts);

//         await token.transferOwnership(crowdsale.address);
//         await sharedLedger.transferOwnership(crowdsale.address);

//         increaseTimeTo(CROWDSALE_OPENING + duration.minutes(1));

//         await crowdsale.addToWhitelist(ACC_1);
//         await crowdsale.sendTransaction({
//             from: ACC_1,
//             value: web3.toWei(SOFT_CAP_ETH, "ether")
//         });

//         //  finalize preICO and move to ICO period
//         let closing = new BigNumber(await crowdsale.closingTime.call());
//         await increaseTimeTo(closing.plus(duration.minutes(1)));

//         //  tx to finish preICO
//         await crowdsale.sendTransaction({
//             from: ACC_1,
//             value: web3.toWei(1, "ether")
//         });

//         //  new contract for ICO
//         CROWDSALE_OPENING = latestTime() + duration.minutes(12);

//         timings = [];
//         for (let i = 0; i < 4; i++) {
//             timings[i] = CROWDSALE_OPENING + duration.hours(i);
//         }

//         crowdsale = await IMP_Crowdsale.new(token.address, sharedLedger.address, CROWDSALE_WALLET, mockCrowdsaleData.crowdsaleRateEth * 5000, timings, mockCrowdsaleData.crowdsaleICODiscounts);

//         closing = new BigNumber(await crowdsale.closingTime.call());

//         await sharedLedger.transferOwnership(crowdsale.address);
//         await token.transferOwnership(crowdsale.address);
//         await increaseTimeTo(closing.plus(duration.minutes(1)));

//         await Reverter.snapshot();
//     });

//     describe("tests for soft cap reached", () => {
//         it("should check crowdsale and sharedLedged were destroyed", async () => {
//             //  tx to finish preICO
//             await crowdsale.sendTransaction({
//                 from: ACC_1,
//                 value: web3.toWei(1, "ether")
//             });

//             await assert.equal(web3.eth.getCode(crowdsale.address), 0, "crowdsale should not exist");
//             await assert.equal(web3.eth.getCode(sharedLedger.address), 0, "sharedLedger should not exist");
//         });

//         it("should check funds were transfered to wallet", async () => {
//             let raised = new BigNumber(await crowdsale.crowdsaleWeiRaised.call());

//             //  tx to finish preICO
//             await crowdsale.sendTransaction({
//                 from: ACC_1,
//                 value: web3.toWei(1, "ether")
//             });

//             assert.equal(new BigNumber(await web3.eth.getBalance(CROWDSALE_WALLET)).toNumber(), walletFundsBefore.plus(raised).toNumber(), "wrong wallet balance after crowdsale finished");
//         });
//     });
// });