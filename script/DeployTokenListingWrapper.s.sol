// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {TokenListingWrapper} from "../src/periphery/TokenListingWrapper.sol";
import {IHedgehogCore} from "../src/interfaces/IHedgehogCore.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

/// @notice Step 1: Deploy wrapper, buy HEDGE, launch 5 blue-chip spokes.
///         Seeding is skipped here due to EOA_PROTECTION_BLOCKS (100 blocks).
///         Run SeedBlueChipPools after ~100 blocks to seed.
contract DeployTokenListingWrapper is Script {
    address constant HEDGEHOG_CORE = 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e;
    address constant HEDGE_TOKEN   = 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c;

    address constant WS   = 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38;
    address constant USDC = 0x29219dd400f2Bf60E5a23d13Be72B486D4038894;
    address constant WETH = 0x50c42dEAcD8Fc9773493ED674b675bE577f2634b;
    address constant USDT = 0x6047828dc181963ba44974801FF68e538dA5eaF9;
    address constant EURC = 0xe715cbA7B5cCb33790ceBFF1436809d36cb17E57;

    uint256 constant NUM_TOKENS = 5;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        IHedgehogCore core = IHedgehogCore(HEDGEHOG_CORE);
        IERC20 hedge = IERC20(HEDGE_TOKEN);

        // 1. Buy HEDGE for seeding later (1 S → lots of HEDGE)
        console.log("Buying HEDGE via hub pool...");
        core.hubBuyHedge{value: 1 ether}(0);
        uint256 hedgeBal = hedge.balanceOf(msg.sender);
        console.log("HEDGE acquired:", hedgeBal);

        // 2. Deploy wrapper
        TokenListingWrapper wrapper = new TokenListingWrapper(HEDGEHOG_CORE, HEDGE_TOKEN);
        console.log("TokenListingWrapper deployed:", address(wrapper));

        // 3. Disable seeding for now (EOA protection prevents contract spokeBuy
        //    within 100 blocks of spoke creation)
        wrapper.setSeedAmount(0);

        // 4. Batch-list 5 blue chips — launches spokes without seeding
        address[] memory tokens = new address[](NUM_TOKENS);
        tokens[0] = WS;
        tokens[1] = USDC;
        tokens[2] = WETH;
        tokens[3] = USDT;
        tokens[4] = EURC;

        uint256 toll = 50 ether;
        uint256 totalToll = toll * NUM_TOKENS; // 250 S
        console.log("Total toll:", totalToll);
        wrapper.batchListTokens{value: totalToll}(tokens);

        console.log("Launched 5 blue-chip spokes!");
        console.log("Listed token count:", wrapper.listedTokenCount());
        console.log("Spoke count:", core.getSpokeCount());

        vm.stopBroadcast();
    }
}

/// @notice Step 2: Seed ONLY the 5 blue-chip pools from EOA after 100 blocks.
///         Run this ~2 min after DeployTokenListingWrapper.
contract SeedBlueChipPools is Script {
    address constant HEDGEHOG_CORE = 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e;
    address constant HEDGE_TOKEN   = 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c;

    uint256 constant SEED_AMOUNT = 1e18; // 1 HEDGE per pool
    uint256 constant NUM_BLUE_CHIPS = 5;

    // Spoke IDs assigned by the wrapper (must match deployment order)
    // Update these after running DeployTokenListingWrapper if spoke IDs differ.
    uint256 constant SPOKE_WS   = 0;
    uint256 constant SPOKE_USDC = 1;
    uint256 constant SPOKE_WETH = 2;
    uint256 constant SPOKE_USDT = 3;
    uint256 constant SPOKE_EURC = 4;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        IHedgehogCore core = IHedgehogCore(HEDGEHOG_CORE);
        IERC20 hedge = IERC20(HEDGE_TOKEN);

        // Approve core to spend HEDGE (only for 5 blue-chip pools)
        uint256 totalSeed = SEED_AMOUNT * NUM_BLUE_CHIPS;
        hedge.approve(address(core), totalSeed);
        console.log("Approved HEDGE:", totalSeed);

        // Seed only the 5 blue-chip spoke pools from EOA
        uint256[5] memory spokeIds = [SPOKE_WS, SPOKE_USDC, SPOKE_WETH, SPOKE_USDT, SPOKE_EURC];
        for (uint256 i; i < NUM_BLUE_CHIPS; ++i) {
            core.spokeBuy(spokeIds[i], SEED_AMOUNT, 0);
            console.log("Seeded spoke:", spokeIds[i]);
        }

        console.log("All 5 blue-chip pools seeded!");
        vm.stopBroadcast();
    }
}
