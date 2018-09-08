pragma solidity ^0.4.24;


import "./IMP_Token.sol";
import "./IMP_TokenReservations.sol";

contract IMP_MintWithPurpose is IMP_TokenReservations {

  constructor(uint256 _decimals) IMP_TokenReservations(_decimals) public {
  }

  /**
   *  PUBLIC
   */ 

  /**
   * @dev Manually token minting for team.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted with decimals, eg. 1 token == 1 0000
   */
  function manuallyMint_team(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    updateMintedTokensFor(MintReserve.team, _beneficiary, _tokenAmount);
  }

  /**
   * @dev Manually token minting for bountiesAirdrops.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function manuallyMint_bountiesAirdrops(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    updateMintedTokensFor(MintReserve.bountiesAirdrops, _beneficiary, _tokenAmount);
  }
  
  /**
   * @dev Manually token minting for companies.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function manuallyMint_companies(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    updateMintedTokensFor(MintReserve.companies, _beneficiary, _tokenAmount);
  }


  /**
   *  INTERNAL
   */

  function updateMintedTokensFor(MintReserve _mintReserve, address _beneficiary, uint256 _tokenAmount) internal {
    require(_beneficiary != address(0), "address can not be 0");

    updateMintedTokens(_tokenAmount, _mintReserve);
  }
}
