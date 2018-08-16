pragma solidity ^0.4.24;


import "./IMP_Stages.sol";
import "./IMP_MintWithPurpose.sol";

import "../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";


contract IMP_Crowdsale is Pausable, TimedCrowdsale, IMP_Stages, IMP_MintWithPurpose {

  uint256 crowdsaleSoftCap = uint256(15000).mul(10**18);  //  15 000 ETH
  uint256 preICORate = 100; //  tokens per ETH, TODO: change before deploy

  constructor(ERC20 _token, address _wallet, uint256[] _preICOTimings, uint256[] _icoTimings, uint256[] _preICODiscounts, uint256[] _icoDiscounts)
    Crowdsale(preICORate, _wallet, _token)
    TimedCrowdsale(_preICOTimings[0], _icoTimings[_icoTimings.length-1])
    IMP_Stages(_preICOTimings, _icoTimings, _preICODiscounts, _icoDiscounts)
    IMP_MintWithPurpose(IMP_Token(_token).decimals())
  public {
  }

  /** 
   * PUBLIC 
   */

   // TODO: test
   // use for ICO rate update
  function updateICO(uint256 _rate, uint256[] _icoTimings, uint256[] _icoDiscounts) public onlyOwner {
    require(_rate > 0, "rate should be > 0");
    rate = _rate; //  IMPORTANT: tokens per ETH

    super.updateICO(_icoTimings, _icoDiscounts);
  }

  // TODO: test
  /**
   * @dev Checks whether the period in which the crowdsale is open has already started.
   * @return Whether crowdsale period has started
   */
  function hasOpened() public view returns (bool) {
    return block.timestamp >= openingTime;
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

  function mintFor(IMP_TokenReservations.MintReserve _mintReserve, address _beneficiary, uint256 _tokenAmount) internal whenNotPaused onlyWhileRunning {
    super.mintFor(_mintReserve, _beneficiary, _tokenAmount);

    _deliverTokens(_beneficiary, _tokenAmount);
  }

  /**
   * OVERRIDEN
   */
  /**
   * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
   * @param _beneficiary Address performing the token purchase
   * @param _tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    IMP_Token(token).mint(_beneficiary, _tokenAmount);
  }
}