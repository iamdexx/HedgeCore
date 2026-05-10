# Hedgehog Protocol — Economy Stress Test Report

**Date**: 2026-05-10  
**Method**: Adversarial `cast` commands against contracts deployed on local Anvil (chain 31337)  
**Scope**: All core economic invariants — bonding curves, hub AMM, toll booth, POL engine, supply floor, MEV protection  

## Results: 19/19 PASSED

---

### Test 1: Buy/Sell Cycle Value Extraction
- **1a: 100 HEDGE cycle** — PASSED. Lost 1.99 HEDGE (1.99% of input)
- **1b: 1 HEDGE cycle** — PASSED. Lost 0.0199 HEDGE (1.99% of input)
- **1c: 500 HEDGE cycle** — PASSED. Lost 9.95 HEDGE (1.99% of input)
- **1d: 10x rapid 50 HEDGE cycles** — PASSED. Total loss 9.95 HEDGE (1.99%)

> Every buy/sell round-trip loses exactly ~1.99% due to 1% fee on each leg. Consistent across all scales. Wash trading is unprofitable.

> **Note**: v1 of this test was invalid — sells failed due to the 10K token floor, not fees. v2 fixed this by establishing supply above the floor before testing cycles.

### Test 2: Minimum Supply Floor
- **2a: Sell ALL tokens (below floor)** — PASSED. Reverted as expected
- **2b: Sell down TO floor** — PASSED. Supply reached exactly 10,000.00
- **2c: Sell 1 more token below floor** — PASSED. Reverted

> Floor enforcement is airtight. Cannot sell below 10,000 tokens. Can sell exactly to the floor.

### Test 3: Hub Pool K Invariant
- **3a: K after hub buy** — PASSED. K increased
- **3b: K after hub sell** — PASSED. K increased
- **3c: K after spoke launch** — PASSED. K increased

> K monotonically increases across all operations. No value leakage from the hub AMM.

### Test 4: Toll Booth Split
- **4a: Treasury received HEDGE** — PASSED. Treasury gained 963,818.92 HEDGE
- **4b: Hub S increased** — PASSED. Hub S grew by 50.00 ETH

> 50 ETH toll correctly splits: ~25 ETH buys HEDGE from hub → treasury, ~25 ETH + minted HEDGE → permanent hub LP.

### Test 5: Bonding Curve Reserve Solvency
- **5: Reserve solvency** — PASSED. Actual = Theoretical (0.0000% surplus)

> After 15 operations (10 buys + 5 sells of varying sizes), the spoke reserve exactly matches the theoretical reserve `m * S² / 2`. Protocol-favored rounding prevents any deficit.

### Test 6: POL Engine TWAP Protection
- **6a: Crank after upward price manipulation** — PASSED. Crank reverted (deviation: 20,950 bps)
- **6b: TWAP oracle active** — PASSED. TWAP is non-zero

> Sold 3.1M HEDGE to push spot 209% above TWAP. `crankPOL()` correctly reverted with TWAP deviation check. Oracle has sufficient history after setting 1s block intervals.

> **v1 finding**: The v1 test manipulated price *downward* (buying HEDGE), which the TWAP check doesn't block because low spot is safe for cranking. v2 correctly tested *upward* manipulation.

### Test 7: Equity Mint Depletion
- **7: 20 launches** — PASSED. Minted 22.16M HEDGE (2.22% of 1B max). Remaining: 93.84%

> Geometric decay working as designed. Each launch mints 0.1% of *remaining* supply, not total.

### Test 8: Same-Block MEV Protection
- **8: Buy+sell in same block** — PASSED. Buy reverted, sell succeeded

> `_enforceSameBlockLock` correctly prevents same-address buy+sell in a single block on spokes.

### Test 9: Cross-Market Arbitrage
- **9a: Spoke price independence** — PASSED. Price unchanged after massive hub manipulation
- **9b: Cross-market round-trip** — PASSED. Net loss of 0.197 ETH on 10 ETH input

> Spoke pricing (`P = m * S`) is completely independent of hub price. Cross-market round-trip (ETH → HEDGE → spoke tokens → HEDGE → ETH) loses ~2% to fees.

---

## Conclusion

The Hedgehog Protocol tokenomics are robust. All 9 attack vectors failed:

| Attack | Result | Why |
|--------|--------|-----|
| Buy/sell extraction | -1.99% per cycle | 1% fee each leg |
| Floor bypass | Reverts | `minSpokeSupply` check in `spokeSell` |
| Hub K violation | K always grows | Constant-product math correct |
| Toll exploitation | Split correct | 50/50 treasury/LP working |
| Curve insolvency | 0 deficit | Protocol-favored rounding |
| POL manipulation | Crank blocked | TWAP deviation check |
| Equity depletion | 2.22% after 20 launches | Geometric decay |
| Same-block MEV | Blocked | `_enforceSameBlockLock` |
| Cross-market arb | -2% loss | Independent spoke pricing + fees |

[Devin Session](https://app.devin.ai/sessions/a387043c4dff4744b1999995a5138a53)
