pragma solidity ^0.4.24;


import "./IMP_Token.sol";
import "./IMP_TokenReservations.sol";

contract IMP_MintWithPurpose is IMP_TokenReservations {

  constructor(uint256 _decimals) IMP_TokenReservations(_decimals) 
  public {
  }

  /**
   *  PUBLIC
   */ 

  // TODO: test all below
  /**
   * @dev Manually token minting for team.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted with decimals, eg. 1 token == 1 0000
   */
  function mint_team(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    mintFor(MintReserve.team, _beneficiary, _tokenAmount);
  }

  /**
   * @dev Manually token minting for platformStart.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function mint_platformStart(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    mintFor(MintReserve.platformStart, _beneficiary, _tokenAmount);
  }

  /**
   * @dev Manually token minting for bountiesAirdrops.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function mint_bountiesAirdrops(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    mintFor(MintReserve.bountiesAirdrops, _beneficiary, _tokenAmount);
  }
  
  /**
   * @dev Manually token minting for companies.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function mint_companies(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    mintFor(MintReserve.companies, _beneficiary, _tokenAmount);
  }


  /**
   *  INTERNAL
   */

  //  TODO: implement
  // /**
  //  * @dev Minting for purchase.
  //  * @param _beneficiary Token receiver address
  //  * @param _tokenAmount Number of tokens to be minted with decimals, eg. 1 token == 1 0000
  //  */
  // function mint_purchase(address _beneficiary, uint256 _tokenAmount) internal {  
  //   mintFor(MintReserve.purchase, _beneficiary, _tokenAmount);
  // }

  function mintFor(MintReserve _mintReserve, address _beneficiary, uint256 _tokenAmount) internal {
    require(_beneficiary != address(0), "address can not be 0");
    require(_tokenAmount > 0, "0 tokens not alowed for minting");

    validateMintReserve(_tokenAmount, _mintReserve);
    updateMintedTokens(_tokenAmount, _mintReserve);
  }
}
