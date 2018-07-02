pragma solidity ^0.4.23;


import "./IMP_DiscountCrowdsale.sol";
import "./IMP_CrowdsaleSharedLedger.sol";

import "../node_modules/openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/distribution/FinalizableCrowdsale.sol";

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract IMP_TokenNumbersManagedCrowdsale is Crowdsale, Ownable, Pausable, FinalizableCrowdsale, IMP_DiscountCrowdsale {
  using SafeMath for uint256;  

  enum MintPurpose {preICO, ico, team, platform, airdrops} // Supplier.State.inactive

  IMP_Token public token;

  //  minimum wei amount for purchase, TODO: calculate proper value
  uint256 public minimumPurchaseWei = 10000000000000; //  web3.toWei(0.00001, "ether")
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

  /**
   * @dev Investors can claim refunds here if crowdsale is unsuccessful
   */
  function claimRefund() public {
    crowdsaleSharedLedger.claimRefund();
  }

  /**
   * INTERNAL
   */

  /**
   * @dev Add finalization logic.
   */
  function finalizeCrowdsale() internal onlyOwner {
    IMP_CrowdsaleSharedLedger.CrowdsaleType crowdsaleType = crowdsaleSharedLedger.crowdsaleType();

    crowdsaleSharedLedger.finalizeCrowdsale(tokensMinted_purchase, tokensMinted_team, tokensMinted_platform, tokensMinted_airdrops);
    crowdsaleSharedLedger.transferOwnership(owner);
    token.transferOwnership(owner);

    emit FinalizedWithResults(tokensMinted_purchase, tokensMinted_team, tokensMinted_platform, tokensMinted_airdrops);

    if(crowdsaleType == IMP_CrowdsaleSharedLedger.CrowdsaleType.preICO) {
      selfdestruct(owner);
    }
  }

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
  function updateMintedTokenNumbers(MintPurpose _mintPurpose, uint256 _tokenAmount) internal {
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
    updateMintedTokenNumbers(mintPurpose, _tokenAmount);
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

    pendingTokens = calculateTokenAmount(_weiAmount);

    validateMintLimitsForPurchase(pendingTokens);

    super._preValidatePurchase(_beneficiary, _weiAmount);
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
    token.mint(_beneficiary, _tokenAmount);
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
    crowdsaleSharedLedger.forwardFundsToVault.value(msg.value)(msg.sender);
  }

  /**
   * @dev Can be overridden to add finalization logic. The overriding function
   * should call super.finalization() to ensure the chain of finalization is
   * executed entirely.
   */
  function finalization() internal {
    super.finalization();
    
    finalizeCrowdsale();
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
}
