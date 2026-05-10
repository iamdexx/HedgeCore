#!/bin/bash
# Verify all Hedgehog Protocol contracts on SonicScan
# Usage: SONICSCAN_API_KEY=<key> ./script/verify-sonicscan.sh <hedge_token> <hedgehog_core> <hedgehog_router> [treasury_address]
#
# Requirements:
#   - forge installed
#   - SONICSCAN_API_KEY env var set (get free key at https://sonicscan.org/myapikey)
#
# SonicScan uses the Etherscan API format. Sonic chain ID = 146.

set -euo pipefail

if [ -z "${SONICSCAN_API_KEY:-}" ]; then
  echo "ERROR: Set SONICSCAN_API_KEY env var"
  echo "Get a free key at https://sonicscan.org/myapikey"
  exit 1
fi

HEDGE_TOKEN="${1:?Usage: $0 <hedge_token> <hedgehog_core> <hedgehog_router> [treasury]}"
HEDGEHOG_CORE="${2:?}"
HEDGEHOG_ROUTER="${3:?}"
TREASURY="${4:-0x0000000000000000000000000000000000000000}"

VERIFIER_URL="https://api.sonicscan.org/api"

echo "=== Verifying Hedgehog Protocol on SonicScan ==="
echo "HedgeToken:      $HEDGE_TOKEN"
echo "HedgehogCore:    $HEDGEHOG_CORE"
echo "HedgehogRouter:  $HEDGEHOG_ROUTER"
echo ""

echo "[1/3] Verifying HedgeToken..."
forge verify-contract "$HEDGE_TOKEN" \
  src/core/HedgeToken.sol:HedgeToken \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --watch || echo "  (may already be verified)"

echo ""
echo "[2/3] Verifying HedgehogCore..."
forge verify-contract "$HEDGEHOG_CORE" \
  src/core/HedgehogCore.sol:HedgehogCore \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --constructor-args "$(cast abi-encode 'constructor(address,address)' "$HEDGE_TOKEN" "$TREASURY")" \
  --watch || echo "  (may already be verified)"

echo ""
echo "[3/3] Verifying HedgehogRouter..."
forge verify-contract "$HEDGEHOG_ROUTER" \
  src/periphery/HedgehogRouter.sol:HedgehogRouter \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$HEDGEHOG_CORE")" \
  --watch || echo "  (may already be verified)"

echo ""
echo "=== Verification complete ==="
echo "Check results at:"
echo "  https://sonicscan.org/address/$HEDGE_TOKEN#code"
echo "  https://sonicscan.org/address/$HEDGEHOG_CORE#code"
echo "  https://sonicscan.org/address/$HEDGEHOG_ROUTER#code"
