// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";
import {BondingCurve} from "../src/core/libraries/BondingCurve.sol";

contract HedgehogCoreTest is Test {
    HedgeToken token;
    HedgehogCore core;

    address owner = address(0xA);
    address treasury = address(0xB);
    address alice = address(0xC);
    address bob = address(0xD);

    uint256 constant SEED_S = 11 ether; // $11 worth of S
    uint256 constant SEED_HEDGE = 10_000_000e18; // 10M HEDGE (1% of supply)
    uint256 constant DEFAULT_SLOPE = 1e14; // 0.0001

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.startPrank(owner);

        token = new HedgeToken(owner);
        core = new HedgehogCore(owner, treasury, token);
        token.setMinter(address(core));

        // Mint seed HEDGE to owner for hub initialization
        // (Core is minter, so we need to use core... but we need initial HEDGE)
        // For testing, temporarily set owner as minter, mint, then switch to core
        token.setMinter(owner);
        token.mint(owner, SEED_HEDGE);
        token.setMinter(address(core));

        // Approve and initialize hub
        token.approve(address(core), SEED_HEDGE);
        core.initializeHub{value: SEED_S}(SEED_HEDGE);

        vm.stopPrank();

        // Fund test accounts
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
    }

    // -------------------------------------------------------------------------
    //  Hub Pool Tests
    // -------------------------------------------------------------------------

    function test_hubInitialized() public view {
        assertEq(core.hubReserveS(), SEED_S);
        assertEq(core.hubReserveHedge(), SEED_HEDGE);
        assertGt(core.hubK(), 0);
    }

    function test_hubBuyHedge() public {
        vm.prank(alice);
        core.hubBuyHedge{value: 1 ether}(0);

        uint256 hedgeBal = token.balanceOf(alice);
        assertGt(hedgeBal, 0);
        assertEq(core.hubReserveS(), SEED_S + 1 ether);
    }

    function test_hubSellHedge() public {
        // First buy some HEDGE
        vm.prank(alice);
        core.hubBuyHedge{value: 1 ether}(0);
        uint256 hedgeBal = token.balanceOf(alice);

        // Now sell it back
        vm.startPrank(alice);
        token.approve(address(core), hedgeBal);
        uint256 balBefore = alice.balance;
        core.hubSellHedge(hedgeBal, 0);
        vm.stopPrank();

        uint256 sReceived = alice.balance - balBefore;
        assertGt(sReceived, 0);
        // Due to AMM slippage, we get less S back
        assertLt(sReceived, 1 ether);
    }

    function test_hubBuyHedge_slippageProtection() public {
        vm.prank(alice);
        // Ask for more HEDGE than possible
        vm.expectRevert(IHedgehogCore.SlippageExceeded.selector);
        core.hubBuyHedge{value: 1 ether}(type(uint256).max);
    }

    // -------------------------------------------------------------------------
    //  Spoke Launch Tests
    // -------------------------------------------------------------------------

    function test_launchSpoke() public {
        uint256 tollAmount = core.toll();

        vm.prank(alice);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: "ipfs://test"
            })
        );

        assertEq(core.getSpokeCount(), 1);

        IHedgehogCore.SpokeState memory state = core.getSpokeState(0);
        assertEq(state.supply, 0);
        assertEq(state.slope, DEFAULT_SLOPE);
        assertEq(state.creator, alice);
        assertFalse(state.graduated);
    }

    function test_launchSpoke_insufficientToll() public {
        vm.prank(alice);
        vm.expectRevert(IHedgehogCore.InsufficientToll.selector);
        core.launchSpoke{value: 1 ether}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );
    }

    function test_launchSpoke_slopeOutOfBounds() public {
        uint256 tollAmount = core.toll();

        vm.prank(alice);
        vm.expectRevert(IHedgehogCore.SlopeOutOfBounds.selector);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: 1, // way too low
                metadataURI: ""
            })
        );
    }

    function test_launchSpoke_treasuryReceivesHedge() public {
        uint256 tollAmount = core.toll();
        uint256 treasuryBefore = token.balanceOf(treasury);

        vm.prank(alice);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        uint256 treasuryAfter = token.balanceOf(treasury);
        assertGt(treasuryAfter, treasuryBefore);
    }

    function test_launchSpoke_hubLiquidityIncreases() public {
        uint256 tollAmount = core.toll();
        uint256 hubSBefore = core.hubReserveS();
        uint256 hubHedgeBefore = core.hubReserveHedge();

        vm.prank(alice);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        assertGt(core.hubReserveS(), hubSBefore);
        // Hub HEDGE may decrease due to treasury swap, but LP adds it back
        // The net effect depends on the split
    }

    // -------------------------------------------------------------------------
    //  Spoke Buy/Sell Tests
    // -------------------------------------------------------------------------

    function _launchAndFundAlice() internal returns (uint256 spokeId) {
        uint256 tollAmount = core.toll();
        vm.prank(alice, alice);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );
        spokeId = 0;

        // Advance past EOA protection window
        vm.roll(block.number + 101);

        // Alice buys HEDGE
        vm.prank(alice, alice);
        core.hubBuyHedge{value: 5 ether}(0);
    }

    function test_spokeBuy() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        uint256 buyAmount = hedgeBal / 2;

        vm.startPrank(alice, alice);
        token.approve(address(core), buyAmount);
        core.spokeBuy(spokeId, buyAmount, 0);
        vm.stopPrank();

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);
        assertGt(memeBal, 0);

        IHedgehogCore.SpokeState memory state = core.getSpokeState(spokeId);
        assertGt(state.supply, 0);
        assertGt(state.hedgeReserve, 0);
    }

    function test_spokeSell() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        uint256 buyAmount = hedgeBal / 2;

        vm.startPrank(alice, alice);
        token.approve(address(core), buyAmount);
        core.spokeBuy(spokeId, buyAmount, 0);

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);
        assertGt(memeBal, 0);

        // Sell half in next block
        vm.roll(block.number + 1);
        uint256 hedgeBefore = token.balanceOf(alice);
        core.spokeSell(spokeId, memeBal / 2, 0);
        vm.stopPrank();

        uint256 hedgeAfter = token.balanceOf(alice);
        assertGt(hedgeAfter, hedgeBefore);
    }

    function test_spokeBuy_sameBlockReverts() public {
        uint256 spokeId = _launchAndFundAlice();
        uint256 hedgeBal = token.balanceOf(alice);

        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 4, 0);

        // Same block, same user, same spoke → revert
        vm.expectRevert(IHedgehogCore.SameBlockTrade.selector);
        core.spokeBuy(spokeId, hedgeBal / 4, 0);
        vm.stopPrank();
    }

    function test_spokeBuy_differentUserSameBlock() public {
        uint256 spokeId = _launchAndFundAlice();

        // Bob also gets some HEDGE
        vm.prank(bob, bob);
        core.hubBuyHedge{value: 5 ether}(0);

        uint256 aliceHedge = token.balanceOf(alice);
        uint256 bobHedge = token.balanceOf(bob);

        // Alice buys
        vm.startPrank(alice, alice);
        token.approve(address(core), aliceHedge);
        core.spokeBuy(spokeId, aliceHedge / 4, 0);
        vm.stopPrank();

        // Bob buys same block — should work (different user)
        vm.startPrank(bob, bob);
        token.approve(address(core), bobHedge);
        core.spokeBuy(spokeId, bobHedge / 4, 0);
        vm.stopPrank();
    }

    function test_eoaProtection() public {
        // Launch a spoke without advancing past EOA window
        uint256 tollAmount = core.toll();
        vm.prank(alice, alice);
        core.launchSpoke{value: tollAmount}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        // Fund alice with HEDGE (hub swap is fine, no EOA check)
        vm.prank(alice, alice);
        core.hubBuyHedge{value: 5 ether}(0);
        uint256 hedgeBal = token.balanceOf(alice);

        // Trying to spokeBuy within EOA window with contract origin should revert
        // We simulate this by setting msg.sender != tx.origin
        vm.startPrank(alice, address(0x999));
        token.approve(address(core), hedgeBal);
        vm.expectRevert(IHedgehogCore.EOAOnlyPeriod.selector);
        core.spokeBuy(0, hedgeBal / 2, 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  Fee & POL Tests
    // -------------------------------------------------------------------------

    function test_feesAccumulate() public {
        uint256 spokeId = _launchAndFundAlice();
        uint256 hedgeBal = token.balanceOf(alice);

        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);
        vm.stopPrank();

        assertGt(core.accumulatedFees(), 0);
    }

    // -------------------------------------------------------------------------
    //  Owner Config Tests
    // -------------------------------------------------------------------------

    function test_setToll() public {
        vm.prank(owner);
        core.setToll(100 ether);
        assertEq(core.toll(), 100 ether);
    }

    function test_setFeeBps() public {
        vm.prank(owner);
        core.setFeeBps(200);
        assertEq(core.feeBps(), 200);
    }

    function test_setFeeBps_tooHigh() public {
        vm.prank(owner);
        vm.expectRevert("Fee too high");
        core.setFeeBps(600); // > MAX_FEE_BPS (500)
    }

    function test_setTreasury() public {
        address newTreasury = address(0xF);
        vm.prank(owner);
        core.setTreasury(newTreasury);
        assertEq(core.treasury(), newTreasury);
    }

    function test_onlyOwnerCanConfigure() public {
        vm.startPrank(alice);

        vm.expectRevert();
        core.setToll(1 ether);

        vm.expectRevert();
        core.setFeeBps(200);

        vm.expectRevert();
        core.setTreasury(alice);

        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  Spoke Transfer & Approval Tests
    // -------------------------------------------------------------------------

    function test_spokeTransfer() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);
        assertGt(memeBal, 0);

        uint256 transferAmt = memeBal / 3;
        core.spokeTransfer(spokeId, bob, transferAmt);
        vm.stopPrank();

        assertEq(core.getSpokeBalance(spokeId, alice), memeBal - transferAmt);
        assertEq(core.getSpokeBalance(spokeId, bob), transferAmt);
    }

    function test_spokeTransfer_insufficientBalance() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);

        vm.expectRevert(IHedgehogCore.InsufficientSpokeBalance.selector);
        core.spokeTransfer(spokeId, bob, memeBal + 1);
        vm.stopPrank();
    }

    function test_spokeApproveAndTransferFrom() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);
        uint256 approveAmt = memeBal / 2;

        // Alice approves bob
        core.spokeApprove(spokeId, bob, approveAmt);
        vm.stopPrank();

        assertEq(core.spokeAllowance(spokeId, alice, bob), approveAmt);

        // Bob transfers from alice to himself
        vm.prank(bob, bob);
        core.spokeTransferFrom(spokeId, alice, bob, approveAmt);

        assertEq(core.getSpokeBalance(spokeId, bob), approveAmt);
        assertEq(core.getSpokeBalance(spokeId, alice), memeBal - approveAmt);
        assertEq(core.spokeAllowance(spokeId, alice, bob), 0);
    }

    function test_spokeTransferFrom_insufficientAllowance() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);

        // Alice approves bob for small amount
        core.spokeApprove(spokeId, bob, 1e18);
        vm.stopPrank();

        // Bob tries to pull more than allowed
        vm.prank(bob, bob);
        vm.expectRevert(IHedgehogCore.InsufficientAllowance.selector);
        core.spokeTransferFrom(spokeId, alice, bob, 1e18 + 1);
    }

    function test_spokeApprove_maxAllowance() public {
        uint256 spokeId = _launchAndFundAlice();

        uint256 hedgeBal = token.balanceOf(alice);
        vm.startPrank(alice, alice);
        token.approve(address(core), hedgeBal);
        core.spokeBuy(spokeId, hedgeBal / 2, 0);

        uint256 memeBal = core.getSpokeBalance(spokeId, alice);

        // Max allowance should not decrease
        core.spokeApprove(spokeId, bob, type(uint256).max);
        vm.stopPrank();

        uint256 pullAmt = memeBal / 4;
        vm.prank(bob, bob);
        core.spokeTransferFrom(spokeId, alice, bob, pullAmt);

        // Max allowance should remain max
        assertEq(core.spokeAllowance(spokeId, alice, bob), type(uint256).max);
    }
}
