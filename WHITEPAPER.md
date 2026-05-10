# Hedgehog Protocol

**A meme token launchpad with permanent liquidity on Sonic**

*sonicpump.meme*

---

## what is this

Hedgehog Protocol is a hub-and-spoke token factory on the Sonic network. Anyone can launch a meme token in one click. Every token has instant liquidity from block one — no LPs needed, no rug possible. All liquidity is protocol-owned and permanent. It never leaves.

The protocol runs on a single hub token called **$HEDGE**. Meme tokens are priced in HEDGE via bonding curves. HEDGE itself is tradeable against native S and USDC through two constant-product AMM pools. The pools grow every time someone launches a new meme or trades — and they can never shrink.

---

## how it works (the short version)

1. You pay a **50 S toll** to launch a meme token on the protocol
2. The meme token gets a **bonding curve** — price goes up as people buy, down as people sell
3. All trades go through HEDGE: you buy HEDGE from the hub pool, then buy the meme with HEDGE
4. A **1% fee** is collected on every hub swap in HEDGE
5. Those fees are permanently deposited back into the hub pools — split 50/50 between the S pool and the USDC pool
6. Nobody can ever withdraw this liquidity. There are no LP tokens. It's gone forever (in a good way)

---

## architecture

### the hub

HEDGE is the center of everything. It has two hub pools:

- **HEDGE/S** — trade HEDGE against Sonic's native token
- **HEDGE/USDC** — trade HEDGE against USDC (Circle native, 6 decimals)

Both pools are constant-product AMMs (x × y = k). When you buy HEDGE, the price goes up. When you sell, it goes down. Standard stuff.

The key difference from other AMMs: **there are no LP tokens**. The protocol itself owns all the liquidity. Nobody can pull it. The k invariant only increases over time as fees are recycled back into the pools.

More hub pools (new base assets) can be added in the future without changing anything about how meme tokens work.

### the spokes

Each meme token launched on the protocol is a "spoke" radiating from the HEDGE hub. Spokes are priced in HEDGE using a linear bonding curve:

```
Price(S) = m × S
```

Where:
- `S` = current circulating supply of the meme token
- `m` = slope constant (set at launch, immutable)

The cost to buy tokens from supply `S_old` to `S_new`:

```
Cost = (m/2) × (S_new² − S_old²)
```

The revenue from selling tokens back:

```
Revenue = (m/2) × (S_old² − S_new²)
```

Total HEDGE reserve backing a meme at supply `S`:

```
Reserve = (m/2) × S²
```

Every meme token has instant two-way liquidity from the moment it's created. No waiting for someone to add liquidity. No external LPs. The curve IS the market.

### the router

The router is a convenience layer. Instead of making users manually buy HEDGE first then buy a meme, the router wraps both steps into one transaction:

- `buyMemeWithS()` — swap S → HEDGE → meme in one tx
- `sellMemeForS()` — swap meme → HEDGE → S in one tx
- `buyMemeWithERC20()` — swap USDC → HEDGE → meme in one tx
- `sellMemeForERC20()` — swap meme → HEDGE → USDC in one tx

---

## toll booth

Launching a meme costs **50 S**. This is a flat fee, not a percentage. The toll is split:

- **50% → treasury** (protocol operations)
- **50% → HEDGE/S hub pool** (permanent liquidity)

The treasury half goes to a multisig controlled by the team. The hub pool half is converted to HEDGE and deposited into the S pool reserves — permanently increasing the pool's depth.

### equity minting

Each meme launch also mints **0.1% of HEDGE's remaining unminted supply** and sends it to the treasury. This means:

- Early launches mint more HEDGE (the remaining supply is larger)
- Later launches mint less (diminishing returns)
- Total HEDGE supply is capped at 5B — the equity minting rate approaches zero asymptotically

This is not dilution in the traditional sense — the HEDGE is minted into the treasury, not into circulation. It doesn't affect the hub pool reserves or the bonding curve mechanics.

---

## fee engine

Every hub pool swap (buying or selling HEDGE in either the S or USDC pool) pays a **1% fee** denominated in HEDGE. These fees accumulate in a pending buffer.

When `crankPOL()` is called (permissionlessly, by anyone), the protocol:

1. Takes all accumulated HEDGE fees
2. Divides them equally across all hub pools (currently 2: S pool and USDC pool)
3. Deposits each share into the respective pool's HEDGE reserve
4. Recalculates each pool's k invariant upward

The result: both hub pools get deeper over time. More depth means less slippage. Less slippage means better execution for traders. Better execution means more volume. More volume means more fees. Flywheel.

There is a TWAP deviation check — if the current spot price deviates more than 10% from the time-weighted average price, `crankPOL()` won't execute. This prevents manipulation of the POL deposit price.

---

## twap oracle

Each hub pool maintains its own time-weighted average price (TWAP) oracle. The oracle records the current price on every swap and computes a rolling average.

The TWAP serves two purposes:
1. **POL safety** — prevents cranking at manipulated prices
2. **External integrations** — other contracts can read the TWAP to get a manipulation-resistant price feed

The HEDGE/S pool and HEDGE/USDC pool have independent TWAP histories. Each is updated only when a swap occurs in that specific pool.

---

## security

### anti-MEV

For the first 100 blocks after a meme launches, only EOAs (externally owned accounts) can trade it. This prevents sandwich bots and flashloan attacks from sniping the initial supply. After 100 blocks, contracts can interact normally.

Additionally, the same address cannot buy and sell in the same block on the same spoke. This prevents single-block MEV extraction.

### minimum supply floor

Every meme has a floor of **10,000 tokens** that can never be sold. This prevents total drain attacks where someone buys the entire supply and then sells it all, extracting the complete reserve.

### reentrancy protection

All state-modifying functions use Solady's ReentrancyGuard. The hub pool, spoke buys/sells, and POL engine are all protected against reentrancy attacks.

### no admin keys on pools

Once the hub pool is initialized, the owner cannot drain it, pause it, or change the reserves. The only admin functions are:
- Adjusting the toll amount
- Adjusting the fee rate (capped at 5%)
- Adjusting the equity minting rate
- Adjusting bonding curve slope bounds
- Setting the treasury address

The owner **cannot** withdraw liquidity, change bonding curve slopes after launch, move user funds, or mint HEDGE beyond the cap.

---

## graduation

When a meme token's HEDGE reserve reaches **50,000 HEDGE**, it "graduates" — meaning it's proven enough demand to be considered a real token rather than a fly-by-night shitcoin.

Graduated memes get featured in the Pro DEX section of the frontend. This is purely a UI distinction — the bonding curve mechanics don't change. The reserve is still locked. The curve still works. Graduation is just a milestone, not a state change in the contract.

In the future, graduated memes could qualify for external LP pools on third-party DEXes, additional protocol features, or community governance. The protocol is extensible — the graduated flag is on-chain and readable by any contract.

---

## sunset mechanism

If a meme token sits at its minimum supply floor (10,000 tokens) for **30 consecutive days** with no buy or sell activity, it enters sunset mode.

When sunset is triggered:
- 50% of the remaining HEDGE reserve is returned to the HEDGE/S hub pool
- 50% is sent to the treasury
- The spoke is marked as sunset and can no longer be traded

This prevents abandoned memes from locking HEDGE liquidity forever. The reserve gets recycled back into the ecosystem where it can do useful work.

---

## token details

**$HEDGE**
- ERC-20 (Solady implementation)
- Max supply: 5,000,000,000 (5 billion)
- Decimals: 18
- Initial mint: 50,000,000 (50M, 1% of max) — split equally between both hub pools at launch
- Minter: HedgehogCore contract (only HedgehogCore can mint new HEDGE, via the equity mechanism)

**Meme tokens (spokes)**
- Not separate ERC-20 contracts — balances are tracked inside HedgehogCore via mappings
- Each spoke has a name, symbol, and metadata URI (IPFS)
- Transferable: spoke tokens support `transfer()` and `approve()/transferFrom()`
- Supply is virtual — minted on buy, burned on sell, all tracked in HedgehogCore state

---

## deployed contracts (Sonic mainnet)

| Contract | Address |
|---|---|
| HedgeToken | `0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c` |
| HedgehogCore | `0x985a53B9B82eF766E69Fd7Da49E4d53e1a13A27e` |
| HedgehogRouter | `0xB09fb21bA329F3318101A9C6C454080b6D2abbB2` |
| Treasury | `0xc81eAAbee7cCdfdcf5E82E5d2C0E222185BAF721` |

All contracts verified on [SonicScan](https://sonicscan.org).

USDC (Circle native on Sonic): `0x29219dd400f2Bf60E5a23d13Be72B486D4038894`

---

## initial pool state

**HEDGE/S Pool:**
- 959 S + 25M HEDGE
- Starting price: ~26,065 HEDGE per S

**HEDGE/USDC Pool:**
- 104.4 USDC + 25M HEDGE
- Starting price: ~239,387 HEDGE per USDC

**Seed allocation:**
- 97% of deployer balance used for pool seeding
- 50/50 split between S pool and USDC pool
- 3% reserved for gas costs
- S → USDC swap executed via Odos aggregator on Shadow DEX before deployment

---

## what this isn't

This is not a security. HEDGE is a utility token that serves as the routing layer for a meme token launchpad. It is not:

- A share in any company or entity
- A claim on any revenue, dividend, or distribution
- A representation of ownership in any asset, fund, or enterprise
- A promise of any future value, development, or action

The protocol is a set of immutable smart contracts deployed on the Sonic blockchain. The contracts do what the code says they do. Read the code. It's verified on SonicScan.

The toll, fee, and equity parameters can be adjusted by the protocol owner within hard-coded bounds. The owner cannot extract user funds, modify bonding curves, or drain pool liquidity. All pools are protocol-owned and permanent.

No one is telling you to buy anything. Do your own research. The code is the product.

---

## technical references

- [HedgeToken.sol](https://sonicscan.org/address/0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c#code) — ERC-20 token with capped supply and controlled minting
- [HedgehogCore.sol](https://sonicscan.org/address/0x985a53B9B82eF766E69Fd7Da49E4d53e1a13A27e#code) — Hub AMM, spoke bonding curves, toll booth, POL engine, TWAP oracle
- [HedgehogRouter.sol](https://sonicscan.org/address/0xB09fb21bA329F3318101A9C6C454080b6D2abbB2#code) — Convenience router for single-tx meme trades

All math uses 18-decimal fixed-point (WAD) precision via Solady's FixedPointMathLib. Rounding is protocol-favored: buys round up (you pay slightly more), sells round down (you receive slightly less).

---

*built on sonic. not financial advice. read the contracts.*
