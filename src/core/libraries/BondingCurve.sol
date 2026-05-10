// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @title BondingCurve
/// @notice Linear bonding curve math: Price(S) = m * S
///         where S is total supply and m is the slope constant.
///
///         Buy cost  (S_old → S_new): C = m/2 * (S_new² − S_old²)
///         Sell revenue (S_old → S_new, S_new < S_old): R = m/2 * (S_old² − S_new²)
///         Reserve at supply S: Reserve = m/2 * S²
///
///         All values use 18-decimal (WAD) precision.
///         Protocol-favored rounding: buys round UP, sells round DOWN.
library BondingCurve {
    using FixedPointMathLib for uint256;

    error InsufficientReserve();
    error ZeroAmount();

    /// @notice Calculate the cost in HEDGE to buy tokens, increasing supply from
    ///         `currentSupply` to `currentSupply + tokensToBuy`.
    /// @param slope The slope constant `m` (WAD).
    /// @param currentSupply Current total supply of the meme token (WAD).
    /// @param tokensToBuy Number of tokens to purchase (WAD).
    /// @return cost The HEDGE cost, rounded UP (protocol-favored).
    function calculateBuyCost(uint256 slope, uint256 currentSupply, uint256 tokensToBuy)
        internal
        pure
        returns (uint256 cost)
    {
        if (tokensToBuy == 0) revert ZeroAmount();
        uint256 newSupply = currentSupply + tokensToBuy;
        // cost = m/2 * (newSupply² − currentSupply²)
        // = m * (newSupply² − currentSupply²) / 2
        uint256 newSupplySq = newSupply.mulWad(newSupply);
        uint256 oldSupplySq = currentSupply.mulWad(currentSupply);
        uint256 diffSq = newSupplySq - oldSupplySq;
        // Round up: use mulWadUp for slope, then divUp by 2
        cost = slope.mulWadUp(diffSq);
        cost = (cost + 1) / 2; // ceil division by 2
    }

    /// @notice Calculate how many tokens a buyer receives for a given HEDGE deposit.
    /// @param slope The slope constant `m` (WAD).
    /// @param currentSupply Current total supply of the meme token (WAD).
    /// @param hedgeIn Amount of HEDGE deposited (WAD).
    /// @return tokensOut Number of meme tokens minted.
    function calculateBuyReturn(uint256 slope, uint256 currentSupply, uint256 hedgeIn)
        internal
        pure
        returns (uint256 tokensOut)
    {
        if (hedgeIn == 0) revert ZeroAmount();
        // S_new = sqrt(S_old² + 2 * hedgeIn / m)
        uint256 oldSupplySq = currentSupply.mulWad(currentSupply);
        // 2 * hedgeIn / m — round down (fewer tokens = protocol-favored)
        uint256 twoHedgeOverM = (2 * hedgeIn).divWad(slope);
        uint256 newSupplySq = oldSupplySq + twoHedgeOverM;
        uint256 newSupply = FixedPointMathLib.sqrt(newSupplySq * 1e18);
        tokensOut = newSupply > currentSupply ? newSupply - currentSupply : 0;
    }

    /// @notice Calculate the HEDGE received from selling tokens, decreasing supply.
    /// @param slope The slope constant `m` (WAD).
    /// @param currentSupply Current total supply of the meme token (WAD).
    /// @param tokensToSell Number of tokens to sell (WAD).
    /// @return revenue The HEDGE returned, rounded DOWN (protocol-favored).
    function calculateSellRevenue(uint256 slope, uint256 currentSupply, uint256 tokensToSell)
        internal
        pure
        returns (uint256 revenue)
    {
        if (tokensToSell == 0) revert ZeroAmount();
        if (tokensToSell > currentSupply) revert InsufficientReserve();
        uint256 newSupply = currentSupply - tokensToSell;
        // revenue = m/2 * (currentSupply² − newSupply²)
        uint256 oldSupplySq = currentSupply.mulWad(currentSupply);
        uint256 newSupplySq = newSupply.mulWad(newSupply);
        uint256 diffSq = oldSupplySq - newSupplySq;
        // Round down: use mulWad (floor) for slope, then floor div by 2
        revenue = slope.mulWad(diffSq) / 2;
    }

    /// @notice Calculate the total HEDGE reserve backing a spoke at a given supply.
    /// @param slope The slope constant `m` (WAD).
    /// @param supply Current total supply (WAD).
    /// @return reserve Total HEDGE locked in the spoke.
    function calculateReserve(uint256 slope, uint256 supply)
        internal
        pure
        returns (uint256 reserve)
    {
        uint256 supplySq = supply.mulWad(supply);
        reserve = slope.mulWad(supplySq) / 2;
    }

    /// @notice Get the current spot price of a meme token.
    /// @param slope The slope constant `m` (WAD).
    /// @param supply Current total supply (WAD).
    /// @return price Spot price in HEDGE per meme token (WAD).
    function spotPrice(uint256 slope, uint256 supply) internal pure returns (uint256 price) {
        price = slope.mulWad(supply);
    }
}
