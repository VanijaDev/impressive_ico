pragma solidity ^0.4.24;


import "./IMP_Stages.sol";
import "./IMP_MintWithPurpose.sol";

import "../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";


contract IMP_Crowdsale is WhitelistedCrowdsale, IMP_Stages, IMP_MintWithPurpose, Pausable {

  uint256 crowdsaleSoftCap = uint256(15000).mul(10**18);  //  15 000 ETH
  uint256 preICORate = 100; //  tokens per ETH, TODO: change before deploy

  constructor(ERC20 _token, address _wallet)
    Crowdsale(preICORate, _wallet, _token)
    IMP_Stages()
    IMP_MintWithPurpose(IMP_Token(_token).decimals())
  public {
  }

  /** 
   * PUBLIC 
   */

  // TODO: test
  // use for ICO rate update
  function updatePreICO(uint256 _rateTokensPerETH, uint256[] _preICOTimings, uint256[] _preICODiscounts) public onlyOwner {
    require(_rateTokensPerETH > 0, "_rateTokensPerETH should be > 0");
    rate = _rateTokensPerETH;

    if(_preICOTimings.length > 0) {
      super.updatePreICO(_preICOTimings, _preICODiscounts);
    }
  }

   // TODO: test
   // use for ICO rate update
  function updateICO(uint256 _rateTokensPerETH, uint256[] _icoTimings, uint256[] _icoDiscounts) public onlyOwner {
    require(_rateTokensPerETH > 0, "_rateTokensPerETH should be > 0");
    rate = _rateTokensPerETH;

    if(_icoTimings.length > 0) {
      super.updateICO(_icoTimings, _icoDiscounts);
    }
  }

  /**
   * INTERNAL
   */

  /**
   * @dev Token minting with purpose.
   * @param _mintReserve Reserve of minting
   * @param _beneficiary Token receiver address
   * @param _tokenAmount Number of tokens to be minted, eg. 1 token == 1 0000
   */

  function mintFor(IMP_TokenReservations.MintReserve _mintReserve, address _beneficiary, uint256 _tokenAmount) internal whenNotPaused onlyWhileAnyStageOpen {
    super.mintFor(_mintReserve, _beneficiary, _tokenAmount);

    _deliverTokens(_beneficiary, _tokenAmount);
  }

  /**
   * OVERRIDEN
   */

  //  /**
  //  * @dev Extend parent behavior requiring beneficiary to be in whitelist.
  //  * @param _beneficiary Token beneficiary
  //  * @param _weiAmount Amount of wei contributed
  //  */
  // function _preValidatePurchase(
  //   address _beneficiary,
  //   uint256 _weiAmount
  // )
  //   internal
  //   onlyIfWhitelisted(_beneficiary)
  // {
  //   super._preValidatePurchase(_beneficiary, _weiAmount);
  // }

  /**
   * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
   * @param _beneficiary Address performing the token purchase
   * @param _tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    IMP_Token(token).mint(_beneficiary, _tokenAmount);
  }

  /**
   * @dev Extend parent behavior requiring to be within contributing period
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
    onlyWhileAnyStageOpen
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
  }
}