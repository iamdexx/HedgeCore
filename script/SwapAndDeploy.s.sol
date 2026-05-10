// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {HedgeToken} from "../src/core/HedgeToken.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";
import {HedgehogRouter} from "../src/periphery/HedgehogRouter.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

interface IWrappedS {
    function deposit() external payable;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IShadowRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/// @title SwapAndDeploy
/// @notice Swaps half the S budget for USDC on Shadow DEX, then deploys Hedgehog Protocol
///         with both HEDGE/S and HEDGE/USDC hub pools seeded 50/50.
contract SwapAndDeploy is Script {
    address constant WS = 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38;
    address constant USDC = 0x29219dd400f2Bf60E5a23d13Be72B486D4038894;
    address constant SHADOW_ROUTER = 0x5543c6176FEb9B4b179078205d7C29EEa2e2d695;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address deployer = vm.addr(deployerKey);

        uint256 totalS = deployer.balance;
        uint256 seedBudget = totalS * 97 / 100; // 97% for seeding
        uint256 sForSwap = seedBudget / 2; // 50% -> swap to USDC
        uint256 seedS = seedBudget - sForSwap; // 50% -> S pool

        uint256 totalSeedHedge = vm.envOr("SEED_HEDGE_AMOUNT", uint256(50_000_000e18));
        uint256 hedgeForSPool = totalSeedHedge / 2;
        uint256 hedgeForUsdcPool = totalSeedHedge - hedgeForSPool;

        console.log("=== Pre-Deploy Summary ===");
        console.log("Deployer:", deployer);
        console.log("Total S:", totalS);
        console.log("Seed budget (97%):", seedBudget);
        console.log("S for hub pool:", seedS);
        console.log("S to swap for USDC:", sForSwap);

        vm.startBroadcast(deployerKey);

        // --- Step 1: Swap S -> USDC via Shadow DEX ---
        // Shadow router accepts native S via payable exactInputSingle
        IShadowRouter.ExactInputSingleParams memory swapParams = IShadowRouter.ExactInputSingleParams({
            tokenIn: WS,
            tokenOut: USDC,
            recipient: deployer,
            deadline: block.timestamp + 300,
            amountIn: sForSwap,
            amountOutMinimum: 0, // accept any amount (we check after)
            sqrtPriceLimitX96: 0
        });

        uint256 usdcReceived = IShadowRouter(SHADOW_ROUTER).exactInputSingle{value: sForSwap}(swapParams);
        console.log("USDC received from swap:", usdcReceived);

        // --- Step 2: Deploy contracts ---
        HedgeToken token = new HedgeToken(deployer);
        console.log("HedgeToken:", address(token));

        HedgehogCore core = new HedgehogCore(deployer, treasury, token);
        console.log("HedgehogCore:", address(core));

        HedgehogRouter router = new HedgehogRouter(core, token);
        console.log("HedgehogRouter:", address(router));

        // --- Step 3: Mint seed HEDGE ---
        token.setMinter(deployer);
        token.mint(deployer, totalSeedHedge);
        token.setMinter(address(core));

        // --- Step 4: Seed HEDGE/S pool ---
        token.approve(address(core), totalSeedHedge);
        core.initializeHub{value: seedS}(hedgeForSPool);
        console.log("HEDGE/S pool: S =", seedS, "HEDGE =", hedgeForSPool);

        // --- Step 5: Seed HEDGE/USDC pool ---
        uint256 usdcBal = IERC20(USDC).balanceOf(deployer);
        require(usdcBal > 0, "No USDC after swap");
        IERC20(USDC).approve(address(core), usdcBal);
        core.initializeERC20Hub(USDC, hedgeForUsdcPool, usdcBal);
        console.log("HEDGE/USDC pool: USDC =", usdcBal, "HEDGE =", hedgeForUsdcPool);

        vm.stopBroadcast();

        // --- Summary ---
        console.log("\n=== Deployment Complete ===");
        console.log("HedgeToken:", address(token));
        console.log("HedgehogCore:", address(core));
        console.log("HedgehogRouter:", address(router));
        console.log("Treasury:", treasury);
        console.log("USDC:", USDC);
    }
}
