let mock = {
    minimumPurchaseWei: 100000000000000000, // == 0.1 token
    crowdsaleRateEth: 100, // tokens per ETH, no decimals, TODO: correct values
    crowdsaleSoftCapETH: 15, //  in ETH
    crowdsaleHardCapETH: 50, //  in ETH
    crowdsaleTotalSupplyLimit: 100000000, //  no decimals
    crowdsalePrivatePlacmentDiscounts: [50], //  including each edge
    crowdsalePreICODiscounts: [20, 18, 16, 14, 12], //  including each edge
    crowdsaleICODiscounts: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], //  including each edge
    tokenPercentageReserved_privatePlacement: 5,
    tokenPercentageReserved_preICO: 30,
    tokenPercentageReserved_ico: 74,
    tokenPercentageReserved_team: 18,
    tokenPercentageReserved_bountiesAirdrops: 3,
    tokenPercentageReserved_companies: 5
};

export default function mockCrowdsale() {
    return mock;
}