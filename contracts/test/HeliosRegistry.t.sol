// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {HeliosRegistry} from "../src/HeliosRegistry.sol";

contract HeliosRegistryTest is Test {
    HeliosRegistry public registry;

    address owner = address(this);
    address curator = makeAddr("curator");
    address strategist = makeAddr("strategist");
    address sentinel = makeAddr("sentinel");
    address executor = makeAddr("executor");

    function setUp() public {
        registry = new HeliosRegistry();
    }

    function test_RegisterAgent() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);

        HeliosRegistry.Agent memory agent = registry.getAgent(curator);
        assertEq(agent.wallet, curator);
        assertEq(uint8(agent.role), uint8(HeliosRegistry.Role.Curator));
        assertTrue(agent.active);
        assertEq(agent.cycleCount, 0);
        assertEq(registry.agentCount(), 1);
    }

    function test_RegisterAllFourAgents() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
        registry.registerAgent(strategist, HeliosRegistry.Role.Strategist);
        registry.registerAgent(sentinel, HeliosRegistry.Role.Sentinel);
        registry.registerAgent(executor, HeliosRegistry.Role.Executor);

        assertEq(registry.agentCount(), 4);
    }

    function test_RevertRegisterFifthAgent() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
        registry.registerAgent(strategist, HeliosRegistry.Role.Strategist);
        registry.registerAgent(sentinel, HeliosRegistry.Role.Sentinel);
        registry.registerAgent(executor, HeliosRegistry.Role.Executor);

        vm.expectRevert(HeliosRegistry.MaxAgentsReached.selector);
        registry.registerAgent(makeAddr("extra"), HeliosRegistry.Role.Curator);
    }

    function test_RevertDuplicateRegistration() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);

        vm.expectRevert(HeliosRegistry.AlreadyRegistered.selector);
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
    }

    function test_RevertZeroAddress() public {
        vm.expectRevert(HeliosRegistry.InvalidAddress.selector);
        registry.registerAgent(address(0), HeliosRegistry.Role.Curator);
    }

    function test_RevertNonOwnerRegister() public {
        vm.prank(curator);
        vm.expectRevert(HeliosRegistry.NotOwner.selector);
        registry.registerAgent(strategist, HeliosRegistry.Role.Strategist);
    }

    function test_LogCycle() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);

        vm.prank(curator);
        registry.logCycle("yield_park", "0xabc,0xdef");

        assertEq(registry.totalCycles(), 1);

        HeliosRegistry.CycleLog memory log = registry.getCycle(0);
        assertEq(log.agent, curator);
        assertEq(keccak256(bytes(log.action)), keccak256(bytes("yield_park")));

        HeliosRegistry.Agent memory agent = registry.getAgent(curator);
        assertEq(agent.cycleCount, 1);
    }

    function test_RevertLogCycleUnregistered() public {
        vm.prank(curator);
        vm.expectRevert(HeliosRegistry.NotRegistered.selector);
        registry.logCycle("buy", "0xabc");
    }

    function test_RevertLogCycleWhenPaused() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
        registry.togglePause();

        vm.prank(curator);
        vm.expectRevert(HeliosRegistry.Paused.selector);
        registry.logCycle("buy", "0xabc");
    }

    function test_DeactivateAgent() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
        registry.deactivateAgent(curator);

        HeliosRegistry.Agent memory agent = registry.getAgent(curator);
        assertFalse(agent.active);
    }

    function test_TogglePause() public {
        assertFalse(registry.paused());
        registry.togglePause();
        assertTrue(registry.paused());
        registry.togglePause();
        assertFalse(registry.paused());
    }

    function test_GetAgents() public {
        registry.registerAgent(curator, HeliosRegistry.Role.Curator);
        registry.registerAgent(strategist, HeliosRegistry.Role.Strategist);

        address[] memory agents = registry.getAgents();
        assertEq(agents.length, 2);
        assertEq(agents[0], curator);
        assertEq(agents[1], strategist);
    }
}
