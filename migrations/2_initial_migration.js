let IMP_Token = artifacts.require("./IMP_Token.sol");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale.sol");
let IncreaseTime = require("../test/helpers/increaseTime.js");


module.exports = (deployer, network, accounts) => {
    //  TODO: change before deploy -- START --

    // 1. TOKEN name, symbol, decimals

    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW = accounts[8];

    const PRIVATE_PLACEMENT_DISCOUNTS = [30];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12, 10]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    let privatePlacementTimings = [web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1), web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1) + IncreaseTime.duration.weeks(1)];

    let preICOTimings = [privatePlacementTimings[privatePlacementTimings.length - 1] + IncreaseTime.duration.minutes(1)]; //  [opening, stageEdges]
    for (i = 0; i < PRE_ICO_DISCOUNTS.length + 1; i++) {
        preICOTimings[i] = preICOTimings[0] + IncreaseTime.duration.weeks(i);
    }

    let icoTimings = [preICOTimings[preICOTimings.length - 1] + IncreaseTime.duration.weeks(2)]; //  [opening, stageEdges]
    for (i = 0; i < ICO_DISCOUNTS.length + 1; i++) {
        icoTimings[i] = icoTimings[0] + IncreaseTime.duration.weeks(i);
    }
    //  TODO: change before deploy -- END --

    deployer.deploy(IMP_Token).then(async () => {
        let token = await IMP_Token.deployed();

        await deployer.deploy(IMP_Crowdsale, token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW);
        let crowdsale = await IMP_Crowdsale.deployed();
        await token.transferOwnership(crowdsale.address);

        await crowdsale.initialSetup(privatePlacementTimings, preICOTimings, icoTimings, PRIVATE_PLACEMENT_DISCOUNTS, PRE_ICO_DISCOUNTS, ICO_DISCOUNTS);

        //     buildTimings(1534926512);
    });

    function buildTimings(startTime) {
        let increasePeriod = 100;

        let privatePlacementTimings = [startTime + IncreaseTime.duration.seconds(100), startTime + IncreaseTime.duration.seconds(30) + increasePeriod];
        console.log("privatePlacement: ", privatePlacementTimings);

        let preICOTimings = []; //  [opening, stageEdges]
        for (i = 0; i < 6 + 1; i++) {
            if (i == 0) {
                preICOTimings[i] = privatePlacementTimings[privatePlacementTimings.length - 1] + IncreaseTime.duration.seconds(1);
            } else {
                preICOTimings[i] = preICOTimings[i - 1] + increasePeriod;
            }
        }
        console.log("preICOTimings: \n", preICOTimings);

        let icoTimings = []; //  [opening, stageEdges]
        for (i = 0; i < 10 + 1; i++) {
            if (i == 0) {
                icoTimings[i] = preICOTimings[preICOTimings.length - 1] + IncreaseTime.duration.seconds(1);
            } else {
                icoTimings[i] = icoTimings[i - 1] + increasePeriod;
            }
        }
        console.log("icoTimings: \n", icoTimings);
    }
}