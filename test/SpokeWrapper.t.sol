// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {SpokeToken} from "../src/core/SpokeToken.sol";
import {SpokeWrapper} from "../src/periphery/SpokeWrapper.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";

contract SpokeWrapperTest is Test {
    HedgeToken token;
    HedgehogCore core;
    SpokeWrapper wrapper;

    address owner = address(0xA);
    address treasury = address(0xB);
    address alice = address(0xC);
    address bob = address(0xD);

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
        wrapper = new SpokeWrapper(core);

        // Mint seed HEDGE
        token.setMinter(owner);
        token.mint(owner, SEED_HEDGE);
        token.setMinter(address(core));

        // Initialize hub
        token.approve(address(core), SEED_HEDGE);
        core.initializeHub{value: SEED_S}(SEED_HEDGE);

        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  Launch via wrapper deploys ERC-20
    // -------------------------------------------------------------------------

    function test_launchSpoke_deploysERC20() public {
        vm.prank(alice);
        wrapper.launchSpoke{value: core.toll()}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: "ipfs://test"
            })
        );

        // Spoke registered on core
        assertEq(core.getSpokeCount(), 1);

        // ERC-20 deployed
        address tokenAddr = wrapper.getSpokeToken(0);
        assertTrue(tokenAddr != address(0));

        // Token has correct metadata
        SpokeToken spokeToken = SpokeToken(tokenAddr);
        assertEq(spokeToken.name(), "TestMeme");
        assertEq(spokeToken.symbol(), "MEME");
        assertEq(spokeToken.decimals(), 18);
        assertEq(spokeToken.totalSupply(), 0);
    }

    // -------------------------------------------------------------------------
    //  Buy via wrapper mints ERC-20 to buyer
    // -------------------------------------------------------------------------

    function test_spokeBuy_mintsERC20() public {
        _launchViaWrapper();

        // Alice buys HEDGE first
        vm.prank(alice);
        core.hubBuyHedge{value: 5 ether}(0);

        uint256 hedgeBal = token.balanceOf(alice);
        assertGt(hedgeBal, 0);

        // Advance past EOA protection
        vm.roll(block.number + 101);

        // Alice buys meme via wrapper
        vm.startPrank(alice);
        token.approve(address(wrapper), hedgeBal);
        wrapper.spokeBuy(0, hedgeBal, 0);
        vm.stopPrank();

        // Alice has real ERC-20 tokens
        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 memeBal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(memeBal, 0);

        // Wrapper holds internal balance on core
        assertGt(core.getSpokeBalance(0, address(wrapper)), 0);

        // Alice has no internal balance on core (only via ERC-20)
        assertEq(core.getSpokeBalance(0, alice), 0);
    }

    // -------------------------------------------------------------------------
    //  Buy with S — convenience route
    // -------------------------------------------------------------------------

    function test_buyMemeWithS() public {
        _launchViaWrapper();

        // Advance past EOA protection
        vm.roll(block.number + 101);

        // Alice buys meme with S in one tx
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0);

        // Alice has real ERC-20 tokens
        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 memeBal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(memeBal, 0);
    }

    // -------------------------------------------------------------------------
    //  Sell burns ERC-20 and returns HEDGE
    // -------------------------------------------------------------------------

    function test_spokeSell_burnsERC20() public {
        _launchViaWrapper();
        vm.roll(block.number + 101);

        // Alice buys with S
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 memeBal = SpokeToken(tokenAddr).balanceOf(alice);
        assertGt(memeBal, 0);

        // Advance block for same-block protection
        vm.roll(block.number + 1);

        // Sell partial (stay above floor)
        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmount = memeBal > minFloor + 1e18 ? memeBal - minFloor - 1e18 : memeBal / 2;

        uint256 hedgeBefore = token.balanceOf(alice);

        vm.prank(alice);
        wrapper.spokeSell(0, sellAmount, 0);

        // Alice received HEDGE
        uint256 hedgeAfter = token.balanceOf(alice);
        assertGt(hedgeAfter, hedgeBefore);

        // ERC-20 balance decreased
        uint256 memeBalAfter = SpokeToken(tokenAddr).balanceOf(alice);
        assertEq(memeBalAfter, memeBal - sellAmount);
    }

    // -------------------------------------------------------------------------
    //  Sell for S — convenience route
    // -------------------------------------------------------------------------

    function test_sellMemeForS() public {
        _launchViaWrapper();
        vm.roll(block.number + 101);

        // Alice buys with S
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 memeBal = SpokeToken(tokenAddr).balanceOf(alice);

        // Advance block
        vm.roll(block.number + 1);

        uint256 minFloor = core.minSpokeSupply();
        uint256 sellAmount = memeBal > minFloor + 1e18 ? memeBal - minFloor - 1e18 : memeBal / 2;

        uint256 sBefore = alice.balance;

        vm.prank(alice, alice);
        wrapper.sellMemeForS(0, sellAmount, 0);

        uint256 sAfter = alice.balance;
        assertGt(sAfter, sBefore, "Alice should have received S");
    }

    // -------------------------------------------------------------------------
    //  ERC-20 is freely transferable
    // -------------------------------------------------------------------------

    function test_erc20Transfer() public {
        _launchViaWrapper();
        vm.roll(block.number + 101);

        // Alice buys
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 2 ether}(0, 0);

        address tokenAddr = wrapper.getSpokeToken(0);
        uint256 memeBal = SpokeToken(tokenAddr).balanceOf(alice);

        // Alice transfers half to Bob
        uint256 transferAmt = memeBal / 2;
        vm.prank(alice);
        SpokeToken(tokenAddr).transfer(bob, transferAmt);

        assertEq(SpokeToken(tokenAddr).balanceOf(alice), memeBal - transferAmt);
        assertEq(SpokeToken(tokenAddr).balanceOf(bob), transferAmt);
    }

    // -------------------------------------------------------------------------
    //  POL fees still accumulate in original core
    // -------------------------------------------------------------------------

    function test_feesAccumulateInCore() public {
        _launchViaWrapper();
        vm.roll(block.number + 101);

        uint256 feesBefore = core.accumulatedFees();

        // Buy generates fees
        vm.prank(alice, alice);
        wrapper.buyMemeWithS{value: 5 ether}(0, 0);

        uint256 feesAfter = core.accumulatedFees();
        assertGt(feesAfter, feesBefore, "Fees should accumulate in original core");
    }

    // -------------------------------------------------------------------------
    //  Hub pool reserves grow from toll
    // -------------------------------------------------------------------------

    function test_tollGoesToOriginalPools() public {
        uint256 hubSBefore = core.hubReserveS();

        vm.prank(alice);
        wrapper.launchSpoke{value: core.toll()}(
            IHedgehogCore.SpokeConfig({
                name: "PoolTest",
                symbol: "PT",
                slope: DEFAULT_SLOPE,
                metadataURI: ""
            })
        );

        uint256 hubSAfter = core.hubReserveS();
        assertGt(hubSAfter, hubSBefore, "S should flow into original hub pool");
    }

    // -------------------------------------------------------------------------
    //  Helpers
    // -------------------------------------------------------------------------

    function _launchViaWrapper() internal {
        vm.prank(owner);
        wrapper.launchSpoke{value: core.toll()}(
            IHedgehogCore.SpokeConfig({
                name: "TestMeme",
                symbol: "MEME",
                slope: DEFAULT_SLOPE,
                metadataURI: "ipfs://test"
            })
        );
    }
}
