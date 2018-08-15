pragma solidity ^0.4.24;


import "./IMP_DiscountCrowdsale.sol";
import "./IMP_CrowdsaleSharedLedger.sol";

import "../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract IMP_TokenNumbersManagedCrowdsale is Crowdsale, Pausable, TimedCrowdsale, IMP_DiscountCrowdsale {
  using SafeMath for uint256;  

  enum MintPurpose {preICO, ico, team, platform, airdrops} // Supplier.State.inactive

  IMP_Token public token;

  uint256 public minimumPurchaseWei = 100000000000000000; //  web3.toWei(0.1, "ether")
  uint256 public rateETH; // tokens per ETH, no decimals, TODO: correct values


  uint256 public tokenLimitReserved_purchase;     //  tokens reserved for purchase
  uint256 public tokenLimitReserved_team;         //  tokens reserved for team
  uint256 public tokenLimitReserved_platform;     //  tokens reserved for platform 
  uint256 public tokenLimitReserved_airdrops;     //  tokens reserved for airdrops

  uint256 public tokensMinted_purchase;     //  tokens minted for purchase
  uint256 public tokensMinted_team;         //  tokens minted for team
  uint256 public tokensMinted_platform;     //  tokens minted for platform 
  uint256 public tokensMinted_airdrops;     //  tokens minted for airdrops

  uint256 internal pendingTokens;  //  tokens calculated for current tx

  IMP_CrowdsaleSharedLedger private crowdsaleSharedLedger;

  bool public isFinalized;


  /**
   * EVENTS
   */
  event FinalizedWithResults(uint256 _tokensMinted_purchase, uint256 _tokensMinted_team, uint256 _tokensMinted_platform, uint256 _tokensMinted_airdrops);

  /**
   * @dev Constructor function.
   * @param _token                        Token used for crowdsale
   * @param _crowdsaleSharedLedger        Shared ledger used for crowdsale
   * @param _wallet                       Wallet for funds
   * @param _rateETH                      Rate in ETH
   * @param _timings                      Crowdsale timings:
   * first idx - openingTimestamp
   * middle idxs - discount week closing timestamps
   * last idx - closingTimestamp (last week closing timestamp)
   * @param _stageDiscounts               Discount for each stage
   */
  constructor(IMP_Token _token, address _crowdsaleSharedLedger, address _wallet, uint256 _rateETH, uint256[] _timings, uint256[] _stageDiscounts) 
    Crowdsale(_rateETH, _wallet, _token)
    IMP_DiscountCrowdsale(_timings, _stageDiscounts)
    public {
    rateETH = _rateETH;

    crowdsaleSharedLedger  = IMP_CrowdsaleSharedLedger(_crowdsaleSharedLedger);

    getTokenReservedLimits();
  }


/**
 * PUBLIC
 */
  function currentCrowdsaleType() public view returns(IMP_CrowdsaleSharedLedger.CrowdsaleType) {
    return crowdsaleSharedLedger.crowdsaleType();
  }

  function crowdsaleSharedLedgerAddress() public view onlyOwner returns(address) {
    return crowdsaleSharedLedger;
  }

  /**
   * @dev Calculate available amount of tokens to mint during purchase.
   * @return Number of tokens that can be minted during purchase
   */
  function tokensAvailableToMint_purchase() public view returns(uint256) {
    return tokenLimitReserved_purchase.sub(tokensMinted_purchase);
  }

  /**
   * @dev Calculate available amount of tokens to mint for team.
   * @return Number of tokens that can be minted for team members
   */
  function tokensAvailableToMint_team() public view onlyOwner returns(uint256) {
    return tokenLimitReserved_team.sub(tokensMinted_team);
  }

  /**
   * @dev Calculate available amount of tokens to mint for platform.
   * @return Number of tokens that can be minted for platform
   */
  function tokensAvailableToMint_platform() public view onlyOwner returns(uint256) {
    return tokenLimitReserved_platform.sub(tokensMinted_platform);
  }

  /**
   * @dev Calculate available amount of tokens to mint for airdrops.
   * @return Number of tokens that can be minted for airdrops
   */
  function tokensAvailableToMint_airdrops() public view onlyOwner returns(uint256) {
    return tokenLimitReserved_airdrops.sub(tokensMinted_airdrops);
  }

  /**
   * @dev Calculates token amount for provided wei amount.
   * @param _weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function calculateTokenAmount(uint256 _weiAmount) public view returns (uint256 tokens) {
    require(_weiAmount >= minimumPurchaseWei, "minimum purchase wei not reached");

    //  TODO: calculate properly
    uint256 basicTokens = _weiAmount.mul(rateETH).mul(10**4).div(10**18);
      
    uint256 discount = currentDiscount();
    uint256 bonusTokens = basicTokens.div(100).mul(discount);
      
    tokens = basicTokens.add(bonusTokens);
  }

  function refundsEnabled() public view returns(bool) {
    return crowdsaleSharedLedger.refundsEnabled();
  }

  /**
   * @dev Determines if soft cap was reached.
   * @return Whether soft cap goal was reached
   */
  function softCapReached() public view returns(bool) {
    return crowdsaleSharedLedger.goalReached();
  }
  
  /**
   * @dev Total wei raised in crowdsale.
   * @return Vault balance
   */
  function crowdsaleWeiRaised() public view returns(uint256) {
    return crowdsaleSharedLedger.crowdsaleWeiRaised();
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already started.
   * @return Whether crowdsale period has started
   */
  function hasOpened() public view returns (bool) {
    return block.timestamp >= openingTime;
  }

  /**
   * OVERRIDEN
   */

  /**
   * WHITELIST functional
   */

  /**
   * @dev Reverts if beneficiary is not whitelisted. Can be used when extending this contract.
   */
  modifier isWhitelisted(address _beneficiary) {
    require(crowdsaleSharedLedger.whitelist(_beneficiary));
    _;
  }

  function addressWhitelisted(address _beneficiary) public view returns(bool) {
    return crowdsaleSharedLedger.whitelist(_beneficiary);
  }

  /**
   * @dev Adds single address to whitelist.
   * @param _beneficiary Address to be added to the whitelist
   */
  function addToWhitelist(address _beneficiary) external onlyOwner {
    crowdsaleSharedLedger.addToWhitelist(_beneficiary);
  }

  /**
   * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
   * @param _beneficiaries Addresses to be added to the whitelist
   */
  function addManyToWhitelist(address[] _beneficiaries) external onlyOwner {
    crowdsaleSharedLedger.addManyToWhitelist(_beneficiaries);
  }

  /**
   * @dev Removes single address from whitelist.
   * @param _beneficiary Address to be removed to the whitelist
   */
  function removeFromWhitelist(address _beneficiary) external onlyOwner {
      crowdsaleSharedLedger.removeFromWhitelist(_beneficiary);
  }


  /**
   * INTERNAL
   */

   /**
   * @dev Validation of crowdsale limits for preICO and ICO only.
   * @param _pendingTokens Number of tokens which are going to be purchased
   */
  function validateMintLimitsForPurchase(uint256 _pendingTokens) internal view {
    MintPurpose mintPurpose = (crowdsaleSharedLedger.crowdsaleType() == IMP_CrowdsaleSharedLedger.CrowdsaleType.preICO) ? MintPurpose.preICO : MintPurpose.ico;
    validateMintLimits(_pendingTokens, mintPurpose);
  }

  /**
   * @dev Validation of crowdsale limits.
   * @param _pendingTokens Number of tokens which are going to be purchased
   * @param _mintPurpose Purpose of minting
   */
  function validateMintLimits(uint256 _pendingTokens, MintPurpose _mintPurpose) internal view {      
    if (_mintPurpose == MintPurpose.team) {
      require(tokensAvailableToMint_team() >= _pendingTokens, "not enough tokens for team");
    }  else if (_mintPurpose == MintPurpose.platform) {
      require(tokensAvailableToMint_platform() >= _pendingTokens, "not enough tokens for platform");
    } else if (_mintPurpose == MintPurpose.airdrops) {
      require(tokensAvailableToMint_airdrops() >= _pendingTokens, "not enough tokens for airdrops");
    } else {
      require(tokensAvailableToMint_purchase() >= _pendingTokens, "not enough tokens for tokensAvailableToMint_purchase");
    }
  }

  /**
   * @dev Update token mined numbers after minting.
   * @param _mintPurpose Purpose of minting
   * @param _tokenAmount Number of tokens were minted
   */
  function updateMintedTokenNumbers(uint256 _tokenAmount, MintPurpose _mintPurpose) internal {
    if (_mintPurpose == MintPurpose.team) {
      tokensMinted_team = tokensMinted_team.add(_tokenAmount);
    } else if (_mintPurpose == MintPurpose.platform) {
      tokensMinted_platform = tokensMinted_platform.add(_tokenAmount);
    } else if (_mintPurpose == MintPurpose.airdrops) {
      tokensMinted_airdrops = tokensMinted_airdrops.add(_tokenAmount);
    } else {
      tokensMinted_purchase = tokensMinted_purchase.add(_tokenAmount);
    }
  }

  /**
   * @dev Update token mined numbers after minting.
   * @param _tokenAmount Number of tokens were minted
   */
  function updateMintedTokenNumbersForCrowdsale(uint256 _tokenAmount) internal {
    MintPurpose mintPurpose = (crowdsaleSharedLedger.crowdsaleType() == IMP_CrowdsaleSharedLedger.CrowdsaleType.preICO) ? MintPurpose.preICO : MintPurpose.ico;
    updateMintedTokenNumbers(_tokenAmount, mintPurpose);
  }


  /**
   * OVERRIDEN
   */

  /**
   * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met. Use super to concatenate validations.
   * @param _beneficiary Address performing the token purchase
   * @param _weiAmount Value in wei involved in the purchase
   */
  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal whenNotPaused {
    require(_weiAmount >= minimumPurchaseWei, "minimum purchase wei not reached");
    require(hasOpened(), "crowdsale has not opened yet");
    require(!isFinalized, "is already finalized");
    
    if (shouldFinalize()) {
      msg.sender.transfer(msg.value);
      finalize();
      pendingTokens = 0;
    } else {
      pendingTokens = calculateTokenAmount(_weiAmount);
      validateMintLimitsForPurchase(pendingTokens);

      super._preValidatePurchase(_beneficiary, _weiAmount);
    }
  }

  /**
   * @dev Override to extend the way in which ether is converted to tokens.
   * @param _weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
    require(_weiAmount > 0, "wei should be more, than 0");
    return pendingTokens;
  }
   
  /**
   * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
   * @param _beneficiary Address performing the token purchase
   * @param _tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    if(!isFinalized) {
      token.mint(_beneficiary, _tokenAmount);
    }
  }

  /**
   * @dev Override for extensions that require an internal state to check for validity (current user contributions, etc.)
   * @param _beneficiary Address receiving the tokens
   * @param _weiAmount Value in wei involved in the purchase
   */
  function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
    updateMintedTokenNumbersForCrowdsale(pendingTokens);
    pendingTokens = 0;

    super._updatePurchasingState(_beneficiary, _weiAmount);
  }
  
  /**
   * @dev Determines how ETH is stored/forwarded on purchases.
   * We should not forward funds.
   */
  function _forwardFunds() internal {
    if(!isFinalized) {
      crowdsaleSharedLedger.forwardFundsToVault.value(msg.value)(msg.sender);
    }
  }


  /**
   * PRIVATE
   */

  /**
   * @dev Get token reserved limits for current crowdsale.
   */
  function getTokenReservedLimits() private {
    (tokenLimitReserved_purchase, tokenLimitReserved_team, tokenLimitReserved_platform, tokenLimitReserved_airdrops) = crowdsaleSharedLedger.getTokenReservedLimits();
  }
  
  /**
   * @dev Check if Crowdsale should be finalized.
   * return Whether shoould be finalized
   */
  function shouldFinalize() private view returns(bool) {
    return hasClosed();
  }
  
  /**
   * @dev Add finalization logic.
   */
  function finalize() private {
    require(!isFinalized, "is already finalized");
    require(hasClosed(), "finalize can be called after closing time");

    isFinalized = true;

    IMP_CrowdsaleSharedLedger.CrowdsaleType crowdsaleType = crowdsaleSharedLedger.crowdsaleType();
    crowdsaleSharedLedger.finalize(tokensMinted_purchase, tokensMinted_team, tokensMinted_platform, tokensMinted_airdrops);

    emit FinalizedWithResults(tokensMinted_purchase, tokensMinted_team, tokensMinted_platform, tokensMinted_airdrops);

    if(crowdsaleType == IMP_CrowdsaleSharedLedger.CrowdsaleType.preICO) {
      crowdsaleSharedLedger.transferOwnership(owner);
      token.transferOwnership(owner);

      selfdestruct(owner);
    } else {
        token.transferOwnership(owner);
      
        if(crowdsaleSharedLedger.goalReached()) {
          crowdsaleSharedLedger.destroy();
          selfdestruct(owner);
        }
    }
  }
}
