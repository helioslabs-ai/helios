// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {HeliosRegistry} from "../src/HeliosRegistry.sol";

contract DeployScript is Script {
    function run() public {
        vm.startBroadcast();

        HeliosRegistry registry = new HeliosRegistry();
        console2.log("HeliosRegistry deployed at:", address(registry));

        vm.stopBroadcast();
    }
}
