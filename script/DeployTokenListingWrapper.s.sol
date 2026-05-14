// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {TokenListingWrapper} from "../src/periphery/TokenListingWrapper.sol";

/// @notice Deploy the TokenListingWrapper and optionally batch-list blue-chip
///         Sonic tokens in a single transaction.
contract DeployTokenListingWrapper is Script {
    // Sonic mainnet addresses
    address constant HEDGEHOG_CORE = 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e;
    address constant HEDGE_TOKEN   = 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c;

    // Blue-chip Sonic tokens to auto-list
    address constant WS   = 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38;
    address constant USDC = 0x29219dd400f2Bf60E5a23d13Be72B486D4038894;
    address constant WETH = 0x50c42dEAcD8Fc9773493ED674b675bE577f2634b;
    address constant USDT = 0x6047828dc181963ba44974801FF68e538Da5eAf9;
    address constant EURC = 0xe715cbA7B5CCB33790cEBFF1436809D36Cb17E57;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        // 1. Deploy wrapper
        TokenListingWrapper wrapper = new TokenListingWrapper(HEDGEHOG_CORE, HEDGE_TOKEN);
        console.log("TokenListingWrapper deployed:", address(wrapper));

        // 2. (Optional) Batch-list blue chips
        //    Uncomment the block below once the deployer has:
        //    - Enough S for tolls (50 S * 5 = 250 S)
        //    - Enough HEDGE for seeding (1 HEDGE * 5 = 5 HEDGE)
        //    - Approved wrapper to spend HEDGE
        /*
        address[] memory tokens = new address[](5);
        tokens[0] = WS;
        tokens[1] = USDC;
        tokens[2] = WETH;
        tokens[3] = USDT;
        tokens[4] = EURC;

        // Approve HEDGE spending
        IERC20(HEDGE_TOKEN).approve(address(wrapper), 5e18);

        // Batch list (sends 250 S for tolls)
        wrapper.batchListTokens{value: 250 ether}(tokens);
        console.log("Batch-listed 5 blue-chip tokens");
        */

        vm.stopBroadcast();
    }
}
