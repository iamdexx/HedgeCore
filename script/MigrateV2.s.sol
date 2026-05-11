// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title MigrateV2
/// @notice Migration script: deploys new HedgehogCore v2 (with ERC-20 spoke tokens)
///         and a new Router. Reuses the existing HedgeToken contract.
///
///         The old HedgehogCore's liquidity is protocol-owned and non-withdrawable
///         by design — it stays locked. The new core gets fresh seed liquidity.
///
///  Usage:
///    forge script script/MigrateV2.s.sol:MigrateV2 \
///      --rpc-url https://rpc.soniclabs.com \
///      --broadcast \
///      --verify \
///      --verifier-url https://api.sonicscan.org/api \
///      -vvvv
///
///  Environment variables:
///    DEPLOYER_PRIVATE_KEY — Private key for the deployer/owner wallet.
///    HEDGE_TOKEN          — Existing HedgeToken address (0x5ccc...).
///    TREASURY_ADDRESS     — Treasury address.
///    USDC_ADDRESS         — USDC on Sonic.
///    SEED_S_AMOUNT        — Native S (wei) for HEDGE/S pool. Default: 97% of balance.
///    SEED_HEDGE_S         — HEDGE for S pool. Default: 25_000_000e18.
///    SEED_HEDGE_USDC      — HEDGE for USDC pool. Default: 25_000_000e18.
///    SEED_USDC_AMOUNT     — USDC for HEDGE/USDC pool. Default: 0 (skip).
///    EQUITY_RATE_BPS      — Equity rate in bps (default: 100 = 0.01%).
contract MigrateV2 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        // Existing HedgeToken (unchanged)
        address hedgeTokenAddr = vm.envOr(
            "HEDGE_TOKEN", address(0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c)
        );
        HedgeToken token = HedgeToken(hedgeTokenAddr);

        address treasury = vm.envOr(
            "TREASURY_ADDRESS", deployer
        );
        address usdc = vm.envOr(
            "USDC_ADDRESS", address(0x29219dd400f2Bf60E5a23d13Be72B486D4038894)
        );

        // Seed amounts
        uint256 seedS = vm.envOr("SEED_S_AMOUNT", deployer.balance * 90 / 100);
        uint256 hedgeForSPool = vm.envOr("SEED_HEDGE_S", uint256(25_000_000e18));
        uint256 hedgeForUsdcPool = vm.envOr("SEED_HEDGE_USDC", uint256(25_000_000e18));
        uint256 seedUsdc = vm.envOr("SEED_USDC_AMOUNT", uint256(0));
        uint256 equityRateBps = vm.envOr("EQUITY_RATE_BPS", uint256(100));

        uint256 totalHedgeNeeded = hedgeForSPool + hedgeForUsdcPool;

        vm.startBroadcast(deployerKey);

        // 1. Deploy new HedgehogCore v2
        HedgehogCore newCore = new HedgehogCore(deployer, treasury, token);
        console.log("HedgehogCore v2 deployed at:", address(newCore));

        // 2. Deploy new HedgehogRouter v2
        HedgehogRouter newRouter = new HedgehogRouter(newCore, token);
        console.log("HedgehogRouter v2 deployed at:", address(newRouter));

        // 3. Switch minter to deployer, mint seed HEDGE, then set minter to new core
        token.setMinter(deployer);
        token.mint(deployer, totalHedgeNeeded);
        token.setMinter(address(newCore));

        // 4. Initialize HEDGE/S hub pool on new core
        token.approve(address(newCore), totalHedgeNeeded);
        newCore.initializeHub{value: seedS}(hedgeForSPool);
        console.log("HEDGE/S pool initialized - S:", seedS, "HEDGE:", hedgeForSPool);

        // 5. Initialize HEDGE/USDC hub pool (if USDC available)
        if (seedUsdc > 0 && usdc != address(0)) {
            IERC20(usdc).approve(address(newCore), seedUsdc);
            newCore.initializeERC20Hub(usdc, hedgeForUsdcPool, seedUsdc);
            console.log("HEDGE/USDC pool initialized - USDC:", seedUsdc, "HEDGE:", hedgeForUsdcPool);
        } else {
            console.log("HEDGE/USDC pool SKIPPED (no USDC seed specified)");
        }

        // 6. Set equity rate
        newCore.setEquityRateBps(equityRateBps);
        console.log("Equity rate set to:", equityRateBps, "bps");

        vm.stopBroadcast();

        // Summary
        console.log("\n=== Migration V2 Summary ===");
        console.log("HedgeToken (unchanged):", hedgeTokenAddr);
        console.log("Old HedgehogCore (deprecated): 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e");
        console.log("Old HedgehogRouter (deprecated): 0xB09fb21bA329F3318101A9C6C454080b6D2abbB2");
        console.log("New HedgehogCore v2:", address(newCore));
        console.log("New HedgehogRouter v2:", address(newRouter));
        console.log("Treasury:", treasury);
        console.log("USDC:", usdc);
        console.log("Minter set to new core");
        console.log("\nNOTE: Old core liquidity is permanently locked (by design).");
        console.log("NOTE: Update frontend/src/config/contracts.ts with new addresses.");
        console.log("NOTE: Verify SpokeToken source on SonicScan for auto-verification of launched tokens.");
    }
}
