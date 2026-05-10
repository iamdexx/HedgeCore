#!/bin/bash
# Verify all Hedgehog Protocol contracts on SonicScan
# Usage: SONICSCAN_API_KEY=<key> ./script/verify-sonicscan.sh <hedge_token> <hedgehog_core> <hedgehog_router> <owner> <treasury>
#
# Requirements:
#   - forge installed
#   - SONICSCAN_API_KEY env var set (Etherscan API key — works for Sonic via V2 API, chain ID 146)
#     Get a free key at https://etherscan.io/myapikey
#
# SonicScan uses the Etherscan API V2 format. Sonic chain ID = 146.

set -euo pipefail

if [ -z "${SONICSCAN_API_KEY:-}" ]; then
  echo "ERROR: Set SONICSCAN_API_KEY env var"
  echo "Get a free key at https://sonicscan.org/myapikey"
  exit 1
fi

HEDGE_TOKEN="${1:?Usage: $0 <hedge_token> <hedgehog_core> <hedgehog_router> <owner> <treasury>}"
HEDGEHOG_CORE="${2:?}"
HEDGEHOG_ROUTER="${3:?}"
OWNER="${4:?}"
TREASURY="${5:?}"

# Etherscan V2 API endpoint for Sonic (chain ID 146)
VERIFIER_URL="https://api.etherscan.io/v2/api?chainid=146"

echo "=== Verifying Hedgehog Protocol on SonicScan ==="
echo "HedgeToken:      $HEDGE_TOKEN"
echo "HedgehogCore:    $HEDGEHOG_CORE"
echo "HedgehogRouter:  $HEDGEHOG_ROUTER"
echo "Owner:           $OWNER"
echo "Treasury:        $TREASURY"
echo ""

echo "[1/3] Verifying HedgeToken..."
forge verify-contract "$HEDGE_TOKEN" \
  src/core/HedgeToken.sol:HedgeToken \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$OWNER")" \
  --watch || echo "  (may already be verified)"

echo ""
echo "[2/3] Verifying HedgehogCore..."
forge verify-contract "$HEDGEHOG_CORE" \
  src/core/HedgehogCore.sol:HedgehogCore \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --constructor-args "$(cast abi-encode 'constructor(address,address,address)' "$OWNER" "$TREASURY" "$HEDGE_TOKEN")" \
  --watch || echo "  (may already be verified)"

echo ""
echo "[3/3] Verifying HedgehogRouter..."
forge verify-contract "$HEDGEHOG_ROUTER" \
  src/periphery/HedgehogRouter.sol:HedgehogRouter \
  --verifier-url "$VERIFIER_URL" \
  --etherscan-api-key "$SONICSCAN_API_KEY" \
  --constructor-args "$(cast abi-encode 'constructor(address,address)' "$HEDGEHOG_CORE" "$HEDGE_TOKEN")" \
  --watch || echo "  (may already be verified)"

echo ""
echo "=== Verification complete ==="
echo "Check results at:"
echo "  https://sonicscan.org/address/$HEDGE_TOKEN#code"
echo "  https://sonicscan.org/address/$HEDGEHOG_CORE#code"
echo "  https://sonicscan.org/address/$HEDGEHOG_ROUTER#code"
echo ""
echo "Note: SonicScan uses Etherscan API V2. Your Etherscan API key works for Sonic (chain ID 146)."
