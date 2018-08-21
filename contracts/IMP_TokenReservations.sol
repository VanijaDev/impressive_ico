pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract IMP_TokenReservations is Ownable {
  using SafeMath for uint256;

  enum MintReserve {purchase, team, platformStart, bountiesAirdrops, companies} // Supplier.State.inactive

  uint256 tokenPercentageReserved_privatePlacement = 5;   //  % of tokens reserved for privatePlacement
  uint256 tokenPercentageReserved_preICO = 25;            //  % of tokens reserved for pre_ICO
  uint256 tokenPercentageReserved_ico = 44;               //  % of tokens reserved for ICO
  uint256 tokenPercentageReserved_team = 18;              //  % of tokens reserved for team
  uint256 tokenPercentageReserved_platformStart = 3;      //  % of tokens reserved for platform start
  uint256 tokenPercentageReserved_bountiesAirdrops = 2;   //  % of tokens reserved for bounties and airdrops
  uint256 tokenPercentageReserved_companies = 3;          //  % of tokens reserved for different companies

  uint256 public tokenLimitTotalSupply_crowdsale;         //  tokens total supply for entire crowdsale
  uint256 public tokensReserved_privatePlacement;         //  tokens reserved for privatePlacement
  uint256 public tokensReserved_preICO;                   //  tokens reserved for pre_ICO
  uint256 public tokensReserved_ico;                      //  tokens reserved for ICO
  uint256 public tokensReserved_team;                     //  tokens reserved for team
  uint256 public tokensReserved_platformStart;            //  tokens reserved for platform start 
  uint256 public tokensReserved_bountiesAirdrops;         //  tokens reserved for bounties and airdrops
  uint256 public tokensReserved_companies;                //  tokens reserved for different companies

  uint256 public tokensMinted_privatePlacement;           //  tokens minted for privatePlacement
  uint256 public tokensMinted_preICO;                     //  tokens minted for pre_ICO
  uint256 public tokensMinted_ico;                        //  tokens minted for ICO
  uint256 public tokensMinted_team;                       //  tokens minted for team
  uint256 public tokensMinted_platformStart;              //  tokens minted for platform 
  uint256 public tokensMinted_bountiesAirdrops;           //  tokens minted for airdrops
  uint256 public tokensMinted_companies;                  //  tokens minted for different companies

  constructor(uint256 _decimals) public {
    tokenLimitTotalSupply_crowdsale = uint256(100000000).mul(uint256(10) ** _decimals); //  100 000 000 * 10000
    calculateTokenLimits();
  }

  /**
   *  PUBLIC
   */

  /**
   * @dev Validation of crowdsale reservations.
   * @param _tokenAmount Number of tokens which are going to be purchased
   * @param _mintReserve Reserve of minting
   */
  function validateMintReserve(uint256 _tokenAmount, MintReserve _mintReserve) internal view {      
    if (_mintReserve == MintReserve.team) {
      require(tokensMinted_team.add(_tokenAmount) <= tokensReserved_team, "not enough tokens for team");
    }
    else if (_mintReserve == MintReserve.platformStart) {
      require(tokensMinted_platformStart.add(_tokenAmount) <= tokensReserved_platformStart, "not enough tokens for platformStart");
    }
    else if (_mintReserve == MintReserve.bountiesAirdrops) {
      require(tokensMinted_bountiesAirdrops.add(_tokenAmount) <= tokensReserved_bountiesAirdrops, "not enough tokens for airdrops");
    }
    else if (_mintReserve == MintReserve.companies) {
      require(tokensMinted_companies.add(_tokenAmount) <= tokensReserved_companies, "not enough tokens for airdrops");
    }
    else {
      // require(tokensAvailableToMint_purchase() >= _tokenAmount, "not enough tokens for tokensAvailableToMint_purchase");
    }
  }

  /**
   * @dev Update token mined amount after minting.
   * @param _tokenAmount Number of tokens were minted
   * @param _mintReserve Reserve of minting
   */
  function updateMintedTokens(uint256 _tokenAmount, MintReserve _mintReserve) internal {
    if (_mintReserve == MintReserve.team) {
      tokensMinted_team = tokensMinted_team.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.platformStart) {
      tokensMinted_platformStart = tokensMinted_platformStart.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.bountiesAirdrops) {
      tokensMinted_bountiesAirdrops = tokensMinted_bountiesAirdrops.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.companies) {
      tokensMinted_companies = tokensMinted_companies.add(_tokenAmount);
    }
    else {
      // require(tokensAvailableToMint_purchase() >= _tokenAmount, "not enough tokens for tokensAvailableToMint_purchase");
    }
  }

  /**
   * PRIVATE
   */
// TODO: test
  function calculateTokenLimits() private {
    tokensReserved_privatePlacement = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_privatePlacement).div(100);
    tokensReserved_preICO = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_preICO).div(100);
    tokensReserved_ico = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_ico).div(100);
    tokensReserved_team = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_team).div(100);
    tokensReserved_platformStart = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_platformStart).div(100);
    tokensReserved_bountiesAirdrops = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_bountiesAirdrops).div(100);
    tokensReserved_companies = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_companies).div(100);
  }
}