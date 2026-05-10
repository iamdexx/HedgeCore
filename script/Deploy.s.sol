// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";

/// @title Deploy
/// @notice Deployment script for Hedgehog Protocol on Sonic chain.
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
///    SEED_HEDGE_AMOUNT    — HEDGE to seed into the hub pool (WAD).
///    SEED_S_AMOUNT        — Native S (wei) to seed into the hub pool.
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 seedHedge = vm.envOr("SEED_HEDGE_AMOUNT", uint256(10_000_000e18));
        uint256 seedS = vm.envOr("SEED_S_AMOUNT", uint256(11 ether));

        address deployer = vm.addr(deployerKey);

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

        // 4. Set Core as the token minter
        token.setMinter(address(core));

        // 5. Mint seed HEDGE to deployer (temporarily set deployer as minter)
        // Note: We need to mint the initial seed HEDGE before setting Core as minter.
        // Since we already set Core as minter, we mint via a workaround:
        // The deployer must already hold HEDGE or we restructure the flow.
        //
        // For production: Pre-mint seed HEDGE before setting minter to Core.
        // For this script, we handle it by:
        //   a) Setting deployer as minter first
        //   b) Minting seed
        //   c) Setting core as minter

        // Redo minter flow:
        token.setMinter(deployer);
        token.mint(deployer, seedHedge);
        token.setMinter(address(core));

        // 6. Initialize hub pool
        token.approve(address(core), seedHedge);
        core.initializeHub{value: seedS}(seedHedge);
        console.log("Hub pool initialized with S:", seedS);
        console.log("Hub pool initialized with HEDGE:", seedHedge);

        vm.stopBroadcast();

        // Log summary
        console.log("\n=== Deployment Summary ===");
        console.log("Chain: Sonic");
        console.log("Owner:", deployer);
        console.log("Treasury:", treasury);
        console.log("HedgeToken:", address(token));
        console.log("HedgehogCore:", address(core));
        console.log("HedgehogRouter:", address(router));
        console.log("Hub Seed S:", seedS);
        console.log("Hub Seed HEDGE:", seedHedge);
    }
}
