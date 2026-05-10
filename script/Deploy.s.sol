// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

/// @title Deploy
/// @notice Deployment script for Hedgehog Protocol on Sonic chain.
///         Seeds both the native S hub pool and an ERC20 (USDC) hub pool.
///
///  Usage:
///    forge script script/Deploy.s.sol:Deploy \
///      --rpc-url https://rpc.soniclabs.com \
///      --broadcast \
///      --verify \
///      -vvvv
///
///  Environment variables:
///    DEPLOYER_PRIVATE_KEY — Private key for the deployer/owner wallet.
///    TREASURY_ADDRESS     — Address that receives HEDGE equity from tolls.
///    USDC_ADDRESS         — USDC token address on Sonic (default: mainnet USDC).
///    SEED_HEDGE_AMOUNT    — Total HEDGE to mint for seeding (split across pools).
///    SEED_S_AMOUNT        — Native S (wei) to seed into the HEDGE/S pool.
///    SEED_USDC_AMOUNT     — USDC (with decimals) to seed into the HEDGE/USDC pool.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdc = vm.envOr(
            "USDC_ADDRESS", address(0x29219dd400f2Bf60E5a23d13Be72B486D4038894)
        );

        address deployer = vm.addr(deployerKey);

        // Calculate seed amounts: 97% of S balance, split 50/50 between pools
        uint256 totalS = deployer.balance;
        uint256 seedBudget = totalS * 97 / 100; // 97% for seeding, 3% for gas
        uint256 seedS = seedBudget / 2; // 50% of seed budget → S pool

        // HEDGE seed: split equally between both pools
        uint256 totalSeedHedge = vm.envOr("SEED_HEDGE_AMOUNT", uint256(10_000_000e18));
        uint256 hedgeForSPool = totalSeedHedge / 2;
        uint256 hedgeForUsdcPool = totalSeedHedge - hedgeForSPool;

        // USDC seed: use env var or default 0 (skip USDC pool if no USDC)
        uint256 seedUsdc = vm.envOr("SEED_USDC_AMOUNT", uint256(0));

        vm.startBroadcast(deployerKey);

        // 1. Deploy HedgeToken
        HedgeToken token = new HedgeToken(deployer);
        console.log("HedgeToken deployed at:", address(token));

        // 2. Deploy HedgehogCore
        HedgehogCore core = new HedgehogCore(deployer, treasury, token);
        console.log("HedgehogCore deployed at:", address(core));

        // 3. Deploy HedgehogRouter
        HedgehogRouter router = new HedgehogRouter(core, token);
        console.log("HedgehogRouter deployed at:", address(router));

        // 4. Mint seed HEDGE (deployer as minter → mint → set core as minter)
        token.setMinter(deployer);
        token.mint(deployer, totalSeedHedge);
        token.setMinter(address(core));

        // 5. Initialize HEDGE/S hub pool
        token.approve(address(core), totalSeedHedge);
        core.initializeHub{value: seedS}(hedgeForSPool);
        console.log("HEDGE/S pool initialized - S:", seedS, "HEDGE:", hedgeForSPool);

        // 6. Initialize HEDGE/USDC hub pool (if USDC is available)
        if (seedUsdc > 0 && usdc != address(0)) {
            IERC20(usdc).approve(address(core), seedUsdc);
            core.initializeERC20Hub(usdc, hedgeForUsdcPool, seedUsdc);
            console.log("HEDGE/USDC pool initialized - USDC:", seedUsdc, "HEDGE:", hedgeForUsdcPool);
        } else {
            console.log("HEDGE/USDC pool SKIPPED (no USDC balance or address)");
        }

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("Chain: Sonic");
        console.log("Owner:", deployer);
        console.log("Treasury:", treasury);
        console.log("HedgeToken:", address(token));
        console.log("HedgehogCore:", address(core));
        console.log("HedgehogRouter:", address(router));
        console.log("USDC:", usdc);
        console.log("Hub Seed S:", seedS);
        console.log("Hub Seed HEDGE (S pool):", hedgeForSPool);
        console.log("Hub Seed USDC:", seedUsdc);
        console.log("Hub Seed HEDGE (USDC pool):", hedgeForUsdcPool);
    }
}
