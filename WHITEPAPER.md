# Hedgehog Protocol — v1

**a permissionless meme token launchpad with permanent liquidity on Sonic**

*sonicpump.meme*

---

## wtf is this

Hedgehog Protocol is a hub-and-spoke token factory on the Sonic network. anyone can launch a meme token in one click. every token is a real ERC-20 with instant liquidity from block one — no external LPs needed, no seed money required from the launcher. all liquidity is protocol-owned and non-withdrawable.

the protocol has two layers:

1. **the liquidity engine** — hub pools, bonding curves, fees, POL accumulation. immutable once deployed. holds all the money.
2. **the token layer** — deploys real ERC-20 tokens per meme launch with optional feature toggles (referral, vesting). can be upgraded without touching liquidity.

the protocol runs on a single hub token called **$HEDGE**. memes are priced in HEDGE via bonding curves. HEDGE itself trades against native S and USDC through two constant-product AMM pools. these pools grow deeper over time as fees are recycled into them permanently. there is no withdrawal mechanism.

---

## how it works (the short version)

1. pay a **50 S toll** to launch a meme token
2. your meme gets a **bonding curve** — price up on buy, down on sell
3. a real **ERC-20 contract** gets deployed for your meme (visible in wallets, transferable, composable with anything)
4. all trades route through HEDGE: S → HEDGE → meme on buy; meme → HEDGE → S on sell
5. **1% fee** on every hub swap, denominated in HEDGE
6. fees get permanently deposited back into hub pools — split across all active pools
7. no LP tokens. no withdrawal mechanism. deposited liquidity is non-retrievable. it only goes up.

at launch, the creator can optionally enable:
- **referral rewards** — referrers earn a % of the meme token on referred buys
- **vesting locks** — purchased tokens are time-locked to prevent immediate dumps

feature configuration is set at launch and **cannot be changed after**. buyers know exactly what they're getting into before they buy. rules don't change.

---

## architecture

### the hub

HEDGE is the center of everything. two hub pools:

- **HEDGE/S** — trade HEDGE against Sonic's native token
- **HEDGE/USDC** — trade HEDGE against USDC (Circle native, 6 decimals)

both pools are constant-product AMMs (x × y = k). buy HEDGE, price goes up. sell, price goes down. standard stuff.

the key difference from other AMMs: **there are no LP tokens**. the protocol owns all the liquidity. nobody can pull it. the k invariant only increases over time as fees get recycled. it's a one-way ratchet.

more hub pools (new base assets) can be added later without breaking meme mechanics.

### the spokes (meme tokens)

each meme launched on the protocol is a "spoke" radiating from the HEDGE hub. priced in HEDGE via a linear bonding curve:

```
Price(S) = m × S

where:
  S = current circulating supply
  m = slope constant (set at launch, immutable)

cost to buy from S_old to S_new:
  Cost = (m/2) × (S_new² − S_old²)

revenue from selling:
  Revenue = (m/2) × (S_old² − S_new²)

total HEDGE reserve at supply S:
  Reserve = (m/2) × S²
```

every meme has instant two-way liquidity from the moment it's created. no waiting for someone to add liquidity. no external LPs. the curve IS the market.

### real ERC-20 tokens

every meme launched on the protocol deploys a real ERC-20 contract. the token:

- shows up in MetaMask, wallets, portfolio trackers
- can be transferred freely between addresses
- is indexable by DexScreener, GeckoTerminal, and other aggregators
- can be paired on external DEXes post-graduation
- is backed 1:1 by internal spoke balance held by the protocol

tokens are minted to the buyer on purchase and burned on sale. ERC-20 supply always equals the bonding curve balance. no fractional reserve. no unbacked tokens. 1:1 at all times.

the ERC-20 contract itself is non-upgradeable. once deployed, nobody can change its code. the only special permission is `minter` — which is set to the protocol's wrapper contract so it can mint on buy and burn on sell.

### how trades work

the protocol wraps everything into single transactions:

```
buyMemeWithS()  — S → HEDGE → meme (one tx)
sellMemeForS()  — meme → HEDGE → S (one tx)
```

under the hood:
1. your S goes to the hub pool, HEDGE comes back
2. HEDGE goes to the bonding curve, meme tokens get minted to your wallet
3. (or in reverse for sells)

all tolls, fees, and POL flow directly into the original liquidity pools. the token layer holds zero liquidity.

---

## toll booth

launching a meme costs **50 S**. flat fee, not a percentage. the toll is split:

- **50% → treasury** (protocol operations)
- **50% → HEDGE/S hub pool** (permanent liquidity, non-retrievable)

the hub pool half is converted to HEDGE and deposited into the S pool reserves — permanently increasing depth.

### equity minting

each launch also mints **0.01% of HEDGE's remaining unminted supply** to treasury. geometric decay:

- early launches mint more (remaining supply is larger)
- later launches mint less
- capped at 5B — rate approaches zero asymptotically. it never runs out.

not dilution — minted to treasury, not into circulation. doesn't affect pool reserves or curves.

---

## fee engine (POL)

every hub pool swap pays **1% fee** in HEDGE. fees accumulate in a pending buffer. when `crankPOL()` is called (by anyone, permissionless):

1. takes all accumulated HEDGE fees
2. splits equally across all hub pools (currently 2)
3. deposits each share into the pool's HEDGE reserve
4. k invariant goes up. pools get deeper. less slippage. more volume. more fees.

flywheel.

TWAP deviation check: if spot price deviates >10% from time-weighted average, crank won't execute. prevents manipulation of the POL deposit price.

---

## feature: referral rewards

when launching a meme token, the creator can enable a referral mechanism. entirely optional, configured at launch, immutable after.

**how it works:**

- launcher sets a referral percentage (1–500 bps, max 5%)
- when a buyer purchases using a referral link, the referrer gets a cut of the **meme tokens** from that purchase
- example: referral is 2%, buyer purchases 1000 tokens → buyer gets 980, referrer gets 20
- total minted from the bonding curve is unchanged (1000). referral is a redistribution, not additional inflation.

**what this is NOT:**

- referral rewards are paid in the **launcher's meme token** — not HEDGE, not S, not any protocol token. it is their token, not ours.
- the protocol does not pay referral rewards. the protocol provides tooling. the launcher configures the parameters. the smart contract executes on-chain.
- **there is no yield. there is no promised return.** no revenue sharing, no staking rewards, no dividends, no recurring distributions of any kind.
- referral is a one-time token split at the moment of purchase. that's it. nothing after.
- it's a marketing tool for token launchers to grow **their own token's** community. the protocol just provides the checkbox.

**be mindful of your jurisdiction.** referral mechanisms may be subject to local regulation depending on where you are. participants use this feature entirely at their own risk. the protocol is permissionless infrastructure — it does not control, endorse, or take responsibility for how this feature is used. this is not financial advice. this is not an investment product. you are responsible for understanding and complying with your local laws.

---

## feature: vesting locks

when launching a meme token, the creator can enable a time-lock on purchased tokens. anti-dump protection. configured at launch, immutable after.

**how it works:**

- launcher sets a vesting duration (up to 30 days max)
- when someone buys the meme token, their tokens are locked for the configured duration
- during lock period, buyer cannot sell
- after lock expires, buyer sells normally
- multiple purchases extend the lock (latest buy resets the timer)

this protects communities from immediate pump-and-dump behavior. the vesting duration is visible on-chain before purchase — buyers know what they're getting into. no surprises.

---

## feature immutability

all feature configurations are **permanent at launch**. once a token is deployed with referral at 3% and vesting at 7 days, those parameters cannot be changed by anyone — not the launcher, not the protocol owner, not anyone.

this is intentional:
- buyers can trust the rules won't change after they buy
- launchers can't flip vesting on after people already hold tokens
- referral percentages can't be jacked up or zeroed out

the trade-off: if a launcher wants different features, they launch a new token. old tokens keep their original configuration forever.

---

## TWAP oracle

each hub pool maintains its own time-weighted average price oracle. updated on every swap, computes a rolling average.

- **POL safety** — prevents cranking at manipulated prices
- **external integrations** — other contracts can read the TWAP for manipulation-resistant price feeds

---

## security

### anti-MEV

first 100 blocks after a meme launches: only EOAs can trade. no sandwich bots, no flashloan snipers. after 100 blocks, contracts interact normally. same address can't buy and sell in the same block on the same spoke.

### minimum supply floor

every meme has a floor of **50,000 tokens** that can never be sold. prevents total drain attacks. this means there's always HEDGE locked in the spoke reserve backing those tokens (reserve = slope/2 × supply²). the floor guarantees permanent two-way liquidity for every meme — there's always a price and always a way to trade.

### reentrancy protection

all state-modifying functions use Solady's ReentrancyGuard. hub pool, spoke buys/sells, POL engine — all protected.

### no admin keys on pools

once initialized, the owner cannot drain, pause, or change pool reserves. admin can only adjust: toll amount, fee rate (capped at 5%), equity rate, slope bounds, treasury address.

the owner **cannot** withdraw liquidity, change slopes after launch, move user funds, or mint beyond cap.

### 1:1 backing

every ERC-20 meme token in circulation is backed by exactly 1 unit of internal spoke balance held in the liquidity engine. mint on buy, burn on sell. no fractional reserve. no unbacked tokens.

---

## graduation

when a meme's HEDGE reserve hits **50,000 HEDGE**, it "graduates" — proved enough demand to be considered real. graduated memes get featured in the Pro DEX section. this is purely UI — curve mechanics don't change, reserve stays locked, nothing is different on-chain except a flag.

graduated memes are composable ERC-20 tokens. holders can pair them on external DEXes, use them in DeFi, or build communities around them. the bonding curve remains as a permanent source of two-way liquidity regardless.

---

## sunset mechanism

if a meme sits at minimum supply (50k tokens) for **30 consecutive days** with zero activity, it sunsets:

- 50% of remaining HEDGE reserve → HEDGE/S hub pool
- 50% → treasury
- spoke marked as sunset, no more trading

prevents dead memes from locking liquidity forever. reserve gets recycled.

---

## token details

**$HEDGE**
- ERC-20 (Solady implementation)
- max supply: 5,000,000,000 (5B)
- decimals: 18
- initial mint: 50M (1% of max) — split equally between both hub pools
- minter: HedgehogCore only

**meme tokens (spokes)**
- real ERC-20 contracts deployed per launch (one contract per meme)
- each has name, symbol, metadata URI (IPFS)
- fully transferable: standard transfer(), approve(), transferFrom()
- supply is elastic — minted on buy, burned on sell, backed 1:1 by bonding curve reserves
- non-upgradeable once deployed
- feature config (referral, vesting) is immutable per token

---

## deployed contracts (Sonic mainnet)

| Contract | Address |
|---|---|
| HedgeToken | `0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c` |
| HedgehogCore | `0x985a53B9B82eF766E69Fd7Da49E4d53e1a13A27e` |
| HedgehogRouter | `0xB09fb21bA329F3318101A9C6C454080b6D2abbB2` |
| ComboWrapper | `0xc931DD1e5eD9B59568DF50372701374706Bdbc60` |
| SpokeWrapper | `0x77223fed0c1e1148fA3FB3f315BDB519ff5107C1` |
| Treasury | `0xc81eAAbee7cCdfdcf5E82E5d2C0E222185BAF721` |

all contracts verified on [SonicScan](https://sonicscan.org).

USDC (Circle native on Sonic): `0x29219dd400f2Bf60E5a23d13Be72B486D4038894`

---

## initial pool state

**HEDGE/S Pool:**
- 959 S + 25M HEDGE
- ~26,065 HEDGE per S

**HEDGE/USDC Pool:**
- 104.4 USDC + 25M HEDGE
- ~239,387 HEDGE per USDC

---

## what this isn't

this is not a security. HEDGE is a utility token that serves as the routing layer for a meme token launchpad. it is not:

- a share in any company or entity
- a claim on any revenue, dividend, or distribution
- a representation of ownership in any asset, fund, or enterprise
- a promise of any future value, development, or action

**the protocol does not give yield. the protocol does not promise returns.** there is no revenue sharing, no staking rewards, no dividend mechanism, and no guaranteed appreciation of anything. HEDGE is a routing asset used for bonding curve mechanics — nothing more.

the referral feature is tooling provided to token launchers. referral rewards are paid in the **launcher's meme token** — it is their token, not ours. the protocol has no involvement beyond executing the on-chain logic. the protocol does not pay anyone anything.

hedgehog protocol is a set of immutable smart contracts deployed on the Sonic blockchain. the contracts do what the code says they do. read the code. it's verified on SonicScan. the protocol is permissionless infrastructure. anyone can deploy a token. anyone can buy or sell. the protocol does not curate, endorse, or take responsibility for any token launched through it.

**be mindful of your jurisdiction.** crypto regulation varies by country. referral mechanisms, token launches, and speculative trading may be regulated where you live. everything you do on this protocol is entirely at your own risk.

no one is telling you to buy anything. dyor. the code is the product.

---

## technical references

- [HedgeToken.sol](https://sonicscan.org/address/0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c#code) — ERC-20 with capped supply and controlled minting
- [HedgehogCore.sol](https://sonicscan.org/address/0x985a53B9B82eF766E69Fd7Da49E4d53e1a13A27e#code) — hub AMM, spoke curves, toll booth, POL engine, TWAP oracle
- [HedgehogRouter.sol](https://sonicscan.org/address/0xB09fb21bA329F3318101A9C6C454080b6D2abbB2#code) — convenience router for single-tx meme trades
- [ComboWrapper.sol](https://sonicscan.org/address/0xc931DD1e5eD9B59568DF50372701374706Bdbc60#code) — ERC-20 deployment + referral + vesting features
- [SpokeWrapper.sol](https://sonicscan.org/address/0x77223fed0c1e1148fA3FB3f315BDB519ff5107C1#code) — basic ERC-20 wrapper (no features)

all math uses 18-decimal fixed-point (WAD) precision via Solady's FixedPointMathLib. rounding is protocol-favored: buys round up (you pay slightly more), sells round down (you receive slightly less).

---

*built on sonic. not financial advice. read the contracts. participate at your own risk.*
