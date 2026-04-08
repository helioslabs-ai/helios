#!/usr/bin/env bash
# Register all 4 Helios agents on HeliosRegistry.sol
# Usage: bash scripts/register-agents.sh
# Role enum: Curator=0, Strategist=1, Sentinel=2, Executor=3

set -euo pipefail

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a && source "$ENV_FILE" && set +a
fi

: "${XLAYER_RPC_URL:?Need XLAYER_RPC_URL}"
: "${DEPLOYER_PRIVATE_KEY:?Need DEPLOYER_PRIVATE_KEY}"
: "${HELIOS_REGISTRY_ADDRESS:?Need HELIOS_REGISTRY_ADDRESS}"
: "${CURATOR_WALLET_ADDRESS:?Need CURATOR_WALLET_ADDRESS}"
: "${STRATEGIST_WALLET_ADDRESS:?Need STRATEGIST_WALLET_ADDRESS}"
: "${SENTINEL_WALLET_ADDRESS:?Need SENTINEL_WALLET_ADDRESS}"
: "${EXECUTOR_WALLET_ADDRESS:?Need EXECUTOR_WALLET_ADDRESS}"

register() {
  local name=$1 role_id=$2 address=$3
  echo "Registering $name (role=$role_id) → $address"
  cast send \
    --rpc-url "$XLAYER_RPC_URL" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    "$HELIOS_REGISTRY_ADDRESS" \
    "registerAgent(address,uint8)" \
    "$address" \
    "$role_id"
  echo "  ✓ $name registered"
}

register "Curator"    0 "$CURATOR_WALLET_ADDRESS"
register "Strategist" 1 "$STRATEGIST_WALLET_ADDRESS"
register "Sentinel"   2 "$SENTINEL_WALLET_ADDRESS"
register "Executor"   3 "$EXECUTOR_WALLET_ADDRESS"

echo ""
echo "All 4 agents registered on HeliosRegistry at $HELIOS_REGISTRY_ADDRESS"
