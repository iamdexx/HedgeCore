// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {HedgehogCore} from "../core/HedgehogCore.sol";
import {HedgeToken} from "../core/HedgeToken.sol";
import {IHedgehogCore} from "../interfaces/IHedgehogCore.sol";

/// @title HedgehogRouter
/// @notice User-facing entry point for Hedgehog Protocol interactions.
///         Provides convenience functions for multi-step operations
///         (e.g., buy meme with S in one tx: S → HEDGE via hub → meme via spoke).
///         Also supports ERC20 quote tokens (e.g., USDC) for HEDGE trades and
///         meme purchases/sales.
contract HedgehogRouter {
    HedgehogCore public immutable core;
    HedgeToken public immutable hedgeToken;

    error InsufficientOutput();
    error ZeroAmount();

    constructor(HedgehogCore _core, HedgeToken _hedgeToken) {
        core = _core;
        hedgeToken = _hedgeToken;
    }

    // -------------------------------------------------------------------------
    //  Native S Routes
    // -------------------------------------------------------------------------

    /// @notice Buy meme tokens with native S in one transaction.
    ///         Routes: S → HEDGE (hub swap) → Meme (spoke buy) → transfer to user.
    function buyMemeWithS(uint256 spokeId, uint256 minTokensOut) external payable {
        if (msg.value == 0) revert ZeroAmount();

        core.hubBuyHedge{value: msg.value}(0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);

        core.spokeBuy(spokeId, hedgeBal, minTokensOut);

        uint256 memeBal = core.getSpokeBalance(spokeId, address(this));
        if (memeBal > 0) {
            core.spokeTransfer(spokeId, msg.sender, memeBal);
        }
    }

    /// @notice Sell meme tokens for native S in one transaction.
    ///         User must first call core.spokeApprove(spokeId, router, amount).
    function sellMemeForS(uint256 spokeId, uint256 tokenAmount, uint256 minSOut) external {
        if (tokenAmount == 0) revert ZeroAmount();

        core.spokeTransferFrom(spokeId, msg.sender, address(this), tokenAmount);

        core.spokeSell(spokeId, tokenAmount, 0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);
        core.hubSellHedge(hedgeBal, minSOut);

        uint256 sBal = address(this).balance;
        if (sBal < minSOut) revert InsufficientOutput();
        SafeTransferLib.safeTransferETH(msg.sender, sBal);
    }

    // -------------------------------------------------------------------------
    //  ERC20 Quote Token Routes (USDC, etc.)
    // -------------------------------------------------------------------------

    /// @notice Buy meme tokens with an ERC20 quote token (e.g., USDC).
    ///         Routes: ERC20 → HEDGE (ERC20 hub swap) → Meme (spoke buy) → user.
    ///         User must approve this router to spend quoteToken first.
    function buyMemeWithERC20(
        address quoteToken,
        uint256 quoteAmount,
        uint256 spokeId,
        uint256 minTokensOut
    ) external {
        if (quoteAmount == 0) revert ZeroAmount();

        SafeTransferLib.safeTransferFrom(quoteToken, msg.sender, address(this), quoteAmount);
        SafeTransferLib.safeApprove(quoteToken, address(core), quoteAmount);

        core.hubBuyHedgeERC20(quoteToken, quoteAmount, 0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);

        core.spokeBuy(spokeId, hedgeBal, minTokensOut);

        uint256 memeBal = core.getSpokeBalance(spokeId, address(this));
        if (memeBal > 0) {
            core.spokeTransfer(spokeId, msg.sender, memeBal);
        }
    }

    /// @notice Sell meme tokens for an ERC20 quote token (e.g., USDC).
    ///         Routes: Meme → HEDGE (spoke sell) → ERC20 (ERC20 hub swap) → user.
    ///         User must first call core.spokeApprove(spokeId, router, amount).
    function sellMemeForERC20(
        address quoteToken,
        uint256 spokeId,
        uint256 tokenAmount,
        uint256 minQuoteOut
    ) external {
        if (tokenAmount == 0) revert ZeroAmount();

        core.spokeTransferFrom(spokeId, msg.sender, address(this), tokenAmount);

        core.spokeSell(spokeId, tokenAmount, 0);

        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);
        core.hubSellHedgeERC20(quoteToken, hedgeBal, minQuoteOut);

        uint256 quoteBal = SafeTransferLib.balanceOf(quoteToken, address(this));
        if (quoteBal < minQuoteOut) revert InsufficientOutput();
        SafeTransferLib.safeTransfer(quoteToken, msg.sender, quoteBal);
    }

    // -------------------------------------------------------------------------
    //  Common
    // -------------------------------------------------------------------------

    /// @notice Launch a new spoke (convenience wrapper).
    function launchSpoke(IHedgehogCore.SpokeConfig calldata config) external payable {
        core.launchSpoke{value: msg.value}(config);
    }

    /// @notice Crank the POL engine (anyone can call).
    function crankPOL() external {
        core.crankPOL();
    }

    receive() external payable {}
}
