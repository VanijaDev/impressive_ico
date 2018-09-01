let IMP_Token = artifacts.require("./IMP_Token.sol");

contract("IMP_Token", (accounts) => {
    let token;

    before("setup", async () => {
        token = await IMP_Token.deployed();
    });

    it("should validate token name after migration", async () => {
        assert.equal(await token.name.call(), "Impresso", "wrong token name");
    });

    it("should validate token symbol after migration", async () => {
        assert.equal(await token.symbol.call(), "XIM", "wrong token symbol");
    });

    it("should validate token decimals after migration", async () => {
        assert.equal(await token.decimals.call(), 4, "wrong token decimals");
    });
});