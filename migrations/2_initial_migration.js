let IMP_Token = artifacts.require("./IMP_Token.sol");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale.sol");
let IncreaseTime = require("../test/helpers/increaseTime.js");
let buildTimings = require("../test/helpers/buildTimings.js");

module.exports = (deployer, network, accounts) => {
    //  TODO: change before deploy -- START --

    // 1. TOKEN name, symbol, decimals

    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

    const PRIVATE_PLACEMENT_DISCOUNTS = [50];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    let timings = buildTimings.default(web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1), false);
    let privatePlacementTimings = timings[0];
    let preICOTimings = timings[1];
    let icoTimings = timings[2];

    //  TODO: change before deploy -- END --

    deployer.deploy(IMP_Token).then(async () => {
        let token = await IMP_Token.deployed();

        await deployer.deploy(IMP_Crowdsale, token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET);
        let crowdsale = await IMP_Crowdsale.deployed();
        await token.transferOwnership(crowdsale.address);
        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);
    });

    // buildTimings(1000000000, true);
}