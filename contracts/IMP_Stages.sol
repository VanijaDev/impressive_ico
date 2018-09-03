pragma solidity ^0.4.24;

import "./IMP_Token.sol";

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract IMP_Stages is Ownable {
  using SafeMath for uint256;

  uint256[] public privatePlacementTimings;
  uint256[] public privatePlacementDiscounts;
  uint256 public privatePlacementRate = 300;

  uint256[] public preICOTimings;
  uint256[] public preICODiscounts;
  uint256 public preICORate = 200;

  uint256[] public icoTimings;
  uint256[] public icoDiscounts;
  uint256 public icoRate = 100;

  constructor() public {
  }

/**
 *  PUBLIC
 */

  // TODO: test
  /**
   * @dev Checks whether now is more than private placement period beginning.
   * @return Whether crowdsale has started
   */
  function hasOpened() public view returns (bool) {
    return block.timestamp >= privatePlacementTimings[0];
  }

  /**
   * @dev Checks whether any stage of crowdsale is currently open.
   * @return Whether any stage is open
   */
  function anyStageOpen() public view returns (bool) {
    return(currentStage_privatePlacement() || currentStage_preICO() || currentStage_ico());
  }

  /**
   * @dev Initializes timimng and discounts for the crowdsale.
   * @param _privatePlacementTimings private placement timings
   * @param _preICOTimings preICO timings
   * @param _icoTimings ico timings
   * @param _privatePlacementDiscounts private placement discounts
   * @param _preICODiscounts preICO discounts
   * @param _icoDiscounts ico discounts
   */
  function initialSetup(uint256[] _privatePlacementTimings, uint256[] _preICOTimings, uint256[] _icoTimings, uint256[] _privatePlacementDiscounts, uint256[] _preICODiscounts, uint256[] _icoDiscounts) public onlyOwner {
    require(privatePlacementTimings.length == 0, "initial setup already done");

    validatePrivatePlacementTimingsAndDiscounts(_privatePlacementTimings, _privatePlacementDiscounts);
    validatePreICOTimingsAndDiscounts(_preICOTimings, _preICODiscounts, _privatePlacementTimings[_privatePlacementTimings.length-1]);
    validateIcoTimingsAndDiscounts(_icoTimings, _icoDiscounts, _preICOTimings[_preICOTimings.length-1]);

    privatePlacementTimings = _privatePlacementTimings;
    preICOTimings = _preICOTimings;
    icoTimings = _icoTimings;

    privatePlacementDiscounts = _privatePlacementDiscounts;
    preICODiscounts = _preICODiscounts;
    icoDiscounts = _icoDiscounts;
  }

  // use for preICO rate update
  function updatePreICO(uint256 _rate, uint256[] _preICOTimings, uint256[] _preICODiscounts) public onlyOwner {
    require(_rate > 0, "preICO rate should be > 0");
    validatePreICOTimingsAndDiscounts(_preICOTimings, _preICODiscounts, privatePlacementTimings[privatePlacementTimings.length-1]);

    preICORate = _rate;
    preICOTimings = _preICOTimings;
    preICODiscounts = _preICODiscounts;
  }

  // use for ICO rate update
  function updateICO(uint256 _rate, uint256[] _icoTimings, uint256[] _icoDiscounts) public onlyOwner {
    require(_rate > 0, "ico rate should be > 0");
    validateIcoTimingsAndDiscounts(_icoTimings, _icoDiscounts, preICOTimings[preICOTimings.length-1]);

    icoRate = _rate;
    icoTimings = _icoTimings;
    icoDiscounts = _icoDiscounts;
  }

  /**
   * @dev Calculate crowdsale rate and discount for current stage
   * @return Rate and Discount
   */
  function currentRateAndDiscount() public view returns(uint256 _rate, uint256 _discount) {
    if(currentStage_privatePlacement()) {
      for(uint256 i = 1; i < privatePlacementTimings.length; i ++) {
        if(now < privatePlacementTimings[i]) {
          return (privatePlacementRate, privatePlacementDiscounts[i-1]);
        }
      }
    } else if(currentStage_preICO()) {
      for(uint256 j = 1; j < preICOTimings.length; j ++) {
        if(now < preICOTimings[j]) {
          return (preICORate, preICODiscounts[j-1]);
        }
      }
    } else if(currentStage_ico()) {
      for(uint256 k = 1; k < icoTimings.length; k ++) {
        if(now < icoTimings[k]) {
          return (icoRate, icoDiscounts[k-1]);
        }
      }
    }
    
    return (0, 0);
  }

  /**
   * PRIVATE
   */

  /**
   * @dev Validates private placement timings and discounts
   * @param _privatePlacementTimings private placement timings
   * @param _privatePlacementDiscounts private placement discounts
   */
  function validatePrivatePlacementTimingsAndDiscounts(uint256[] _privatePlacementTimings, uint256[] _privatePlacementDiscounts) private view {
    require(_privatePlacementDiscounts.length == _privatePlacementTimings.length-1, "wrong privatePlacementDiscounts count");

    for(uint256 i = 0; i < _privatePlacementTimings.length; i ++) {
      if(i == 0) {
        require(_privatePlacementTimings[i] > now, "private placement should start after now");
      } else {
        require(_privatePlacementTimings[i] > _privatePlacementTimings[i-1], "wrong stage time for private placement");
      }
    }
  }


  /**
   * @dev Validates preICO timings and discounts
   * @param _preICOTimings preICO timings
   * @param _preICODiscounts preICO discounts
   * @param _privatePlacementFinish private placement closing time
   */
  function validatePreICOTimingsAndDiscounts(uint256[] _preICOTimings, uint256[] _preICODiscounts, uint256 _privatePlacementFinish) private pure {
    require(_preICODiscounts.length == _preICOTimings.length-1, "wrong preICODiscounts count");

    for(uint256 i = 0; i < _preICOTimings.length; i ++) {
      if(i == 0) {
        require(_preICOTimings[i] > _privatePlacementFinish, "preICO should start after private placement");
      } else {
        require(_preICOTimings[i] > _preICOTimings[i-1], "wrong stage time for preICO");
      }
    }
  }

  /**
   * @dev Validates ICO timings and discounts
   * @param _icoTimings ICO timings
   * @param _icoDiscounts ICO discounts
   * @param _preICOFinish preICO closing time
   */
  function validateIcoTimingsAndDiscounts(uint256[] _icoTimings, uint256[] _icoDiscounts, uint256 _preICOFinish) private pure {
    require(_icoDiscounts.length == _icoTimings.length-1, "wrong icoDiscounts count");

    for(uint256 i = 0; i < _icoTimings.length; i ++) {
      if(i == 0) {
        require(_icoTimings[i] > _preICOFinish, "ICO should start after preICO");
      } else {
        require(_icoTimings[i] > _icoTimings[i-1], "wrong stage time for ICO");
      }
    }
  }

  /**
   * @dev Check whether current stage is private placement
   * @return is current stage a private placement
   */
  function currentStage_privatePlacement() internal view returns(bool) {
    return now >= privatePlacementTimings[0] && now <= privatePlacementTimings[privatePlacementTimings.length-1];
  }

  /**
   * @dev Check whether current stage is preICO
   * @return is current stage a preICO
   */
  function currentStage_preICO() internal view returns(bool) {
    return now >= preICOTimings[0] && now <= preICOTimings[preICOTimings.length-1];
  }

  /**
   * @dev Check whether current stage is ICO
   * @return is current stage a ICO
   */
  function currentStage_ico() internal view returns(bool) {
    return now >= icoTimings[0] && now <= icoTimings[icoTimings.length-1];
  }
}