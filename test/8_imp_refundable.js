// const IMP_Token = artifacts.require('./IMP_Token.sol');
// const IMP_Crowdsale = artifacts.require('./IMP_Crowdsale.sol');
// const IMP_CrowdsaleSharedLedger = artifacts.require("IMP_CrowdsaleSharedLedger");

// const Reverter = require('./helpers/reverter');
// const IncreaseTime = require('./helpers/increaseTime');
// const MockToken = require('./helpers/MockToken');
// const MockCrowdsale = require('./helpers/MockCrowdsale');
// var BigNumber = require('bignumber.js');


// contract("MP_Crowdsale - refundable, soft cap NOT REACHED", (accounts) => {
//   const SOFT_CAP_ETH = 2;
//   const ACC_1 = accounts[1];
//   const ACC_2 = accounts[2];
//   const ACC_3 = accounts[3];

//   const ACC_1_ETH_SEND = SOFT_CAP_ETH / 2;
//   const ACC_2_ETH_SEND = SOFT_CAP_ETH / 4;

//   let tokenLocal;
//   let crowdsaleSharedLedgerLocal;
//   let crowdsaleLocal;

//   before('setup', async () => {
//     const CROWDSALE_WALLET = accounts[4];
//     let CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + IncreaseTime.duration.days(20);

//     let timings = [];
//     for (i = 0; i < 7; i++) {
//       timings[i] = CROWDSALE_OPENING + IncreaseTime.duration.hours(i);
//     }

//     let mockToken = MockToken.getMock();
//     let mockCrowdsale = MockCrowdsale.getMock();

//     tokenLocal = await IMP_Token.new(mockToken.tokenName, mockToken.tokenSymbol, mockToken.tokenDecimals);
//     crowdsaleSharedLedgerLocal = await IMP_CrowdsaleSharedLedger.new(tokenLocal.address, mockCrowdsale.crowdsaleTotalSupplyLimit, [mockCrowdsale.tokenPercentageReservedPreICO, mockCrowdsale.tokenPercentageReservedICO, mockCrowdsale.tokenPercentageReservedTeam, mockCrowdsale.tokenPercentageReservedPlatform, mockCrowdsale.tokenPercentageReservedAirdrops], SOFT_CAP_ETH, CROWDSALE_WALLET);
//     crowdsaleLocal = await IMP_Crowdsale.new(tokenLocal.address, crowdsaleSharedLedgerLocal.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth, timings, mockCrowdsale.crowdsalePreICODiscounts);

//     await tokenLocal.transferOwnership(crowdsaleLocal.address);
//     await crowdsaleSharedLedgerLocal.transferOwnership(crowdsaleLocal.address);

//     IncreaseTime.increaseTimeTo(CROWDSALE_OPENING + IncreaseTime.duration.minutes(1));

//     await crowdsaleLocal.addManyToWhitelist([ACC_1, ACC_2, ACC_3]);

//     await crowdsaleLocal.sendTransaction({
//       from: ACC_1,
//       value: web3.toWei(ACC_1_ETH_SEND, "ether")
//     });

//     await crowdsaleLocal.sendTransaction({
//       from: ACC_2,
//       value: web3.toWei(ACC_2_ETH_SEND, "ether")
//     });

//     //  finalize preICO and move to ICO period
//     let closing = new BigNumber(await crowdsaleLocal.closingTime.call());
//     await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));

//     //  tx to finish preICO
//     await crowdsaleLocal.sendTransaction({
//       from: ACC_3,
//       value: web3.toWei(1, "ether")
//     });

//     //  new contract for ICO
//     CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + IncreaseTime.duration.days(26);
//     timings = [];
//     for (i = 0; i < 4; i++) {
//       timings[i] = CROWDSALE_OPENING + IncreaseTime.duration.hours(i);
//     }

//     crowdsaleLocal = await IMP_Crowdsale.new(tokenLocal.address, crowdsaleSharedLedgerLocal.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth * 5000, timings, mockCrowdsale.crowdsaleICODiscounts);

//     closing = new BigNumber(await crowdsaleLocal.closingTime.call());

//     await crowdsaleSharedLedgerLocal.transferOwnership(crowdsaleLocal.address);
//     await tokenLocal.transferOwnership(crowdsaleLocal.address);
//     await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));

//     await Reverter.snapshot();
//   });

//   afterEach('revert', async () => {
//     await Reverter.revert();
//   });

//   describe("tests for soft cap not reached", () => {
//     it("should check funds transferred back to address, which finalized crowdsale", async () => {
//       let balanceBefore = new BigNumber(await web3.eth.getBalance(ACC_1));

//       //  tx to finish preICO
//       let tx = await crowdsaleLocal.sendTransaction({
//         from: ACC_1,
//         value: web3.toWei(40, "ether")
//       });

//       let gasUsed = new BigNumber(tx.receipt.gasUsed);
//       // console.log("gasUsed: ", gasUsed);

//       let txx = await web3.eth.getTransaction(tx.tx);
//       // console.log(txx);

//       let gasPrice = new BigNumber(txx.gasPrice);
//       // console.log("gasPrice: ", gasPrice);

//       let ethUsed = gasUsed.multipliedBy(gasPrice);
//       // console.log("ethUsed: ", ethUsed);

//       assert.equal(new BigNumber(await web3.eth.getBalance(ACC_1)).toNumber(), balanceBefore.minus(ethUsed).toNumber(), "wrong balance after finishable tx");
//     });

//     // it("should check refunds", async () => {
//     //   //  tx to finish preICO
//     //   await crowdsaleLocal.sendTransaction({
//     //     from: ACC_3,
//     //     value: web3.toWei(1, "ether")
//     //   });

//     //   //  ACC_1
//     //   let beforeClaim_ACC_1 = new BigNumber(await web3.eth.getBalance(ACC_1));
//     //   let tx_claim_ACC_1 = await crowdsaleSharedLedgerLocal.claimRefund({
//     //     from: ACC_1
//     //   });
//     //   let afterClaim_ACC_1 = new BigNumber(await web3.eth.getBalance(ACC_1));

//     //   let txx = await web3.eth.getTransaction(tx_claim_ACC_1.tx);
//     //   let ethUsed = new BigNumber(tx_claim_ACC_1.receipt.gasUsed).multipliedBy(new BigNumber(txx.gasPrice));
//     //   assert.equal(afterClaim_ACC_1.toNumber(), beforeClaim_ACC_1.minus(ethUsed).plus(web3.toWei(ACC_1_ETH_SEND, "ether")).toNumber(), "wrong ACC_1 balance after refund");

//     //   //  ACC_2
//     //   let beforeClaim_ACC_2 = new BigNumber(await web3.eth.getBalance(ACC_2));
//     //   let tx_claim_ACC_2 = await crowdsaleSharedLedgerLocal.claimRefund({
//     //     from: ACC_2
//     //   });
//     //   let afterClaim_ACC_2 = new BigNumber(await web3.eth.getBalance(ACC_2));

//     //   txx = await web3.eth.getTransaction(tx_claim_ACC_2.tx);
//     //   ethUsed = new BigNumber(tx_claim_ACC_2.receipt.gasUsed).multipliedBy(new BigNumber(txx.gasPrice));
//     //   assert.equal(afterClaim_ACC_2.toNumber(), beforeClaim_ACC_2.minus(ethUsed).plus(web3.toWei(ACC_2_ETH_SEND, "ether")).toNumber(), "wrong ACC_2 balance after refund");

//     // });
//   });
// });