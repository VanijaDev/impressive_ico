pragma solidity ^0.4.24;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";


contract IMP_Token is MintableToken, DetailedERC20 {
  using SafeMath for uint256;

  constructor() DetailedERC20("Impresso", "XIM", 4) public {
  }
}
