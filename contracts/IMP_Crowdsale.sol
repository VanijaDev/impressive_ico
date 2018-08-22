pragma solidity ^0.4.24;


import "./IMP_Stages.sol";
import "./IMP_MintWithPurpose.sol";

import "../node_modules/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";
import "../node_modules/openzeppelin-solidity/contracts/payment/RefundEscrow.sol";

/**
 * @title IMP_Crowdsale
 * @dev Contract used for crowdsale.
 */
contract IMP_Crowdsale is WhitelistedCrowdsale, CappedCrowdsale, RefundEscrow, IMP_Stages, IMP_MintWithPurpose, Pausable {

  uint256 public crowdsaleSoftCap = uint256(15000).mul(10**18);  //  15 000 ETH
  uint256 public crowdsaleHardCap = uint256(50000).mul(10**18);  //  50 000 ETH
  uint256 public minimumPurchaseWei = 100000000000000000;

  address public unsoldTokenEscrow;
  uint256 public unsoldTokenEscrowPercent = 2;  //  % from unsold tokens

  /**
   * @dev Reverts if not less than minimum purchase.
   */
  modifier minimumPurchase() {
    require(msg.value >= minimumPurchaseWei, "wei value is < minimum purchase");
    _;
  }

  /**
   * @dev Constructor.
   * @param _token Token address.
   * @param _wallet Wallet address.
   * @param _unsoldTokenEscrow Address used as temporary deposit for unsold tokens.
   */
  constructor(ERC20 _token, address _wallet, address _unsoldTokenEscrow)
    Crowdsale(1, _wallet, _token) //  rate in base Crowdsale is unused. Use custom rates in IMP_Stages.sol instead;
    CappedCrowdsale(crowdsaleHardCap)
    IMP_Stages()
    IMP_MintWithPurpose(IMP_Token(_token).decimals())
    RefundEscrow(_wallet)
  public {
    require(_unsoldTokenEscrow != address(0));
    unsoldTokenEscrow = _unsoldTokenEscrow;
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
  function mintFor(IMP_TokenReservations.MintReserve _mintReserve, address _beneficiary, uint256 _tokenAmount) internal whenNotPaused {
    require(anyStageOpen(), "None of stages is currently open");
    
    super.mintFor(_mintReserve, _beneficiary, _tokenAmount);

    _deliverTokens(_beneficiary, _tokenAmount);
  }

  /**
   * PRIVATE
   */
  /**
   * @dev Finalizing crowdsale.
   */
   // TEST
  function finalizeCrowdsale() private {
    finalizeRefundEscrow();
    depositUnsoldTokenEscrow();
  }

  /**
   * @dev Enables refunds if needed, closes otherwise.
   */
  function finalizeRefundEscrow() private {
    if (capReached()) {
      close();
    } else {
      enableRefunds();
    }
  }

  //  Test
  /**
   * @dev Transfer tokens for unsold token escrow.
   */
  function depositUnsoldTokenEscrow() private {
    uint256 tokens = unsoldTokens().div(100).mul(unsoldTokenEscrowPercent);

    unsoldTokenEscrow.transfer(tokens);
  }

  /**
   * OVERRIDEN
   */

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
    minimumPurchase
  {
    if (anyStageOpen()) {
      super._preValidatePurchase(_beneficiary, _weiAmount);
    } else {
      msg.sender.transfer(msg.value);

      finalizeCrowdsale();
    }
  }

  /**
   * @dev Override to extend the way in which ether is converted to tokens.
   * @param _weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 _weiAmount)
    internal view returns (uint256)
  {
    uint256 rate;
    uint256 discount;
    (rate, discount) = currentRateAndDiscount();

    require(rate > 0, "rate cannot be 0");

    uint256 baseTokens = _weiAmount.mul(rate).div(10**18);
    uint256 bonusTokens = baseTokens.mul(discount).div(100);

    return baseTokens.add(bonusTokens);
  }

  /**
   * @dev Executed when a purchase has been validated and is ready to be executed. Not necessarily emits/sends tokens.
   * @param _beneficiary Address receiving the tokens
   * @param _tokenAmount Number of tokens to be purchased
   */
  function _processPurchase(
    address _beneficiary,
    uint256 _tokenAmount
  )
    internal
  {
    MintReserve mintReserve = MintReserve.privatePlacement;
    if(currentStage_preICO()) {
      mintReserve = MintReserve.preICO;
    } else if(currentStage_ico()) {
      mintReserve = MintReserve.ico;
    }

    updateMintedTokens(_tokenAmount, mintReserve);
    _deliverTokens(_beneficiary, _tokenAmount);
  }

  /**
   * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends its tokens.
   * @param _beneficiary Address performing the token purchase
   * @param _tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    IMP_Token(token).mint(_beneficiary, _tokenAmount);
  }

  /**
   * @dev Determines how ETH is stored/forwarded on purchases.
   */
  function _forwardFunds() internal {
    wallet.transfer(msg.value);
  }
}