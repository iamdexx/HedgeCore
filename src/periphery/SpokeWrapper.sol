// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {HedgehogCore} from "../core/HedgehogCore.sol";
import {HedgeToken} from "../core/HedgeToken.sol";
import {SpokeToken} from "../core/SpokeToken.sol";
import {IHedgehogCore} from "../interfaces/IHedgehogCore.sol";

/// @title SpokeWrapper
/// @notice Wraps the existing HedgehogCore to produce real ERC-20 tokens for
///         each meme launch. All liquidity, fees, and POL mechanics flow through
///         the original HedgehogCore contract unchanged.
///
///         Users interact with this wrapper instead of HedgehogCore directly for
///         spoke operations. The wrapper holds internal spoke balances on behalf
///         of users and mints/burns real ERC-20 SpokeTokens to represent them.
///
///         Hub pool operations (buy/sell HEDGE) still go through HedgehogCore
///         or the original HedgehogRouter directly — this wrapper only handles
///         spoke (meme token) operations.
contract SpokeWrapper {
    HedgehogCore public immutable core;
    HedgeToken public immutable hedgeToken;

    // spokeId => deployed ERC-20 token address
    mapping(uint256 => address) public spokeTokens;

    error SpokeNotWrapped();
    error ZeroAmount();
    error InsufficientBalance();

    event SpokeTokenDeployed(uint256 indexed spokeId, address indexed token, string name, string symbol);

    constructor(HedgehogCore _core) {
        core = _core;
        hedgeToken = _core.hedgeToken();
    }

    // -------------------------------------------------------------------------
    //  Launch — deploys ERC-20 + calls core.launchSpoke
    // -------------------------------------------------------------------------

    /// @notice Launch a new meme token. Pays toll to the original HedgehogCore,
    ///         which handles all POL mechanics. Additionally deploys a real ERC-20
    ///         contract for the meme token.
    function launchSpoke(IHedgehogCore.SpokeConfig calldata config) external payable {
        // Get current spoke count (this will be the new spoke's ID)
        uint256 spokeId = core.spokeCount();

        // Forward toll to the original core — all POL/fee mechanics apply
        core.launchSpoke{value: msg.value}(config);

        // Deploy the ERC-20 token for this spoke
        SpokeToken token = new SpokeToken(config.name, config.symbol, address(this));
        spokeTokens[spokeId] = address(token);

        emit SpokeTokenDeployed(spokeId, address(token), config.name, config.symbol);
    }

    // -------------------------------------------------------------------------
    //  Buy — buy meme tokens with HEDGE, receive real ERC-20
    // -------------------------------------------------------------------------

    /// @notice Buy meme tokens on a spoke's bonding curve. HEDGE is spent on the
    ///         original core's bonding curve, and real ERC-20 tokens are minted
    ///         to the buyer.
    /// @param spokeId The spoke to buy on.
    /// @param hedgeAmount Amount of HEDGE to spend (must be pre-approved to this contract).
    /// @param minTokensOut Minimum meme tokens to receive.
    function spokeBuy(uint256 spokeId, uint256 hedgeAmount, uint256 minTokensOut) external {
        if (hedgeAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // Transfer HEDGE from user to this wrapper
        SafeTransferLib.safeTransferFrom(address(hedgeToken), msg.sender, address(this), hedgeAmount);

        // Approve core to pull HEDGE from wrapper
        hedgeToken.approve(address(core), hedgeAmount);

        // Get wrapper's internal balance before the buy
        uint256 balBefore = core.getSpokeBalance(spokeId, address(this));

        // Execute buy on original core (tokens credited to wrapper's internal balance)
        core.spokeBuy(spokeId, hedgeAmount, minTokensOut);

        // Calculate how many tokens were minted
        uint256 balAfter = core.getSpokeBalance(spokeId, address(this));
        uint256 tokensOut = balAfter - balBefore;

        // Mint real ERC-20 tokens to the buyer
        SpokeToken(tokenAddr).mint(msg.sender, tokensOut);
    }

    // -------------------------------------------------------------------------
    //  Sell — burn ERC-20, sell on core's bonding curve, receive HEDGE
    // -------------------------------------------------------------------------

    /// @notice Sell meme tokens on a spoke's bonding curve. Burns the user's
    ///         ERC-20 tokens and sells from the wrapper's internal balance on
    ///         the original core. HEDGE proceeds go to the seller.
    /// @param spokeId The spoke to sell on.
    /// @param tokenAmount Amount of meme tokens to sell.
    /// @param minHedgeOut Minimum HEDGE to receive.
    function spokeSell(uint256 spokeId, uint256 tokenAmount, uint256 minHedgeOut) external {
        if (tokenAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // Burn ERC-20 tokens from seller
        SpokeToken(tokenAddr).burn(msg.sender, tokenAmount);

        // Get wrapper's HEDGE balance before selling
        uint256 hedgeBefore = hedgeToken.balanceOf(address(this));

        // Sell from wrapper's internal balance on core
        core.spokeSell(spokeId, tokenAmount, minHedgeOut);

        // Calculate HEDGE received
        uint256 hedgeAfter = hedgeToken.balanceOf(address(this));
        uint256 hedgeOut = hedgeAfter - hedgeBefore;

        // Transfer HEDGE to seller
        SafeTransferLib.safeTransfer(address(hedgeToken), msg.sender, hedgeOut);
    }

    // -------------------------------------------------------------------------
    //  Buy with S — convenience: S → HEDGE (hub) → meme (spoke) in one tx
    // -------------------------------------------------------------------------

    /// @notice Buy meme tokens with native S in one transaction.
    ///         Routes: S → HEDGE (hub swap) → Meme (spoke buy via wrapper).
    function buyMemeWithS(uint256 spokeId, uint256 minTokensOut) external payable {
        if (msg.value == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // Swap S → HEDGE via hub pool
        core.hubBuyHedge{value: msg.value}(0);

        // All HEDGE now in this wrapper — approve core and buy spoke tokens
        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);

        // Get internal balance before
        uint256 balBefore = core.getSpokeBalance(spokeId, address(this));

        // Buy on bonding curve (wrapper accumulates internal balance)
        core.spokeBuy(spokeId, hedgeBal, minTokensOut);

        // Mint real ERC-20 to buyer
        uint256 balAfter = core.getSpokeBalance(spokeId, address(this));
        uint256 tokensOut = balAfter - balBefore;
        SpokeToken(tokenAddr).mint(msg.sender, tokensOut);
    }

    // -------------------------------------------------------------------------
    //  Sell for S — convenience: meme (spoke) → HEDGE → S in one tx
    // -------------------------------------------------------------------------

    /// @notice Sell meme tokens for native S in one transaction.
    ///         Routes: Meme (burn ERC-20, spoke sell) → HEDGE → S (hub swap).
    function sellMemeForS(uint256 spokeId, uint256 tokenAmount, uint256 minSOut) external {
        if (tokenAmount == 0) revert ZeroAmount();
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) revert SpokeNotWrapped();

        // Burn ERC-20 from seller
        SpokeToken(tokenAddr).burn(msg.sender, tokenAmount);

        // Sell from wrapper's internal balance → HEDGE
        core.spokeSell(spokeId, tokenAmount, 0);

        // Swap all HEDGE → S via hub pool
        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);
        core.hubSellHedge(hedgeBal, minSOut);

        // Send S to seller
        uint256 sBal = address(this).balance;
        SafeTransferLib.safeTransferETH(msg.sender, sBal);
    }

    // -------------------------------------------------------------------------
    //  View helpers
    // -------------------------------------------------------------------------

    /// @notice Get the ERC-20 token address for a wrapped spoke.
    function getSpokeToken(uint256 spokeId) external view returns (address) {
        return spokeTokens[spokeId];
    }

    /// @notice Get a user's ERC-20 balance for a spoke.
    function getSpokeBalance(uint256 spokeId, address account) external view returns (uint256) {
        address tokenAddr = spokeTokens[spokeId];
        if (tokenAddr == address(0)) return 0;
        return SpokeToken(tokenAddr).balanceOf(account);
    }

    receive() external payable {}
}
