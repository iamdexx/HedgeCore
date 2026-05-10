// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";

contract HedgeTokenTest is Test {
    HedgeToken token;
    address owner = address(0xA);
    address minter = address(0xB);
    address user = address(0xC);

    function setUp() public {
        vm.prank(owner);
        token = new HedgeToken(owner);
        vm.prank(owner);
        token.setMinter(minter);
    }

    function test_nameAndSymbol() public view {
        assertEq(token.name(), "Hedgehog");
        assertEq(token.symbol(), "HEDGE");
    }

    function test_maxSupply() public view {
        assertEq(token.MAX_SUPPLY(), 5_000_000_000e18);
    }

    function test_mint() public {
        vm.prank(minter);
        token.mint(user, 1000e18);
        assertEq(token.balanceOf(user), 1000e18);
        assertEq(token.totalSupply(), 1000e18);
    }

    function test_mint_revertsNotMinter() public {
        vm.prank(user);
        vm.expectRevert(HedgeToken.NotMinter.selector);
        token.mint(user, 1000e18);
    }

    function test_mint_revertsMaxSupply() public {
        uint256 maxSupply = token.MAX_SUPPLY();
        vm.prank(minter);
        vm.expectRevert(HedgeToken.MaxSupplyExceeded.selector);
        token.mint(user, maxSupply + 1);
    }

    function test_burn() public {
        vm.prank(minter);
        token.mint(user, 1000e18);

        vm.prank(user);
        token.burn(500e18);
        assertEq(token.balanceOf(user), 500e18);
        assertEq(token.totalSupply(), 500e18);
    }

    function test_setMinter_revertsNotOwner() public {
        vm.prank(user);
        vm.expectRevert();
        token.setMinter(user);
    }

    function test_setMinter_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(HedgeToken.ZeroAddress.selector);
        token.setMinter(address(0));
    }

    function test_setMinter_updatesCorrectly() public {
        address newMinter = address(0xD);
        vm.prank(owner);
        token.setMinter(newMinter);
        assertEq(token.minter(), newMinter);

        vm.prank(newMinter);
        token.mint(user, 100e18);
        assertEq(token.balanceOf(user), 100e18);
    }
}
