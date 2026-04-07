// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HeliosRegistry — Agent identity + cycle logging on X Layer
/// @notice Registers 4 agent wallets and logs every cycle for onchain proof of work
contract HeliosRegistry {
    // ─── Types ──────────────────────────────────────────────────────────

    enum Role { Curator, Strategist, Sentinel, Executor }

    struct Agent {
        address wallet;
        Role role;
        uint64 cycleCount;
        uint64 registeredAt;
        bool active;
    }

    struct CycleLog {
        uint64 timestamp;
        address agent;
        string action;
        string txHashes;
    }

    // ─── Errors ─────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyRegistered();
    error NotRegistered();
    error Paused();
    error InvalidAddress();
    error MaxAgentsReached();

    // ─── Events ─────────────────────────────────────────────────────────

    event AgentRegistered(address indexed wallet, Role role, uint64 timestamp);
    event AgentDeactivated(address indexed wallet, uint64 timestamp);
    event CycleLogged(
        uint256 indexed cycleIndex,
        address indexed agent,
        string action,
        string txHashes,
        uint64 timestamp
    );
    event PauseToggled(bool paused, uint64 timestamp);

    // ─── State ──────────────────────────────────────────────────────────

    address public immutable owner;
    bool public paused;

    mapping(address => Agent) public agents;
    address[] public agentList;
    CycleLog[] public cycles;

    uint8 public constant MAX_AGENTS = 4;

    // ─── Modifiers ──────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    modifier onlyRegistered() {
        if (!agents[msg.sender].active) revert NotRegistered();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ─── Agent Management ───────────────────────────────────────────────

    /// @notice Register an agent wallet with a role
    /// @param wallet The agent's wallet address
    /// @param role The agent's role (Curator=0, Strategist=1, Sentinel=2, Executor=3)
    function registerAgent(address wallet, Role role) external onlyOwner {
        if (wallet == address(0)) revert InvalidAddress();
        if (agents[wallet].active) revert AlreadyRegistered();
        if (agentList.length >= MAX_AGENTS) revert MaxAgentsReached();

        agents[wallet] = Agent({
            wallet: wallet,
            role: role,
            cycleCount: 0,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        agentList.push(wallet);

        emit AgentRegistered(wallet, role, uint64(block.timestamp));
    }

    /// @notice Deactivate an agent
    function deactivateAgent(address wallet) external onlyOwner {
        if (!agents[wallet].active) revert NotRegistered();
        agents[wallet].active = false;
        emit AgentDeactivated(wallet, uint64(block.timestamp));
    }

    // ─── Cycle Logging ──────────────────────────────────────────────────

    /// @notice Log a completed cycle — called by any registered agent
    /// @param action The cycle action (buy, yield_park, no_alpha, hold)
    /// @param txHashes Comma-separated transaction hashes from this cycle
    function logCycle(
        string calldata action,
        string calldata txHashes
    ) external whenNotPaused onlyRegistered {
        uint256 cycleIndex = cycles.length;

        cycles.push(CycleLog({
            timestamp: uint64(block.timestamp),
            agent: msg.sender,
            action: action,
            txHashes: txHashes
        }));

        agents[msg.sender].cycleCount++;

        emit CycleLogged(cycleIndex, msg.sender, action, txHashes, uint64(block.timestamp));
    }

    // ─── Admin ──────────────────────────────────────────────────────────

    /// @notice Emergency pause/unpause
    function togglePause() external onlyOwner {
        paused = !paused;
        emit PauseToggled(paused, uint64(block.timestamp));
    }

    // ─── Views ──────────────────────────────────────────────────────────

    /// @notice Total cycles logged
    function totalCycles() external view returns (uint256) {
        return cycles.length;
    }

    /// @notice Number of registered agents
    function agentCount() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice Get cycle log by index
    function getCycle(uint256 index) external view returns (CycleLog memory) {
        return cycles[index];
    }

    /// @notice Get all registered agent addresses
    function getAgents() external view returns (address[] memory) {
        return agentList;
    }

    /// @notice Get agent info
    function getAgent(address wallet) external view returns (Agent memory) {
        return agents[wallet];
    }
}
