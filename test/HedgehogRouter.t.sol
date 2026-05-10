// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";

contract HedgehogRouterTest is Test {
    HedgeToken token;
    HedgehogCore core;
    HedgehogRouter router;

    address owner = address(0xA);
    address treasury = address(0xB);
    address alice = address(0xC);

    uint256 constant SEED_S = 11 ether;
    uint256 constant SEED_HEDGE = 10_000_000e18;
    uint256 constant DEFAULT_SLOPE = 1e14;

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(alice, 100 ether);
        vm.startPrank(owner, owner);

        token = new HedgeToken(owner);
        core = new HedgehogCore(owner, treasury, token);
        router = new HedgehogRouter(core, token);

        // Mint seed HEDGE
        token.setMinter(owner);
        token.mint(owner, SEED_HEDGE);
        token.setMinter(address(core));

        // Initialize hub
        token.approve(address(core), SEED_HEDGE);
        core.initializeHub{value: SEED_S}(SEED_HEDGE);

        // Launch a spoke
        core.launchSpoke{value: core.toll()}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        vm.stopPrank();

        // Advance past EOA protection
        vm.roll(block.number + 101);
    }

    function test_buyMemeWithS() public {
        vm.prank(alice, alice);
        router.buyMemeWithS{value: 2 ether}(0, 0);

        uint256 memeBal = core.getSpokeBalance(0, alice);
        assertGt(memeBal, 0, "Alice should have meme tokens");
        assertEq(core.getSpokeBalance(0, address(router)), 0, "Router should have 0 meme tokens");
    }

    function test_sellMemeForS() public {
        // First buy some meme tokens
        vm.prank(alice, alice);
        router.buyMemeWithS{value: 2 ether}(0, 0);

        uint256 memeBal = core.getSpokeBalance(0, alice);
        assertGt(memeBal, 0);

        // Advance block for same-block lock
        vm.roll(block.number + 1);

        uint256 aliceSBefore = alice.balance;

        // Sell partial (leave enough above minSpokeSupply floor)
        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmount = memeBal > minFloor + 1e18 ? memeBal - minFloor - 1e18 : memeBal / 2;

        // Alice approves router, then sells
        vm.startPrank(alice, alice);
        core.spokeApprove(0, address(router), sellAmount);
        router.sellMemeForS(0, sellAmount, 0);
        vm.stopPrank();

        uint256 aliceSAfter = alice.balance;
        assertGt(aliceSAfter, aliceSBefore, "Alice should have received S");
    }

    function test_buyMemeWithS_zeroValue() public {
        vm.prank(alice, alice);
        vm.expectRevert(HedgehogRouter.ZeroAmount.selector);
        router.buyMemeWithS{value: 0}(0, 0);
    }

    function test_sellMemeForS_zeroAmount() public {
        vm.prank(alice, alice);
        vm.expectRevert(HedgehogRouter.ZeroAmount.selector);
        router.sellMemeForS(0, 0, 0);
    }

    function test_roundTrip_S_to_meme_to_S() public {
        uint256 startBalance = alice.balance;

        // Buy meme with 5 S (enough to exceed minSpokeSupply floor)
        vm.prank(alice, alice);
        router.buyMemeWithS{value: 5 ether}(0, 0);

        uint256 memeBal = core.getSpokeBalance(0, alice);
        assertGt(memeBal, 0);

        // Advance block
        vm.roll(block.number + 1);

        // Sell partial (leave floor intact)
        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmount = memeBal > minFloor + 1e18 ? memeBal - minFloor - 1e18 : memeBal / 2;

        vm.startPrank(alice, alice);
        core.spokeApprove(0, address(router), sellAmount);
        router.sellMemeForS(0, sellAmount, 0);
        vm.stopPrank();

        uint256 endBalance = alice.balance;

        // Should get back less than started due to fees + bonding curve spread + floor retention
        assertLt(endBalance, startBalance, "Round trip should cost fees");
    }

    function test_launchSpoke_viaRouter() public {
        uint256 tollAmount = core.toll();

        vm.prank(alice, alice);
        router.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "RouterMeme",
                symbol: "RMEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        assertEq(core.getSpokeCount(), 2);
    }
}
