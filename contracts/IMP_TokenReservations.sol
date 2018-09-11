pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract IMP_TokenReservations is Ownable {
  using SafeMath for uint256;

  enum MintReserve {privatePlacement, preICO, ico, team, bountiesAirdrops, companies} // Supplier.State.inactive

  //  IMPORTANT: purchase reservations, minted amounts include previous stage (e.g. preICO == preICO + privatePlacement, ico == ico + preICO)
  uint256 tokenPercentageReserved_privatePlacement = 5;   //  % of tokens reserved for privatePlacement
  uint256 tokenPercentageReserved_preICO = 30;            //  % of tokens reserved for pre_ICO = 25 + 5
  uint256 tokenPercentageReserved_ico = 74;               //  % of tokens reserved for ICO = 44 + 30
  uint256 tokenPercentageReserved_team = 18;              //  % of tokens reserved for team
  uint256 tokenPercentageReserved_bountiesAirdrops = 3;   //  % of tokens reserved for bounties and airdrops
  uint256 tokenPercentageReserved_companies = 5;          //  % of tokens reserved for different companies

  uint256 public tokenLimitTotalSupply_crowdsale;         //  tokens total supply for entire crowdsale
  uint256 public tokensReserved_privatePlacement;         //  tokens reserved for privatePlacement
  uint256 public tokensReserved_preICO;                   //  tokens reserved for pre_ICO
  uint256 public tokensReserved_ico;                      //  tokens reserved for ICO
  uint256 public tokensReserved_team;                     //  tokens reserved for team
  uint256 public tokensReserved_bountiesAirdrops;         //  tokens reserved for bounties and airdrops
  uint256 public tokensReserved_companies;                //  tokens reserved for different companies

  uint256 public tokensMinted_privatePlacement;           //  tokens minted for privatePlacement
  uint256 public tokensMinted_preICO;                     //  tokens minted for pre_ICO
  uint256 public tokensMinted_ico;                        //  tokens minted for ICO
  uint256 public tokensMinted_team;                       //  tokens minted for team 
  uint256 public tokensMinted_bountiesAirdrops;           //  tokens minted for airdrops
  uint256 public tokensMinted_companies;                  //  tokens minted for different companies

  /**
   * @param _decimals Number of token decimals
   */
  constructor(uint256 _decimals) public {
    tokenLimitTotalSupply_crowdsale = uint256(100000000).mul(uint256(10) ** _decimals); //  100 000 000 * 10000
    calculateTokenLimits();
  }

  /**
   *  PUBLIC
   */

  /**
   * @dev Update token mined amount after minting.
   * @param _tokenAmount Number of tokens were minted
   * @param _mintReserve Reserve of minting
   */
  function updateMintedTokens(uint256 _tokenAmount, MintReserve _mintReserve) internal {
    require(_tokenAmount > 0, "0 tokens not alowed for minting");
    
    if (_mintReserve == MintReserve.team) {
      require(tokensMinted_team.add(_tokenAmount) <= tokensReserved_team, "not enough tokens for team");
      tokensMinted_team = tokensMinted_team.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.bountiesAirdrops) {
      require(tokensMinted_bountiesAirdrops.add(_tokenAmount) <= tokensReserved_bountiesAirdrops, "not enough tokens for airdrops");
      tokensMinted_bountiesAirdrops = tokensMinted_bountiesAirdrops.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.companies) {
      require(tokensMinted_companies.add(_tokenAmount) <= tokensReserved_companies, "not enough tokens for companies");
      tokensMinted_companies = tokensMinted_companies.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.privatePlacement) {
      require(tokensMinted_privatePlacement.add(_tokenAmount) <= tokensReserved_privatePlacement, "not enough tokens for privatePlacement");
      tokensMinted_privatePlacement = tokensMinted_privatePlacement.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.preICO) {
      if (tokensMinted_preICO == 0) {
        tokensMinted_preICO = tokensMinted_privatePlacement;
      }
      require(tokensMinted_preICO.add(_tokenAmount) <= tokensReserved_preICO, "not enough tokens for preICO");
      tokensMinted_preICO = tokensMinted_preICO.add(_tokenAmount);
    }
    else if (_mintReserve == MintReserve.ico) {
      if (tokensMinted_ico == 0) {
        tokensMinted_ico = tokensMinted_preICO;
      }
      require(tokensMinted_ico.add(_tokenAmount) <= tokensReserved_ico, "not enough tokens for ICO");
      tokensMinted_ico = tokensMinted_ico.add(_tokenAmount);
    }
  }

  /**
   * PRIVATE
   */

  /**
   * @dev Calculates limits for reservations.
   */
  function calculateTokenLimits() private {
    tokensReserved_privatePlacement = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_privatePlacement).div(100);
    tokensReserved_preICO = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_preICO).div(100);
    tokensReserved_ico = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_ico).div(100);
    tokensReserved_team = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_team).div(100);
    tokensReserved_bountiesAirdrops = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_bountiesAirdrops).div(100);
    tokensReserved_companies = tokenLimitTotalSupply_crowdsale.mul(tokenPercentageReserved_companies).div(100);
  }

  /**
   * @dev Calculates amount of unsold tokens.
   * @return Amount of unsold tokens
   */
  function unsoldTokens() public view returns (uint256) {
    return tokenLimitTotalSupply_crowdsale.sub(tokensMinted_ico).sub(tokensMinted_team).sub(tokensMinted_bountiesAirdrops).sub(tokensMinted_companies);
  }
}