# Integration Submissions

Ready-to-submit materials for listing Hedgehog Protocol on DeFi aggregators, explorers, and directories.

## Status

| Platform | Status | Action Required |
|----------|--------|-----------------|
| DeFiLlama | Ready to submit | Fork repo, copy adapter, submit PR |
| CoinGecko | Ready to submit | Submit form after GeckoTerminal DEX listing |
| GeckoTerminal | Ready to submit | Submit DEX listing form |
| Dexscreener | Ready to submit | Submit via Discord |
| SonicScan Directory | Ready to submit | Submit listing form |
| Sonic Ecosystem (MySonic) | Ready to submit | Submit via form |

## Details

### 1. DeFiLlama (TVL Tracker)

**What:** Lists protocol TVL on defillama.com — the #1 DeFi analytics dashboard.

**How to submit:**
1. Fork https://github.com/DefiLlama/DefiLlama-Adapters
2. Create `projects/hedgehog-protocol/index.js` with the content from `integrations/defillama/index.js`
3. Open a PR to `DefiLlama/DefiLlama-Adapters` with this description:

```
##### Name (to be shown on DefiLlama): Hedgehog Protocol

##### Twitter Link: [your X link]

##### List of audit links if any: N/A (contracts verified on SonicScan)

##### Website Link: https://sonicpump.meme

##### Logo (High resolution, will be shown with rounded borders): https://sonicpump.meme/logo.png

##### Current TVL: ~1,063 S + 104 USDC (~$150)

##### Treasury Addresses (if the protocol has treasury): 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e (HedgehogCore holds all POL)

##### Chain: Sonic

##### Coingecko ID: (leave empty, not listed yet)

##### Coinmarketcap ID: (leave empty, not listed yet)

##### Short Description (to be shown on DefiLlama): Meme launchpad on Sonic with protocol-owned liquidity and bonding curve mechanics.

##### Token address and ticker if any: 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c (HEDGE)

##### Category: Dexes

##### Oracle Provider(s): None (uses internal TWAP)

##### Implementation Details: Protocol uses constant-product AMM for hub pools (HEDGE/S and HEDGE/USDC) and bonding curves for spoke tokens.

##### Documentation/Proof: https://sonicpump.meme/whitepaper

##### Forked from (if any): Original implementation

##### Methodology: TVL = native S balance + USDC balance held in HedgehogCore contract (0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e). All liquidity is protocol-owned and non-withdrawable.
```

4. Enable "Allow edits by maintainers" on the PR

---

### 2. GeckoTerminal (DEX Listing)

**What:** Gets your DEX indexed on GeckoTerminal, which also feeds into CoinGecko.

**How to submit:**
1. Go to https://about.geckoterminal.com/dex-chain-listing
2. Click "Get Listed"
3. Fill in:
   - **DEX Name:** Hedgehog Protocol
   - **Chain:** Sonic (EVM, Chain ID 146)
   - **Factory Address:** 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e (HedgehogCore)
   - **Router Address:** 0xB09fb21bA329F3318101A9C6C454080b6D2abbB2 (HedgehogRouter)
   - **DEX Type:** Custom AMM (constant-product for hub, bonding curve for spokes)
   - **Website:** https://sonicpump.meme
   - **Documentation:** https://sonicpump.meme/whitepaper

**Note:** GeckoTerminal Express Listing ($10K) gets 7-day turnaround. Regular queue is up to 3 months. Once listed on GT, CoinGecko listing follows automatically.

---

### 3. CoinGecko (Token Listing)

**What:** Lists HEDGE token on coingecko.com — the most visited crypto data site.

**Prerequisites:** Token must be tradable on a tracked exchange (GeckoTerminal listing satisfies this).

**How to submit:**
1. Create a CoinGecko account at https://www.coingecko.com
2. Go to https://www.coingecko.com/request-form
3. Select "Token" → "Active Listing"
4. Fill in:
   - **Token Name:** Hedgehog
   - **Token Symbol:** HEDGE
   - **Chain:** Sonic
   - **Contract Address:** 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c
   - **Decimals:** 18
   - **Website:** https://sonicpump.meme
   - **Whitepaper:** https://sonicpump.meme/whitepaper
   - **Description:** Hedgehog Protocol is a meme launchpad on Sonic with protocol-owned liquidity. HEDGE is the native token powering hub pool swaps and spoke token launches via bonding curves.
   - **Max Supply:** 5,000,000,000
   - **Circulating Supply:** 50,000,000

5. Post public verification on X (required):
   > Submitting Hedgehog (HEDGE) to @coaboringecko for listing.
   > Contract: 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c (Sonic)
   > Website: https://sonicpump.meme

---

### 4. Dexscreener

**What:** Real-time DEX analytics used by millions of traders.

**How to submit:**
1. Join Dexscreener Discord: https://discord.gg/dexscreener
2. Go to #dex-listing channel
3. Post:
   ```
   DEX Name: Hedgehog Protocol
   Chain: Sonic (Chain ID 146)
   Factory/Core: 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e
   Router: 0xB09fb21bA329F3318101A9C6C454080b6D2abbB2
   Website: https://sonicpump.meme
   Contracts: Verified on SonicScan
   Type: Custom AMM (constant-product hub pools + bonding curve spoke pools)
   ```

**Requirements:** DEX needs significant liquidity and volume. May need to build volume first.

---

### 5. SonicScan Directory

**What:** Gets listed in Sonic's official block explorer directory.

**How to submit:**
1. Go to https://sonicscan.org/directory
2. Click "Submit a Listing" (bottom of page)
3. Fill in project details:
   - **Name:** Hedgehog Protocol (sonicpump.meme)
   - **Category:** DeFi / DEX
   - **Description:** Meme launchpad with protocol-owned liquidity on Sonic
   - **Website:** https://sonicpump.meme
   - **Contracts:** All verified (HedgeToken, HedgehogCore, HedgehogRouter)

---

### 6. Sonic Ecosystem (MySonic)

**What:** Gets listed on Sonic Labs' official ecosystem page at https://my.soniclabs.com/apps

**How to submit:**
- Reach out via Sonic Labs Discord or check for ecosystem submission forms
- Sonic Labs actively promotes new dApps built on their chain
- Discord: https://discord.gg/soniclabs

---

### 7. Token List (Already Done)

The standard token list JSON is served at:
`https://sonicpump.meme/tokenlist.json`

This can be submitted to aggregators (1inch, Paraswap, etc.) for token discovery.

---

## Contract Addresses (Sonic Mainnet)

| Contract | Address |
|----------|---------|
| HedgeToken | 0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c |
| HedgehogCore | 0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e |
| HedgehogRouter | 0xB09fb21bA329F3318101A9C6C454080b6D2abbB2 |
| USDC (Sonic) | 0x29219dd400f2Bf60E5a23d13Be72B486D4038894 |

## Priority Order

1. **DeFiLlama** — easiest, just a GitHub PR. Shows TVL immediately after merge.
2. **GeckoTerminal** — unlocks CoinGecko listing automatically. Critical path.
3. **SonicScan Directory** — quick win, high visibility for Sonic users.
4. **CoinGecko** — biggest exposure, but depends on GeckoTerminal first.
5. **Dexscreener** — needs volume, submit after some trading activity.
6. **MySonic** — good for ecosystem visibility, low effort.
