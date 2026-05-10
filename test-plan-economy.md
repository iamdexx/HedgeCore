# Hedgehog Protocol Economy Stress Test Plan (v2 — Corrected)

## What Changed
PR #1 deployed core contracts (hub AMM, spoke bonding curves, toll booth, POL engine, sunset mechanism, minimum supply floor). PR #2 adds frontend. User requested: **"try to break the economy on the token using the anvil"**.

## Environment
- Anvil running on `http://127.0.0.1:8545` (chain 31337)
- HedgeToken: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- HedgehogCore: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`
- HedgehogRouter: `0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0`
- Hub seeded: 11 ETH + 10,000,000 HEDGE (now modified by prior test run — state is dirty)
- Owner/Deployer: account0 (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`)
- Treasury: account1 (`0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
- Attacker: account2 (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`, key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`)
- Attacker2: account3 (`0x90F79bf6EB2c4f870365E785982E1f101E93b906`, key: `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6`)
- Toll: 50 S, Fee: 1% (100 bps), minSpokeSupply: 10,000e18, Sunset threshold: 2,592,000 blocks

## Corrections from v1

### Test 1 was INVALID in v1
**Problem**: Spoke supply started at 0. Buying 140 tokens then trying to sell all 140 was blocked by the 10,000 token floor — NOT by fees/rounding. The "loss" was the buy amount that couldn't be sold, not evidence of fee protection.

**Fix**: First buy ~10,000 HEDGE worth of tokens to push spoke supply well above the 10,000 floor. THEN do buy/sell cycles ON TOP of that established supply. This isolates the fee/rounding effect from the floor enforcement.

### Test 6 TWAP finding
**Finding**: The TWAP check in `crankPOL()` only blocks `spot > TWAP * 1.1`. Buying HEDGE pushes spot DOWN (more S, less HEDGE in pool), so the check passes. The manipulation in v1 was in the wrong direction to trigger the guard. 

**Fix**: Add Test 6b — sell HEDGE to push spot UP, then try to crank. This should trigger the TWAP protection.

**Additional concern**: On Anvil with auto-mine, timestamps can be identical across blocks → `timeDiff == 0` → TWAP returns 0 → safety check skipped. Need to verify with `anvil_setBlockTimestampInterval`.

## Test Cases

### Test 1: Buy/Sell Cycle Value Extraction (CORRECTED)
**Goal**: Determine if rapid buy→sell cycles can extract more HEDGE than deposited.
**Key fix**: First establish spoke supply well above 10,000 floor, then test cycles.

**Steps**:
1. Launch fresh spoke (slope 1e14, toll 50 S)
2. Buy 10,000 HEDGE worth of tokens → pushes supply to ~14,142 tokens (above floor)
3. Advance block
4. Record HEDGE balance (B1)
5. Buy 100 HEDGE of spoke tokens
6. Advance block
7. Sell ALL received tokens back (supply drops to ~14,142, still above floor)
8. Record HEDGE balance (B2)
9. Compute loss = B1 - B2

**Pass criteria**: B2 < B1 (attacker lost money). Expected loss ≈ 2% from 1% fee on each leg. If B2 >= B1, VALUE EXTRACTION IS POSSIBLE.

**Repeat**: With 1 HEDGE, 10 HEDGE, 500 HEDGE, and 10x rapid 50-HEDGE cycles.

### Test 2: Minimum Supply Floor Enforcement (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 3: Hub Pool K Invariant (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 4: Toll Booth Split (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 5: Bonding Curve Reserve Solvency (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 6: POL Engine TWAP Protection (CORRECTED)
**Goal**: Verify TWAP blocks exploitation when spot is manipulated UPWARD.

**Steps for 6a (reverse manipulation)**:
1. Set Anvil block timestamp interval to 1s (`anvil_setBlockTimestampInterval`)
2. Advance 100+ blocks to build TWAP history with real time differences
3. Do several normal spoke trades to accumulate fees
4. Record hub reserves and TWAP
5. Sell a LARGE amount of HEDGE → pushes HEDGE/S ratio UP (spot > TWAP)
6. Immediately call `crankPOL()`
7. Expected: revert with "Spot too high vs TWAP"

**Pass criteria**: Crank MUST revert after upward price manipulation if deviation > 10%.

**Steps for 6b (TWAP history bypass)**:
1. Check if TWAP returns 0 on Anvil (would mean safety check is skipped)
2. If so, document as a deployment concern (not a code bug — just Anvil timing)

### Test 7: Equity Mint Depletion (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 8: Same-Block MEV Protection (unchanged)
Already passed in v1. Rerun for confirmation.

### Test 9: Cross-Market Arbitrage (NEW)
**Goal**: Test if manipulating the hub price affects spoke pricing in exploitable ways.

**Steps**:
1. Record spoke spot price before hub manipulation
2. Do massive hub buy (500 ETH → HEDGE) — changes hub HEDGE/S ratio
3. Record spoke spot price after — should be UNCHANGED (spoke price = m * S, independent of hub)
4. But: spoke BUY requires HEDGE. If attacker buys HEDGE cheap on hub, uses it to buy spoke tokens, then sells spoke tokens for HEDGE, then sells HEDGE on hub — is this profitable?

**Pass criteria**: Spoke spot price must NOT change from hub manipulation (it depends only on slope * supply). Any cross-market round-trip must lose money to fees.
