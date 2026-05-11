// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {HedgehogCore} from "../core/HedgehogCore.sol";
import {HedgeToken} from "../core/HedgeToken.sol";
import {SpokeToken} from "../core/SpokeToken.sol";
import {IHedgehogCore} from "../interfaces/IHedgehogCore.sol";

/// @title ComboWrapper
/// @notice Modular spoke wrapper with toggleable features per launch.
///         All liquidity/fees/POL flow to the original HedgehogCore pools.
///
///         Features (chosen at launch, immutable per spoke):
///           - Standard ERC-20 (always on)
///           - Referral: referrer gets % of meme tokens on referred buys
///           - Vesting: tokens locked for a configurable duration after purchase
///           - NFT: membership NFT minted when holdings exceed threshold (future)
contract ComboWrapper {
    HedgehogCore public immutable core;
    HedgeToken public immutable hedgeToken;
    address public owner;

    // -------------------------------------------------------------------------
    //  Feature flags per spoke
    // -------------------------------------------------------------------------

    struct SpokeFeatures {
        bool referralEnabled;
        uint256 referralBps;       // basis points (max 500 = 5%)
        bool vestingEnabled;
        uint256 vestingDuration;   // seconds tokens are locked after purchase
    }

    // spokeId => deployed ERC-20 token
    mapping(uint256 => address) public spokeTokens;
    // spokeId => features config
    mapping(uint256 => SpokeFeatures) public spokeFeatures;
    // spokeId => user => unlock timestamp (vesting)
    mapping(uint256 => mapping(address => uint256)) public vestingUnlock;

    // -------------------------------------------------------------------------
    //  Constants & errors
    // -------------------------------------------------------------------------

    uint256 public constant MAX_REFERRAL_BPS = 500;  // 5%
    uint256 public constant MAX_VESTING = 30 days;

    error SpokeNotWrapped();
    error ZeroAmount();
    error OnlyOwner();
    error BpsTooHigh();
    error VestingTooLong();
    error TokensLocked();

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    event SpokeTokenDeployed(
        uint256 indexed spokeId,
        address indexed token,
        string name,
        string symbol,
        bool referralEnabled,
        bool vestingEnabled
    );
    event ReferralPaid(uint256 indexed spokeId, address indexed referrer, address indexed buyer, uint256 amount);

    // -------------------------------------------------------------------------
    //  Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    // -------------------------------------------------------------------------
    //  Constructor
    // -------------------------------------------------------------------------

    constructor(HedgehogCore _core) {
        core = _core;
        hedgeToken = _core.hedgeToken();
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // -------------------------------------------------------------------------
    //  Launch — user picks features via config
    // -------------------------------------------------------------------------

    struct LaunchConfig {
        // Standard spoke config
        string name;
        string symbol;
        uint256 slope;
        string metadataURI;
        // Feature toggles
        bool referralEnabled;
        uint256 referralBps;     // ignored if referralEnabled = false
        bool vestingEnabled;
        uint256 vestingDuration; // seconds; ignored if vestingEnabled = false
    }

    function launchSpoke(LaunchConfig calldata config) external payable {
        if (config.referralEnabled && config.referralBps > MAX_REFERRAL_BPS) revert BpsTooHigh();
        if (config.vestingEnabled && config.vestingDuration > MAX_VESTING) revert VestingTooLong();

        uint256 spokeId = core.spokeCount();

        // Forward to original core
        core.launchSpoke{value: msg.value}(
            IHedgehogCore.SpokeConfig({
                name: config.name,
                symbol: config.symbol,
                slope: config.slope,
                metadataURI: config.metadataURI
            })
        );

        // Deploy ERC-20
        SpokeToken token = new SpokeToken(config.name, config.symbol, address(this));
        spokeTokens[spokeId] = address(token);

        // Store features
        spokeFeatures[spokeId] = SpokeFeatures({
            referralEnabled: config.referralEnabled,
            referralBps: config.referralEnabled ? config.referralBps : 0,
            vestingEnabled: config.vestingEnabled,
            vestingDuration: config.vestingEnabled ? config.vestingDuration : 0
        });

        emit SpokeTokenDeployed(
            spokeId,
            address(token),
            config.name,
            config.symbol,
            config.referralEnabled,
            config.vestingEnabled
        );
    }

    // -------------------------------------------------------------------------
    //  Buy with HEDGE
    // -------------------------------------------------------------------------

    /// @param referrer Address to receive referral cut (address(0) = no referral).
    function spokeBuy(uint256 spokeId, uint256 hedgeAmount, uint256 minTokensOut, address referrer) external {
        if (hedgeAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        SafeTransferLib.safeTransferFrom(address(hedgeToken), msg.sender, address(this), hedgeAmount);
        hedgeToken.approve(address(core), hedgeAmount);

        uint256 balBefore = core.getSpokeBalance(spokeId, address(this));
        core.spokeBuy(spokeId, hedgeAmount, minTokensOut);
        uint256 tokensOut = core.getSpokeBalance(spokeId, address(this)) - balBefore;

        _distributeTokens(spokeId, tokenAddr, tokensOut, msg.sender, referrer);
    }

    // -------------------------------------------------------------------------
    //  Buy with S (convenience)
    // -------------------------------------------------------------------------

    function buyMemeWithS(uint256 spokeId, uint256 minTokensOut, address referrer) external payable {
        if (msg.value == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // S → HEDGE via hub
        core.hubBuyHedge{value: msg.value}(0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);

        uint256 balBefore = core.getSpokeBalance(spokeId, address(this));
        core.spokeBuy(spokeId, hedgeBal, minTokensOut);
        uint256 tokensOut = core.getSpokeBalance(spokeId, address(this)) - balBefore;

        _distributeTokens(spokeId, tokenAddr, tokensOut, msg.sender, referrer);
    }

    // -------------------------------------------------------------------------
    //  Sell
    // -------------------------------------------------------------------------

    function spokeSell(uint256 spokeId, uint256 tokenAmount, uint256 minHedgeOut) external {
        if (tokenAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // Check vesting lock
        _enforceVesting(spokeId, msg.sender);

        SpokeToken(tokenAddr).burn(msg.sender, tokenAmount);

        uint256 hedgeBefore = hedgeToken.balanceOf(address(this));
        core.spokeSell(spokeId, tokenAmount, minHedgeOut);
        uint256 hedgeOut = hedgeToken.balanceOf(address(this)) - hedgeBefore;

        SafeTransferLib.safeTransfer(address(hedgeToken), msg.sender, hedgeOut);
    }

    function sellMemeForS(uint256 spokeId, uint256 tokenAmount, uint256 minSOut) external {
        if (tokenAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        _enforceVesting(spokeId, msg.sender);

        SpokeToken(tokenAddr).burn(msg.sender, tokenAmount);

        core.spokeSell(spokeId, tokenAmount, 0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);
        core.hubSellHedge(hedgeBal, minSOut);

        SafeTransferLib.safeTransferETH(msg.sender, address(this).balance);
    }

    // -------------------------------------------------------------------------
    //  Internal: distribute tokens with referral + set vesting
    // -------------------------------------------------------------------------

    function _distributeTokens(
        uint256 spokeId,
        address tokenAddr,
        uint256 tokensOut,
        address buyer,
        address referrer
    ) internal {
        SpokeFeatures storage feat = spokeFeatures[spokeId];

        // Referral split
        uint256 referralAmount = 0;
        if (feat.referralEnabled && referrer != address(0) && referrer != buyer && feat.referralBps > 0) {
            referralAmount = tokensOut * feat.referralBps / 10_000;
            SpokeToken(tokenAddr).mint(referrer, referralAmount);
            emit ReferralPaid(spokeId, referrer, buyer, referralAmount);
        }

        // Mint to buyer
        SpokeToken(tokenAddr).mint(buyer, tokensOut - referralAmount);

        // Set vesting lock
        if (feat.vestingEnabled && feat.vestingDuration > 0) {
            uint256 newUnlock = block.timestamp + feat.vestingDuration;
            // Only extend, never shorten (multiple buys extend the lock)
            if (newUnlock > vestingUnlock[spokeId][buyer]) {
                vestingUnlock[spokeId][buyer] = newUnlock;
            }
        }
    }

    function _enforceVesting(uint256 spokeId, address seller) internal view {
        SpokeFeatures storage feat = spokeFeatures[spokeId];
        if (feat.vestingEnabled) {
            if (block.timestamp < vestingUnlock[spokeId][seller]) revert TokensLocked();
        }
    }

    // -------------------------------------------------------------------------
    //  View helpers
    // -------------------------------------------------------------------------

    function getSpokeToken(uint256 spokeId) external view returns (address) {
        return spokeTokens[spokeId];
    }

    function getSpokeBalance(uint256 spokeId, address account) external view returns (uint256) {
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) return 0;
        return SpokeToken(tokenAddr).balanceOf(account);
    }

    function getVestingUnlock(uint256 spokeId, address account) external view returns (uint256) {
        return vestingUnlock[spokeId][account];
    }

    function isVested(uint256 spokeId, address account) external view returns (bool) {
        SpokeFeatures storage feat = spokeFeatures[spokeId];
        if (!feat.vestingEnabled) return true;
        return block.timestamp >= vestingUnlock[spokeId][account];
    }

    receive() external payable {}
}
