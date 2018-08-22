let mock = {
    minimumPurchaseWei: 100000000000000000, // == 0.1 token
    crowdsaleRateEth: 100, // tokens per ETH, no decimals, TODO: correct values
    crowdsaleSoftCapETH: 15, //  in ETH
    crowdsaleHardCapETH: 50, //  in ETH
    crowdsaleTotalSupplyLimit: 100000000, //  no decimals
    crowdsalePrivatePlacmentDiscounts: [30], //  including each edge
    crowdsalePreICODiscounts: [20, 18, 16, 14], //  including each edge
    crowdsaleICODiscounts: [10, 9, 8], //  including each edge
    tokenPercentageReservedPrivatePlacement: 5,
    tokenPercentageReservedPreICO: 30,
    tokenPercentageReservedICO: 74,
    tokenPercentageReservedTeam: 18,
    tokenPercentageReservedPlatformStart: 3,
    tokenPercentageReservedBountiesAirdrops: 2,
    tokenPercentageReservedCompanies: 3
};

export default function mockCrowdsale() {
    return mock;
}