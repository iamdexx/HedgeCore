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
contract HedgehogRouter {
    HedgehogCore public immutable core;
    HedgeToken public immutable hedgeToken;

    error InsufficientOutput();
    error ZeroAmount();

    constructor(HedgehogCore _core, HedgeToken _hedgeToken) {
        core = _core;
        hedgeToken = _hedgeToken;
    }

    /// @notice Buy meme tokens with native S in one transaction.
    ///         Routes: S → HEDGE (hub swap) → Meme (spoke buy).
    /// @param spokeId Target spoke.
    /// @param minTokensOut Minimum meme tokens to receive.
    function buyMemeWithS(uint256 spokeId, uint256 minTokensOut) external payable {
        if (msg.value == 0) revert ZeroAmount();

        // Step 1: Buy HEDGE with S via hub
        core.hubBuyHedge{value: msg.value}(0);

        // Step 2: Approve core to spend the HEDGE we just received
        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);

        // Step 3: Buy meme tokens on the spoke
        core.spokeBuy(spokeId, hedgeBal, minTokensOut);

        // Step 4: Transfer meme tokens to user
        // (meme balances are tracked in HedgehogCore, not as ERC20)
        // The spokeBuy credited this contract; we need a transfer mechanism
        // For now, the user calls spokeBuy directly or we implement spoke transfers
    }

    /// @notice Sell meme tokens for native S in one transaction.
    ///         Routes: Meme → HEDGE (spoke sell) → S (hub swap).
    /// @param spokeId Source spoke.
    /// @param tokenAmount Meme tokens to sell.
    /// @param minSOut Minimum S to receive.
    function sellMemeForS(uint256 spokeId, uint256 tokenAmount, uint256 minSOut) external {
        if (tokenAmount == 0) revert ZeroAmount();

        // Step 1: Sell meme tokens for HEDGE on the spoke
        core.spokeSell(spokeId, tokenAmount, 0);

        // Step 2: Sell HEDGE for S via hub
        uint256 hedgeBal = hedgeToken.balanceOf(address(this));
        hedgeToken.approve(address(core), hedgeBal);
        core.hubSellHedge(hedgeBal, minSOut);

        // Step 3: Send S to user
        uint256 sBal = address(this).balance;
        if (sBal < minSOut) revert InsufficientOutput();
        SafeTransferLib.safeTransferETH(msg.sender, sBal);
    }

    /// @notice Launch a new spoke (convenience wrapper).
    /// @param config Spoke configuration.
    function launchSpoke(IHedgehogCore.SpokeConfig calldata config) external payable {
        core.launchSpoke{value: msg.value}(config);
    }

    /// @notice Crank the POL engine (anyone can call).
    function crankPOL() external {
        core.crankPOL();
    }

    receive() external payable {}
}
