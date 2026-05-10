// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {BondingCurve} from "../src/core/libraries/BondingCurve.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

/// @dev Wrapper contract to test library reverts via external calls.
contract BondingCurveHarness {
    function calculateBuyCost(uint256 slope, uint256 currentSupply, uint256 tokensToBuy)
        external
        pure
        returns (uint256)
    {
        return BondingCurve.calculateBuyCost(slope, currentSupply, tokensToBuy);
    }

    function calculateBuyReturn(uint256 slope, uint256 currentSupply, uint256 hedgeIn)
        external
        pure
        returns (uint256)
    {
        return BondingCurve.calculateBuyReturn(slope, currentSupply, hedgeIn);
    }

    function calculateSellRevenue(uint256 slope, uint256 currentSupply, uint256 tokensToSell)
        external
        pure
        returns (uint256)
    {
        return BondingCurve.calculateSellRevenue(slope, currentSupply, tokensToSell);
    }
}

contract BondingCurveTest is Test {
    using FixedPointMathLib for uint256;

    uint256 constant WAD = 1e18;
    uint256 constant SLOPE = 1e14; // m = 0.0001 in WAD

    BondingCurveHarness harness;

    function setUp() public {
        harness = new BondingCurveHarness();
    }

    function test_spotPrice() public pure {
        uint256 supply = 1000e18;
        uint256 price = BondingCurve.spotPrice(SLOPE, supply);
        assertApproxEqRel(price, 0.1e18, 1e15);
    }

    function test_reserve() public pure {
        uint256 supply = 1000e18;
        uint256 reserve = BondingCurve.calculateReserve(SLOPE, supply);
        assertApproxEqRel(reserve, 50e18, 1e15);
    }

    function test_buyCost() public pure {
        uint256 cost = BondingCurve.calculateBuyCost(SLOPE, 0, 100e18);
        assertApproxEqRel(cost, 0.5e18, 1e15);
    }

    function test_buyCost_fromExistingSupply() public pure {
        uint256 cost = BondingCurve.calculateBuyCost(SLOPE, 500e18, 100e18);
        assertApproxEqRel(cost, 5.5e18, 1e15);
    }

    function test_sellRevenue() public pure {
        uint256 revenue = BondingCurve.calculateSellRevenue(SLOPE, 1000e18, 100e18);
        assertApproxEqRel(revenue, 9.5e18, 1e15);
    }

    function test_buyReturn() public pure {
        uint256 tokensOut = BondingCurve.calculateBuyReturn(SLOPE, 0, 0.5e18);
        assertApproxEqRel(tokensOut, 100e18, 1e15);
    }

    function test_roundTrip_protocolFavored() public pure {
        uint256 supply0 = 0;
        uint256 tokensOut = BondingCurve.calculateBuyReturn(SLOPE, supply0, 10e18);
        uint256 hedgeBack = BondingCurve.calculateSellRevenue(SLOPE, tokensOut, tokensOut);
        assertLe(hedgeBack, 10e18);
    }

    function test_sellRevenue_revertsOnOverSell() public {
        vm.expectRevert(BondingCurve.InsufficientReserve.selector);
        harness.calculateSellRevenue(SLOPE, 100e18, 200e18);
    }

    function test_zeroAmount_buyCost_reverts() public {
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        harness.calculateBuyCost(SLOPE, 100e18, 0);
    }

    function test_zeroAmount_buyReturn_reverts() public {
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        harness.calculateBuyReturn(SLOPE, 100e18, 0);
    }

    function test_zeroAmount_sell_reverts() public {
        vm.expectRevert(BondingCurve.ZeroAmount.selector);
        harness.calculateSellRevenue(SLOPE, 100e18, 0);
    }

    function testFuzz_reserveAlwaysCoversExits(uint256 slope, uint256 supply) public pure {
        slope = bound(slope, 1e10, 1e22);
        supply = bound(supply, 1e18, 1e30);

        uint256 reserve = BondingCurve.calculateReserve(slope, supply);
        uint256 sellAll = BondingCurve.calculateSellRevenue(slope, supply, supply);

        assertGe(reserve, sellAll);
    }
}
