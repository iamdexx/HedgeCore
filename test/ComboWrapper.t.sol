// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {SpokeToken} from "../src/core/SpokeToken.sol";
import {ComboWrapper} from "../src/periphery/ComboWrapper.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";

contract ComboWrapperTest is Test {
    HedgeToken token;
    HedgehogCore core;
    ComboWrapper wrapper;

    address owner = address(0xA);
    address treasury = address(0xB);
    address alice = address(0xC);
    address bob = address(0xD);
    address referrer = address(0xE);

    uint256 constant SEED_S = 11 ether;
    uint256 constant SEED_HEDGE = 10_000_000e18;
    uint256 constant DEFAULT_SLOPE = 1e14;

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.startPrank(owner);

        token = new HedgeToken(owner);
        core = new HedgehogCore(owner, treasury, token);
        wrapper = new ComboWrapper(core);

        token.setMinter(owner);
        token.mint(owner, SEED_HEDGE);
        token.setMinter(address(core));

        token.approve(address(core), SEED_HEDGE);
        core.initializeHub{value: SEED_S}(SEED_HEDGE);

        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  Standard launch (no features)
    // -------------------------------------------------------------------------

    function test_launch_standard() public {
        _launchStandard();

        address tokenAddr = wrapper.getSpokeToken(0);
        assertTrue(tokenAddr != address(0));
        assertEq(SpokeToken(tokenAddr).name(), "TestMeme");
        assertEq(SpokeToken(tokenAddr).symbol(), "MEME");
    }

    function test_buyAndSell_standard() public {
        _launchStandard();
        vm.roll(block.number + 101);

        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0, address(0));

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 bal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(bal, 0);

        vm.roll(block.number + 1);

        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmt = bal > minFloor + 1e18 ? bal - minFloor - 1e18 : bal / 2;

        uint256 sBefore = alice.balance;
        vm.prank(alice, alice);
        wrapper.sellMemeForS(0, sellAmt, 0);
        assertGt(alice.balance, sBefore);
    }

    // -------------------------------------------------------------------------
    //  Referral feature
    // -------------------------------------------------------------------------

    function test_launch_withReferral() public {
        _launchWithReferral(200); // 2%
        vm.roll(block.number + 101);

        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0, referrer);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 aliceBal = SpokeToken(tokenAddr).balanceOf(alice);
        uint256 referrerBal = SpokeToken(tokenAddr).balanceOf(referrer);

        assertGt(aliceBal, 0);
        assertGt(referrerBal, 0);
        // Referrer should get 2% of total
        assertApproxEqRel(referrerBal, (aliceBal + referrerBal) * 200 / 10_000, 1e15);
    }

    function test_referral_noSelfReferral() public {
        _launchWithReferral(200);
        vm.roll(block.number + 101);

        // Alice refers herself — no referral paid
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0, alice);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 aliceBal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(aliceBal, 0);
        // All tokens go to alice (no split)
    }

    function test_referral_zeroAddress_noReferral() public {
        _launchWithReferral(200);
        vm.roll(block.number + 101);

        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0, address(0));

        // No referral paid
        address tokenAddr = wrapper.getSpokeToken(0);
        assertEq(SpokeToken(tokenAddr).balanceOf(referrer), 0);
    }

    // -------------------------------------------------------------------------
    //  Vesting feature
    // -------------------------------------------------------------------------

    function test_launch_withVesting() public {
        _launchWithVesting(1 days);
        vm.roll(block.number + 101);

        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0, address(0));

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 bal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(bal, 0);

        vm.roll(block.number + 1);

        // Try selling immediately — should revert (locked)
        vm.prank(alice, alice);
        vm.expectRevert(ComboWrapper.TokensLocked.selector);
        wrapper.sellMemeForS(0, bal / 2, 0);

        // Warp past vesting period
        vm.warp(block.timestamp + 1 days + 1);

        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmt = bal > minFloor + 1e18 ? bal - minFloor - 1e18 : bal / 2;

        vm.prank(alice, alice);
        wrapper.sellMemeForS(0, sellAmt, 0);
        // Should succeed after vesting expires
    }

    function test_vesting_isVested() public {
        _launchWithVesting(1 days);
        vm.roll(block.number + 101);

        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0, address(0));

        assertFalse(wrapper.isVested(0, alice));

        vm.warp(block.timestamp + 1 days + 1);
        assertTrue(wrapper.isVested(0, alice));
    }

    // -------------------------------------------------------------------------
    //  Combo: referral + vesting
    // -------------------------------------------------------------------------

    function test_launch_combo() public {
        vm.prank(owner);
        wrapper.launchSpoke{value: core.toll()}(
            ComboWrapper.LaunchConfig({
                name: "ComboMeme",
                symbol: "COMBO",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: true,
                referralBps: 300, // 3%
                vestingEnabled: true,
                vestingDuration: 2 days
            })
        );
        vm.roll(block.number + 101);

        // Buy with referral
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0, referrer);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 aliceBal = SpokeToken(tokenAddr).balanceOf(alice);
        uint256 referrerBal = SpokeToken(tokenAddr).balanceOf(referrer);
        assertGt(aliceBal, 0);
        assertGt(referrerBal, 0);

        vm.roll(block.number + 1);

        // Alice can't sell yet (vested)
        vm.prank(alice, alice);
        vm.expectRevert(ComboWrapper.TokensLocked.selector);
        wrapper.sellMemeForS(0, aliceBal / 2, 0);

        // After vesting, she can
        vm.warp(block.timestamp + 2 days + 1);
        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmt = aliceBal > minFloor + 1e18 ? aliceBal - minFloor - 1e18 : aliceBal / 2;

        vm.prank(alice, alice);
        wrapper.sellMemeForS(0, sellAmt, 0);
    }

    // -------------------------------------------------------------------------
    //  POL still works
    // -------------------------------------------------------------------------

    function test_feesFlowToOriginalCore() public {
        _launchStandard();
        vm.roll(block.number + 101);

        uint256 feesBefore = core.accumulatedFees();
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0, address(0));
        assertGt(core.accumulatedFees(), feesBefore);
    }

    function test_tollFlowsToOriginalPool() public {
        uint256 hubSBefore = core.hubReserveS();
        _launchStandard();
        assertGt(core.hubReserveS(), hubSBefore);
    }

    // -------------------------------------------------------------------------
    //  Edge cases
    // -------------------------------------------------------------------------

    function test_referralBps_tooHigh_reverts() public {
        uint256 tollAmt = core.toll();
        vm.prank(owner);
        vm.expectRevert(ComboWrapper.BpsTooHigh.selector);
        wrapper.launchSpoke{value: tollAmt}(
            ComboWrapper.LaunchConfig({
                name: "Bad",
                symbol: "BAD",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: true,
                referralBps: 600, // > 500 max
                vestingEnabled: false,
                vestingDuration: 0
            })
        );
    }

    function test_vestingDuration_tooLong_reverts() public {
        uint256 tollAmt = core.toll();
        vm.prank(owner);
        vm.expectRevert(ComboWrapper.VestingTooLong.selector);
        wrapper.launchSpoke{value: tollAmt}(
            ComboWrapper.LaunchConfig({
                name: "Bad",
                symbol: "BAD",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: false,
                referralBps: 0,
                vestingEnabled: true,
                vestingDuration: 31 days // > 30 days max
            })
        );
    }

    // -------------------------------------------------------------------------
    //  Helpers
    // -------------------------------------------------------------------------

    function _launchStandard() internal {
        vm.prank(owner);
        wrapper.launchSpoke{value: core.toll()}(
            ComboWrapper.LaunchConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: false,
                referralBps: 0,
                vestingEnabled: false,
                vestingDuration: 0
            })
        );
    }

    function _launchWithReferral(uint256 bps) internal {
        vm.prank(owner);
        wrapper.launchSpoke{value: core.toll()}(
            ComboWrapper.LaunchConfig({
                name: "RefMeme",
                symbol: "REF",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: true,
                referralBps: bps,
                vestingEnabled: false,
                vestingDuration: 0
            })
        );
    }

    function _launchWithVesting(uint256 duration) internal {
        vm.prank(owner);
        wrapper.launchSpoke{value: core.toll()}(
            ComboWrapper.LaunchConfig({
                name: "VestMeme",
                symbol: "VEST",
                slope: DEFAULT_SLOPE,
                metadataURI: "",
                referralEnabled: false,
                referralBps: 0,
                vestingEnabled: true,
                vestingDuration: duration
            })
        );
    }
}
