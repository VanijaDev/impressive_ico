let IMP_Token = artifacts.require("./IMP_Token.sol");
let IMP_Crowdsale = artifacts.require("./IMP_Crowdsale.sol");
let IncreaseTime = require("../test/helpers/increaseTime.js");


module.exports = (deployer, network, accounts) => {
    //  TODO: change before deploy -- START --

    // 1. TOKEN name, symbol, decimals

    const CROWDSALE_WALLET = accounts[9];
    const UNSOLD_TOKEN_ESCROW_WALLET = accounts[8];

    const PRIVATE_PLACEMENT_DISCOUNTS = [50];
    const PRE_ICO_DISCOUNTS = [20, 18, 16, 14, 12, 10]; //  including each edge
    const ICO_DISCOUNTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; //  including each edge

    // let timings = buildTimings(web3.eth.getBlock("latest").timestamp + IncreaseTime.duration.minutes(1));
    // let openingTimings = timings[0];
    // let closingTimings = timings[1];

    buildTimings(1000000000);

    //  TODO: change before deploy -- END --

    // deployer.deploy(IMP_Token).then(async () => {
    // let token = await IMP_Token.deployed();

    // await deployer.deploy(IMP_Crowdsale, token.address, CROWDSALE_WALLET, UNSOLD_TOKEN_ESCROW_WALLET);
    // let crowdsale = await IMP_Crowdsale.deployed();
    // await token.transferOwnership(crowdsale.address);

    // // function initialSetup(uint256[] _openingTimings, uint256[] _closingTimings, uint256[] _ratesETH, uint256[] _discounts) public onlyOwner {
    // await crowdsale.initialSetup();

    // buildTimings(1534926512);
    // });

    function buildTimings(startTime) {
        let increasePeriod = 200;
        const WEEKS_PRIVATE_PLACEMENT = 2;
        const WEEKS_PRE_ICO = 5;
        const WEEKS_ICO = 10;

        let openings = [
            [],
            [],
            []
        ];
        let closings = [
            [],
            [],
            []
        ];

        //  privatePlacement
        for (let i = 0; i < WEEKS_PRIVATE_PLACEMENT; i++) {
            if (i == 0) {
                openings[0][i] = startTime;
            } else {
                openings[0][i] = closings[0][i - 1] + 1;
            }
            closings[0][i] = openings[0][i] + increasePeriod;
        }

        console.log("privatePlacement");
        console.log(openings);
        console.log(closings);
        console.log("\n");

        //  preICO
        for (let i = 0; i < WEEKS_PRE_ICO; i++) {
            if (i == 0) {
                openings[1][i] = closings[0][WEEKS_PRIVATE_PLACEMENT - 1] + 1;
            } else {
                openings[1][i] = closings[1][i - 1] + 1;
            }
            closings[1][i] = openings[1][i] + increasePeriod;
        }

        console.log("preICO");
        console.log(openings);
        console.log(closings);
        console.log("\n");

        //  ICO
        for (let i = 0; i < WEEKS_ICO; i++) {
            if (i == 0) {
                openings[2][i] = closings[1][WEEKS_PRE_ICO - 1] + 1;
            } else {
                openings[2][i] = closings[2][i - 1] + 1;
            }
            closings[2][i] = openings[2][i] + increasePeriod;
        }

        console.log("ICO");
        console.log(openings);
        console.log(closings);
        console.log("\n");
    }
}