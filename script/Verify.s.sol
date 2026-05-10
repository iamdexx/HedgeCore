// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

/// @notice Post-deployment verification script for SonicScan
/// Usage:
///   SONICSCAN_API_KEY=<key> \
///   HEDGE_TOKEN=<addr> \
///   HEDGEHOG_CORE=<addr> \
///   HEDGEHOG_ROUTER=<addr> \
///   forge script script/Verify.s.sol --rpc-url https://rpc.soniclabs.com
///
/// Or verify individually with forge verify-contract:
///   forge verify-contract <address> src/core/HedgeToken.sol:HedgeToken \
///     --chain sonic --etherscan-api-key $SONICSCAN_API_KEY
contract Verify is Script {
    function run() external view {
        address hedgeToken = vm.envAddress("HEDGE_TOKEN");
        address hedgehogCore = vm.envAddress("HEDGEHOG_CORE");
        address hedgehogRouter = vm.envAddress("HEDGEHOG_ROUTER");

        console.log("=== Contract Verification Addresses ===");
        console.log("HedgeToken:", hedgeToken);
        console.log("HedgehogCore:", hedgehogCore);
        console.log("HedgehogRouter:", hedgehogRouter);
        console.log("");
        console.log("Run these commands to verify on SonicScan:");
        console.log("");
        console.log("forge verify-contract", hedgeToken);
        console.log("  src/core/HedgeToken.sol:HedgeToken");
        console.log("  --chain sonic --etherscan-api-key $SONICSCAN_API_KEY");
        console.log("");
        console.log("forge verify-contract", hedgehogCore);
        console.log("  src/core/HedgehogCore.sol:HedgehogCore");
        console.log("  --chain sonic --etherscan-api-key $SONICSCAN_API_KEY");
        console.log("");
        console.log("forge verify-contract", hedgehogRouter);
        console.log("  src/periphery/HedgehogRouter.sol:HedgehogRouter");
        console.log("  --chain sonic --etherscan-api-key $SONICSCAN_API_KEY");
    }
}
