const IMP_Token = artifacts.require('./IMP_Token.sol');
const IMP_Crowdsale = artifacts.require('./IMP_Crowdsale.sol');
const IMP_CrowdsaleSharedLedger = artifacts.require("IMP_CrowdsaleSharedLedger");
const RefundVault = artifacts.require("../node_modules/openzeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol");

const Reverter = require('./helpers/reverter');
const IncreaseTime = require('./helpers/increaseTime');
const expectThrow = require('./helpers/expectThrow');
const MockToken = require('./helpers/MockToken');
const MockCrowdsale = require('./helpers/MockCrowdsale');
var BigNumber = require('bignumber.js');


contract("MP_Crowdsale - refundable", (accounts) => {
  const ACC_1 = accounts[1];
  const ACC_2 = accounts[2];

  const SOFT_CAP_ETH = 2;

  let tokenLocal;
  let crowdsaleSharedLedgerLocal;
  let crowdsaleLocal;

  before('setup', async () => {
    const CROWDSALE_WALLET = accounts[4];
    const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + IncreaseTime.duration.days(17);

    let timings = [];
    for (i = 0; i < 7; i++) {
      timings[i] = CROWDSALE_OPENING + IncreaseTime.duration.hours(i);
    }

    let mockToken = MockToken.getMock();
    let mockCrowdsale = MockCrowdsale.getMock();

    tokenLocal = await IMP_Token.new(mockToken.tokenName, mockToken.tokenSymbol, mockToken.tokenDecimals);
    crowdsaleSharedLedgerLocal = await IMP_CrowdsaleSharedLedger.new(tokenLocal.address, mockCrowdsale.crowdsaleTotalSupplyLimit, [mockCrowdsale.tokenPercentageReservedPreICO, mockCrowdsale.tokenPercentageReservedICO, mockCrowdsale.tokenPercentageReservedTeam, mockCrowdsale.tokenPercentageReservedPlatform, mockCrowdsale.tokenPercentageReservedAirdrops], SOFT_CAP_ETH, CROWDSALE_WALLET);
    crowdsaleLocal = await IMP_Crowdsale.new(tokenLocal.address, crowdsaleSharedLedgerLocal.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth, timings, mockCrowdsale.crowdsalePreICODiscounts);

    await tokenLocal.transferOwnership(crowdsaleLocal.address);
    await crowdsaleSharedLedgerLocal.transferOwnership(crowdsaleLocal.address);

    IncreaseTime.increaseTimeTo(CROWDSALE_OPENING + IncreaseTime.duration.minutes(1));

    await Reverter.snapshot();
  });

  afterEach('revert', async () => {
    await Reverter.revert();
  });

  describe("refundable functional", () => {
    it("should test refunds are not allowed if soft cap reached", async () => {
      await crowdsaleLocal.addToWhitelist(ACC_1);

      await crowdsaleLocal.sendTransaction({
        from: ACC_1,
        value: web3.toWei(SOFT_CAP_ETH, "ether")
      });

      //  finalize preICO and move to ICO period
      let closing = new BigNumber(await crowdsaleLocal.closingTime.call());
      await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));
      await crowdsaleLocal.finalize();

      //  new contract for ICO
      const CROWDSALE_WALLET = accounts[4];
      const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + IncreaseTime.duration.minutes(3);

      let timings = [];
      for (i = 0; i < 4; i++) {
        timings[i] = CROWDSALE_OPENING + IncreaseTime.duration.hours(i);
      }

      let mockCrowdsale = MockCrowdsale.getMock();
      crowdsaleLocal = await IMP_Crowdsale.new(tokenLocal.address, crowdsaleSharedLedgerLocal.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth * 5000, timings, mockCrowdsale.crowdsaleICODiscounts);

      closing = new BigNumber(await crowdsaleLocal.closingTime.call());

      await crowdsaleSharedLedgerLocal.transferOwnership(crowdsaleLocal.address);
      await tokenLocal.transferOwnership(crowdsaleLocal.address);
      await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));

      await expectThrow(crowdsaleLocal.claimRefund({
        from: ACC_1
      }), "not yet finalized, so can not claim refund");

      await crowdsaleLocal.finalize();

      //  after crowdsale finished
      await assert.isTrue(await crowdsaleLocal.softCapReached.call(), "soft cap should be reached");
      await assert.isFalse(await crowdsaleLocal.refundsEnabled.call(), "refunds should be disabled now");

      await expectThrow(crowdsaleLocal.claimRefund({
        from: ACC_1
      }), "soft cap was, so can not claim refund");
    });

    it("should test refunds if soft cap not reached", async () => {
      await crowdsaleLocal.addToWhitelist(ACC_1);

      await crowdsaleLocal.sendTransaction({
        from: ACC_1,
        value: web3.toWei(1, "ether")
      });

      //  finalize preICO and move to ICO period
      let closing = new BigNumber(await crowdsaleLocal.closingTime.call());
      await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));
      await crowdsaleLocal.finalize();

      //  new contract for ICO
      const CROWDSALE_WALLET = accounts[4];
      const CROWDSALE_OPENING = web3.eth.getBlock('latest').timestamp + IncreaseTime.duration.minutes(3);

      let timings = [];
      for (i = 0; i < 4; i++) {
        timings[i] = CROWDSALE_OPENING + IncreaseTime.duration.hours(i);
      }

      let mockCrowdsale = MockCrowdsale.getMock();
      crowdsaleLocal = await IMP_Crowdsale.new(tokenLocal.address, crowdsaleSharedLedgerLocal.address, CROWDSALE_WALLET, mockCrowdsale.crowdsaleRateEth * 5000, timings, mockCrowdsale.crowdsaleICODiscounts);

      closing = new BigNumber(await crowdsaleLocal.closingTime.call());

      await crowdsaleSharedLedgerLocal.transferOwnership(crowdsaleLocal.address);
      await tokenLocal.transferOwnership(crowdsaleLocal.address);
      await IncreaseTime.increaseTimeTo(closing.plus(IncreaseTime.duration.minutes(1)));

      await crowdsaleLocal.finalize();

      //  after crowdsale finished
      await assert.isFalse(await crowdsaleLocal.softCapReached.call(), "soft cap should not be reached");
      await assert.isTrue(await crowdsaleLocal.refundsEnabled.call(), "refunds should be enabled now");

      let vault = RefundVault.at(await crowdsaleSharedLedgerLocal.vault.call());

      let depositedBefore = new BigNumber(await vault.deposited.call(ACC_1)).toNumber();
      // console.log("depositedBefore ACC_1: ", depositedBefore);
      let balanceBefore = new BigNumber(await web3.eth.getBalance(ACC_1));
      // console.log("balanceBefore: ", balanceBefore.toNumber());

      let tx = await crowdsaleSharedLedgerLocal.claimRefund({
        from: ACC_1
      });
      // console.log(tx);

      let gasUsed = new BigNumber(tx.receipt.gasUsed);
      // console.log("gasUsed: ", gasUsed);

      let txx = await web3.eth.getTransaction(tx.tx);
      // console.log(txx);

      let gasPrice = new BigNumber(txx.gasPrice);
      // console.log("gasPrice: ", gasPrice);

      let ethUsed = gasUsed.multipliedBy(gasPrice).toNumber();
      // console.log("ethUsed: ", ethUsed);

      let depositedAfter = new BigNumber(await vault.deposited.call(ACC_1)).toNumber();
      // console.log("depositedAfter ACC_1: ", depositedAfter);
      let balanceAfter = new BigNumber(await web3.eth.getBalance(ACC_1));
      // console.log("balanceAfter: ", balanceAfter.toNumber());

      assert.equal(balanceAfter.toNumber(), balanceBefore.plus(depositedBefore).minus(ethUsed).toNumber(), "wrong ACC_1 balance after refund");


    });
  });
});