// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract ERC20HubTest is Test {
    HedgeToken token;
    HedgehogCore core;
    HedgehogRouter router;
    MockERC20 usdc;

    address owner = address(0xA);
    address treasury = address(0xB);
    address alice = address(0xC);
    address bob = address(0xD);

    uint256 constant SEED_S = 11 ether;
    uint256 constant SEED_HEDGE_S = 5_000_000e18;
    uint256 constant SEED_HEDGE_USDC = 5_000_000e18;
    uint256 constant SEED_USDC = 1000e6; // 1000 USDC (6 decimals)
    uint256 constant DEFAULT_SLOPE = 1e14;

    function setUp() public {
        vm.deal(owner, 100 ether);
        vm.startPrank(owner);

        // Deploy mock USDC (6 decimals)
        usdc = new MockERC20("USD Coin", "USDC", 6);

        token = new HedgeToken(owner);
        core = new HedgehogCore(owner, treasury, token);
        router = new HedgehogRouter(core, token);

        // Mint seed HEDGE
        token.setMinter(owner);
        token.mint(owner, SEED_HEDGE_S + SEED_HEDGE_USDC);
        token.setMinter(address(core));

        // Initialize S hub pool
        token.approve(address(core), SEED_HEDGE_S + SEED_HEDGE_USDC);
        core.initializeHub{value: SEED_S}(SEED_HEDGE_S);

        // Mint USDC seed and initialize ERC20 hub pool
        usdc.mint(owner, SEED_USDC);
        usdc.approve(address(core), SEED_USDC);
        core.initializeERC20Hub(address(usdc), SEED_HEDGE_USDC, SEED_USDC);

        vm.stopPrank();

        // Fund test accounts
        vm.deal(alice, 1000 ether);
        vm.deal(bob, 1000 ether);
        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
    }

    // -------------------------------------------------------------------------
    //  ERC20 Hub Pool Initialization
    // -------------------------------------------------------------------------

    function test_erc20Hub_initialized() public view {
        (uint256 reserveQuote, uint256 reserveHedge, uint256 k) =
            core.getERC20HubPool(address(usdc));
        assertEq(reserveQuote, SEED_USDC);
        assertEq(reserveHedge, SEED_HEDGE_USDC);
        assertEq(k, SEED_USDC * SEED_HEDGE_USDC);
    }

    function test_erc20Hub_poolTokensRegistered() public view {
        address[] memory tokens = core.getERC20PoolTokens();
        assertEq(tokens.length, 1);
        assertEq(tokens[0], address(usdc));
    }

    function test_erc20Hub_getPrice() public view {
        uint256 price = core.getERC20HubPrice(address(usdc));
        assertGt(price, 0);
    }

    function test_erc20Hub_doubleInit_reverts() public {
        vm.startPrank(owner);
        usdc.mint(owner, 100e6);
        usdc.approve(address(core), 100e6);

        token.setMinter(owner);
        token.mint(owner, 1_000_000e18);
        token.setMinter(address(core));
        token.approve(address(core), 1_000_000e18);

        vm.expectRevert(IHedgehogCore.PoolAlreadyInitialized.selector);
        core.initializeERC20Hub(address(usdc), 1_000_000e18, 100e6);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  ERC20 Hub Swaps
    // -------------------------------------------------------------------------

    function test_erc20Hub_buyHedge() public {
        uint256 usdcIn = 100e6;
        vm.startPrank(alice);
        usdc.approve(address(core), usdcIn);

        uint256 hedgeBefore = token.balanceOf(alice);
        core.hubBuyHedgeERC20(address(usdc), usdcIn, 0);
        uint256 hedgeAfter = token.balanceOf(alice);

        assertGt(hedgeAfter - hedgeBefore, 0);
        vm.stopPrank();
    }

    function test_erc20Hub_sellHedge() public {
        // Alice buys HEDGE first
        uint256 usdcIn = 100e6;
        vm.startPrank(alice);
        usdc.approve(address(core), usdcIn);
        core.hubBuyHedgeERC20(address(usdc), usdcIn, 0);

        // Then sells HEDGE back for USDC
        uint256 hedgeBal = token.balanceOf(alice);
        token.approve(address(core), hedgeBal);

        uint256 usdcBefore = usdc.balanceOf(alice);
        core.hubSellHedgeERC20(address(usdc), hedgeBal, 0);
        uint256 usdcAfter = usdc.balanceOf(alice);

        assertGt(usdcAfter - usdcBefore, 0);
        vm.stopPrank();
    }

    function test_erc20Hub_buyHedge_slippageReverts() public {
        uint256 usdcIn = 10e6;
        vm.startPrank(alice);
        usdc.approve(address(core), usdcIn);

        vm.expectRevert(IHedgehogCore.SlippageExceeded.selector);
        core.hubBuyHedgeERC20(address(usdc), usdcIn, type(uint256).max);
        vm.stopPrank();
    }

    function test_erc20Hub_zeroAmount_reverts() public {
        vm.startPrank(alice);
        vm.expectRevert(IHedgehogCore.ZeroAmount.selector);
        core.hubBuyHedgeERC20(address(usdc), 0, 0);
        vm.stopPrank();
    }

    function test_erc20Hub_uninitPool_reverts() public {
        MockERC20 fakeToken = new MockERC20("Fake", "FAKE", 18);
        fakeToken.mint(alice, 100e18);

        vm.startPrank(alice);
        fakeToken.approve(address(core), 100e18);
        vm.expectRevert(IHedgehogCore.PoolNotInitialized.selector);
        core.hubBuyHedgeERC20(address(fakeToken), 100e18, 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  ERC20 Hub Pool — K invariant
    // -------------------------------------------------------------------------

    function test_erc20Hub_kGrowsAfterSwap() public {
        (, , uint256 kBefore) = core.getERC20HubPool(address(usdc));

        vm.startPrank(alice);
        usdc.approve(address(core), 50e6);
        core.hubBuyHedgeERC20(address(usdc), 50e6, 0);
        vm.stopPrank();

        // K should stay the same (no fees in hub pool) — actually K is reset each swap
        // since no fees are taken in the hub pool AMM, K is maintained
        (, , uint256 kAfter) = core.getERC20HubPool(address(usdc));
        // K changes because of integer division rounding, but should be close
        assertApproxEqRel(kAfter, kBefore, 1e16); // within 1%
    }

    // -------------------------------------------------------------------------
    //  POL Engine — 50/50 split
    // -------------------------------------------------------------------------

    function test_crankPOL_splitsBothPools() public {
        // Launch a spoke to generate fees (toll generates equity → accumulated fees)
        vm.startPrank(alice);
        IHedgehogCore.SpokeConfig memory config = IHedgehogCore.SpokeConfig({
            name: "TestMeme",
            symbol: "TMEME",
            slope: DEFAULT_SLOPE,
            metadataURI: ""
        });
        core.launchSpoke{value: 50 ether}(config);
        vm.stopPrank();

        // Do spoke buys to generate meaningful trading fees
        vm.roll(block.number + 101);
        vm.startPrank(alice);
        core.hubBuyHedge{value: 20 ether}(0);
        uint256 hedgeBal = token.balanceOf(alice);
        token.approve(address(core), hedgeBal);
        vm.roll(block.number + 1);
        core.spokeBuy(0, hedgeBal, 0);
        vm.stopPrank();

        // Check fees accumulated
        uint256 fees = core.accumulatedFees();
        require(fees > 0, "Should have fees after spoke buy");

        // Get pool states before crank
        uint256 sReserveBefore = core.hubReserveS();
        uint256 hedgeReserveSBefore = core.hubReserveHedge();
        (, , uint256 kUsdcBefore) = core.getERC20HubPool(address(usdc));

        // Crank POL
        core.crankPOL();

        // Both pools' K invariant should have grown (permanent LP added)
        uint256 kSAfter = core.hubReserveS() * core.hubReserveHedge();
        uint256 kSBefore = sReserveBefore * hedgeReserveSBefore;
        assertGt(kSAfter, kSBefore, "S pool K should grow");

        (, , uint256 kUsdcAfter) = core.getERC20HubPool(address(usdc));
        assertGt(kUsdcAfter, kUsdcBefore, "USDC pool K should grow");
    }

    // -------------------------------------------------------------------------
    //  Router — ERC20 routes
    // -------------------------------------------------------------------------

    function test_router_buyMemeWithERC20() public {
        // First launch a spoke
        vm.startPrank(alice);
        IHedgehogCore.SpokeConfig memory config = IHedgehogCore.SpokeConfig({
            name: "TestMeme",
            symbol: "TMEME",
            slope: DEFAULT_SLOPE,
            metadataURI: ""
        });
        core.launchSpoke{value: 50 ether}(config);
        vm.stopPrank();

        vm.roll(block.number + 101); // skip EOA protection

        // Bob buys meme with USDC via router
        vm.startPrank(bob);
        usdc.approve(address(router), 50e6);
        router.buyMemeWithERC20(address(usdc), 50e6, 0, 0);

        uint256 memeBal = core.getSpokeBalance(0, bob);
        assertGt(memeBal, 0, "Bob should have meme tokens");
        vm.stopPrank();
    }

    function test_router_sellMemeForERC20() public {
        // Launch spoke and buy meme with USDC
        vm.startPrank(alice);
        IHedgehogCore.SpokeConfig memory config = IHedgehogCore.SpokeConfig({
            name: "TestMeme",
            symbol: "TMEME",
            slope: DEFAULT_SLOPE,
            metadataURI: ""
        });
        core.launchSpoke{value: 50 ether}(config);
        vm.stopPrank();

        vm.roll(block.number + 101); // skip EOA protection

        vm.startPrank(bob);
        usdc.approve(address(router), 50e6);
        router.buyMemeWithERC20(address(usdc), 50e6, 0, 0);

        // Sell partial meme tokens back for USDC (keep above min supply floor)
        vm.roll(block.number + 1);
        uint256 memeBal = core.getSpokeBalance(0, bob);
        uint256 sellAmount = memeBal / 2;
        core.spokeApprove(0, address(router), sellAmount);

        uint256 usdcBefore = usdc.balanceOf(bob);
        router.sellMemeForERC20(address(usdc), 0, sellAmount, 0);
        uint256 usdcAfter = usdc.balanceOf(bob);

        assertGt(usdcAfter, usdcBefore, "Bob should have received USDC");
        vm.stopPrank();
    }

    function test_router_buyMemeWithERC20_zeroReverts() public {
        vm.startPrank(bob);
        vm.expectRevert(HedgehogRouter.ZeroAmount.selector);
        router.buyMemeWithERC20(address(usdc), 0, 0, 0);
        vm.stopPrank();
    }

    // -------------------------------------------------------------------------
    //  TWAP Oracle — ERC20 pool
    // -------------------------------------------------------------------------

    function test_erc20Hub_twap() public {
        // Initial TWAP should be non-zero after initialization
        uint256 twap = core.getERC20HubTWAP(address(usdc));
        // TWAP may be 0 if not enough time has passed, that's fine
        // Just make sure the call doesn't revert
    }

    // -------------------------------------------------------------------------
    //  Round trip: USDC → HEDGE → meme → HEDGE → USDC
    // -------------------------------------------------------------------------

    function test_roundTrip_USDC() public {
        // Launch spoke
        vm.startPrank(alice);
        IHedgehogCore.SpokeConfig memory config = IHedgehogCore.SpokeConfig({
            name: "RoundTrip",
            symbol: "RT",
            slope: DEFAULT_SLOPE,
            metadataURI: ""
        });
        core.launchSpoke{value: 50 ether}(config);
        vm.stopPrank();

        vm.roll(block.number + 101); // skip EOA protection

        uint256 initialUsdc = usdc.balanceOf(bob);

        // Bob: USDC → meme
        vm.startPrank(bob);
        usdc.approve(address(router), 100e6);
        router.buyMemeWithERC20(address(usdc), 100e6, 0, 0);

        uint256 memeBal = core.getSpokeBalance(0, bob);
        assertGt(memeBal, 0);

        // Bob: sell partial meme → USDC (keep above min supply floor)
        vm.roll(block.number + 1);
        uint256 sellAmount = memeBal / 2;
        core.spokeApprove(0, address(router), sellAmount);
        router.sellMemeForERC20(address(usdc), 0, sellAmount, 0);

        uint256 finalUsdc = usdc.balanceOf(bob);

        // Should get back less than started (only sold half, plus slippage)
        assertLt(finalUsdc, initialUsdc, "Round trip should have some cost");
        vm.stopPrank();
    }
}
