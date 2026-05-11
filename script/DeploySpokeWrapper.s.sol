// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {SpokeWrapper} from "../src/periphery/SpokeWrapper.sol";

/// @title DeploySpokeWrapper
/// @notice Deploys the SpokeWrapper contract that adds ERC-20 tokens to meme
///         launches on the existing HedgehogCore. No new liquidity needed —
///         all operations flow through the original core's pools.
///
///  Usage:
///    forge script script/DeploySpokeWrapper.s.sol:DeploySpokeWrapper \
///      --rpc-url https://rpc.soniclabs.com \
///      --broadcast \
///      --verify \
///      --verifier-url https://api.sonicscan.org/api \
///      --etherscan-api-key $SONICSCAN_API_KEY \
///      -vvvv
///
///  Environment variables:
///    DEPLOYER_PRIVATE_KEY — Private key for the deployer wallet.
///    HEDGEHOG_CORE        — Existing HedgehogCore address (default: mainnet).
contract DeploySpokeWrapper is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address coreAddr = vm.envOr(
            "HEDGEHOG_CORE", address(0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e)
        );
        HedgehogCore core = HedgehogCore(payable(coreAddr));

        vm.startBroadcast(deployerKey);

        SpokeWrapper wrapper = new SpokeWrapper(core);

        vm.stopBroadcast();

        console.log("\n=== SpokeWrapper Deployment ===");
        console.log("Deployer:", deployer);
        console.log("HedgehogCore (existing):", coreAddr);
        console.log("SpokeWrapper (new):", address(wrapper));
        console.log("\nAll meme launches through the wrapper will:");
        console.log("  - Deploy real ERC-20 tokens (verified on SonicScan)");
        console.log("  - Route all fees/POL to the original hub pools");
        console.log("  - Use existing bonding curves");
        console.log("\nUpdate frontend to call SpokeWrapper instead of HedgehogCore/Router");
        console.log("for spoke operations (launchSpoke, spokeBuy, spokeSell, buyMemeWithS, sellMemeForS).");
    }
}
