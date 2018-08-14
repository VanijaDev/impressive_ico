let IMP_Token = artifacts.require("./IMP_Token.sol");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale.sol");
let IMP_CrowdsaleSharedLedger = artifacts.require("IMP_CrowdsaleSharedLedger");
let IncreaseTime = require("../test/helpers/increaseTime.js");

/**
 * IMPORTANT: 
 */

module.exports = (deployer, network, accounts) => {
    const TOKEN_NAME = "Impressive Token";
    const TOKEN_SYMBOL = "IMP"; //  TODO: change before deploy
    const TOKEN_DECIMALS = 4;

    const CROWDSALE_WALLET = accounts[9]; //  TODO: change before deploy
    const CROWDSALE_TOTAL_SUPPLY_LIMIT = 100000000; //  no decimals
    const CROWDSALE_RATE_ETH = 100; // tokens per ETH, no decimals, TODO: change before deploy
    const CROWDSALE_SOFT_CAP_ETH = 15000; //  in ETH

    let opening = web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1);
    let timings = []; //  [opening, stageEdges]
    for (i = 0; i < 7; i++) {
        timings[i] = opening + IncreaseTime.duration.weeks(i);
    }

    const TOKEN_PERCENTAGE_RESERVED_PRE_ICO = 30;
    const TOKEN_PERCENTAGE_RESERVED_ICO = 44;
    const TOKEN_PERCENTAGE_RESERVED_TEAM = 18;
    const TOKEN_PERCENTAGE_RESERVED_PLATFORM = 5;
    const TOKEN_PERCENTAGE_RESERVED_AIRDROPS = 2;

    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12, 10]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3]; //  including each edge

    // console.log(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS);
    // console.log(CROWDSALE_WALLET, CROWDSALE_TOTAL_SUPPLY_LIMIT, CROWDSALE_RATE_ETH, CROWDSALE_SOFT_CAP_ETH);
    // console.log(timings);

    deployer.deploy(IMP_Token, TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS).then(async () => {
        let token = await IMP_Token.deployed();

        await deployer.deploy(IMP_CrowdsaleSharedLedger, token.address, CROWDSALE_TOTAL_SUPPLY_LIMIT, [TOKEN_PERCENTAGE_RESERVED_PRE_ICO, TOKEN_PERCENTAGE_RESERVED_ICO, TOKEN_PERCENTAGE_RESERVED_TEAM, TOKEN_PERCENTAGE_RESERVED_PLATFORM, TOKEN_PERCENTAGE_RESERVED_AIRDROPS], CROWDSALE_SOFT_CAP_ETH, CROWDSALE_WALLET);
        let sharedLedger = await IMP_CrowdsaleSharedLedger.deployed();

        await deployer.deploy(IMP_Crowdsale, token.address, sharedLedger.address, CROWDSALE_WALLET, CROWDSALE_RATE_ETH, timings, PRE_ICO_DISCOUNTS);
        let crowdsale = await IMP_Crowdsale.deployed();

        //  transfer ownership to crowdsale contract
        await token.transferOwnership(crowdsale.address);
        await sharedLedger.transferOwnership(crowdsale.address);
    });
}