let IMP_Token = artifacts.require("./IMP_Token.sol");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale.sol");
let IncreaseTime = require("../test/helpers/increaseTime.js");


module.exports = (deployer, network, accounts) => {
    //  TODO: change before deploy -- START --

    // 1. TOKEN name, symbol, decimals

    const CROWDSALE_WALLET = accounts[9];

    const PRIVATE_PLACEMENT_DISCOUNTS = [30];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12, 10]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    let privatePlacementTimings = [web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1), web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1) + IncreaseTime.duration.weeks(1)];

    let preICOOpening = privatePlacementTimings[privatePlacementTimings.length - 1] + IncreaseTime.duration.minutes(1);
    let preICOTimings = []; //  [opening, stageEdges]
    for (i = 0; i < PRE_ICO_DISCOUNTS.length + 1; i++) {
        preICOTimings[i] = preICOOpening + IncreaseTime.duration.weeks(i);
    }

    let icoOpening = preICOTimings[preICOTimings.length - 1] + IncreaseTime.duration.weeks(2);
    let icoTimings = []; //  [opening, stageEdges]
    for (i = 0; i < ICO_DISCOUNTS.length + 1; i++) {
        icoTimings[i] = icoOpening + IncreaseTime.duration.weeks(i);
    }
    //  TODO: change before deploy -- END --

    deployer.deploy(IMP_Token).then(async () => {
        let token = await IMP_Token.deployed();

        await deployer.deploy(IMP_Crowdsale, token.address, CROWDSALE_WALLET);
        let crowdsale = await IMP_Crowdsale.deployed();
        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

        await token.transferOwnership(crowdsale.address);
    });
}