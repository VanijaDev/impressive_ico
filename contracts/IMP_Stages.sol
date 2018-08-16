pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./IMP_Token.sol";

contract IMP_Stages {
  using SafeMath for uint256;

  uint256[] public preICOTimings;
  uint256[] public icoTimings;

  uint256[] public preICODiscounts;
  uint256[] public icoDiscounts;

  modifier onlyWhileRunning() {
    require(now >= preICOTimings[0]);
    require(now <= icoTimings[icoTimings.length-1]);

    //  may be gap between preICO and ICO
    if(now > preICOTimings[preICOTimings.length-1]) {
      require(now >= icoTimings[0]);
    }
    _;
  }

  constructor(uint256[] _preICOTimings, uint256[] _icoTimings, uint256[] _preICODiscounts, uint256[] _icoDiscounts) public {
    validatePreICOTimingsAndDiscounts(_preICOTimings, _preICODiscounts);
    validateIcoTimingsAndDiscounts(_preICOTimings, _icoTimings, _icoDiscounts);
    
    preICOTimings = _preICOTimings;
    icoTimings = _icoTimings;

    preICODiscounts = _preICODiscounts;
    icoDiscounts = _icoDiscounts;
  }

/**
 *  PUBLIC
 */

  // TODO: test
  // use for ICO rate update
  function updateICO(uint256[] _icoTimings, uint256[] _icoDiscounts) internal {
    validateIcoTimingsAndDiscounts(preICOTimings, _icoTimings, _icoDiscounts);

    icoTimings = _icoTimings;
    icoDiscounts = _icoDiscounts;
  }

/**
 * @dev Calculate crowdsale discount
 * @return Discount for current stage
 */
 // TEST
  function currentDiscount() public view onlyWhileRunning returns(uint256) {
    if(now < icoTimings[0]) {
      //  preICO
      for(uint256 i = 1; i < preICOTimings.length; i ++) {
        if(now < preICOTimings[i]) {
          return preICODiscounts[i-1];
        }
      }
    } else {
      //  ICO
      for(uint256 j = 1; j < icoTimings.length; j ++) {
        if(now < icoTimings[j]) {
          return icoDiscounts[j-1];
        }
      }
    }
  }
  

// TODO: test
  /**
   * PRIVATE
   */
  function validatePreICOTimingsAndDiscounts(uint256[] _preICOTimings, uint256[] _preICODiscounts) private view {
    for(uint256 i = 0; i < _preICOTimings.length; i ++) {
      if(i == 0) {
        require(_preICOTimings[i] > now, "preICO should start after now");
      } else {
        require(_preICOTimings[i] > _preICOTimings[i-1], "wrong stage time for preICO");
      }
    }

    require(_preICODiscounts.length == _preICOTimings.length-1, "wrong preICODiscounts count");
  }
// TODO: test
  function validateIcoTimingsAndDiscounts(uint256[] _preICOTimings, uint256[] _icoTimings, uint256[] _icoDiscounts) private pure {
    for(uint256 i = 0; i < _icoTimings.length; i ++) {
      if(i == 0) {
        require(_icoTimings[i] > _preICOTimings[_preICOTimings.length-1], "ICO should start after preICO");
      } else {
        require(_icoTimings[i] > _icoTimings[i-1], "wrong stage time for ICO");
      }
    }

    require(_icoDiscounts.length == _icoTimings.length-1, "wrong icoDiscounts count");
  }
}