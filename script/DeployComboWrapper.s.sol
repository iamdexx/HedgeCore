// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {ComboWrapper} from "../src/periphery/ComboWrapper.sol";
import {HedgehogCore} from "../src/core/HedgehogCore.sol";

contract DeployComboWrapper is Script {
    function run() external {
        // Existing HedgehogCore on Sonic mainnet
        HedgehogCore core = HedgehogCore(payable(0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e));

        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        ComboWrapper wrapper = new ComboWrapper(core);

        vm.stopBroadcast();

        console.log("ComboWrapper deployed at:", address(wrapper));
    }
}
