pragma solidity ^0.4.23;


import "./IMP_TokenNumbersManagedCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";


contract IMP_Crowdsale is WhitelistedCrowdsale, IMP_TokenNumbersManagedCrowdsale {

  /**
   * @dev Constructor function.
   * @param _token                        Token used for crowdsale
   * @param _crowdsaleSharedLedger        IMP_CrowdsaleSharedLedger for keeping shared crowdsale info 
   * @param _wallet                       Wallet used for crowdsale
   * @param _rateETH                      Rate in ETH
   * @param _timings                      Crowdsale timings:
   * first idx - openingTimestamp
   * middle idxs - discount week closing timestamps
   * last idx - closingTimestamp (last week closing timestamp)
   * @param _stageDiscounts               Discount for each stage in %
   */
  constructor(IMP_Token _token, address _crowdsaleSharedLedger, address _wallet, uint256 _rateETH, uint256[] _timings, uint256[] _stageDiscounts)
    TimedCrowdsale(_timings[0], _timings[_timings.length.sub(1)])
    IMP_TokenNumbersManagedCrowdsale(_token, _crowdsaleSharedLedger, _wallet, _rateETH, _timings, _stageDiscounts)
      public {       
        token = IMP_Token(_token);
  }
  

  /**
   *  MANUAL MINTING
   */ 

  /**
   * @dev Manually token minting for team.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted with decimals, eg. 1 token == 1 0000
   */
  function manualMint_team(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    manualMint(MintPurpose.team, _beneficiary, _tokenAmount);
  }

  /**
   * @dev Manually token minting for platform.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function manualMint_platform(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    manualMint(MintPurpose.platform, _beneficiary, _tokenAmount);
  }

  /**
   * @dev Manually token minting for airdrops.
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */
  function manualMint_airdrops(address _beneficiary, uint256 _tokenAmount) public onlyOwner {  
    manualMint(MintPurpose.airdrops, _beneficiary, _tokenAmount);
  }

  function currentDiscount() public view onlyWhileOpen returns(uint256 discount) {
    discount = super.currentDiscount();
  }

  /**
   * PRIVATE
   */

  /**
   * @dev Manually token minting.
   * @param _mintPurpose Purpose of minting
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */

  function manualMint(MintPurpose _mintPurpose, address _beneficiary, uint256 _tokenAmount) private whenNotPaused {
    require(_tokenAmount > 0, "0 tokens not alowed for minting");

    validateMintLimits(_tokenAmount, _mintPurpose);

    _deliverTokens(_beneficiary, _tokenAmount);
    updateMintedTokenNumbers(_mintPurpose, _tokenAmount);
  }

}