# HedgeCore

**Hedgehog Protocol** — A closed-loop memetoken launchpad on Sonic chain where every action hardens the $HEDGE price floor.

## Architecture

Built as a custom **Uniswap v4-inspired singleton** — no external AMM dependency, no license constraints.

```
HedgehogCore (Singleton)
├── Hub Pool (HEDGE/S) — constant-product AMM, permanent liquidity
├── Spoke Registry — linear bonding curve meme pools (P = m·S)
├── Toll Booth — spoke launch fees → 50% treasury + 50% LP burn
├── POL Engine — accumulated fees → permanent hub liquidity
└── TWAP Oracle — manipulation-resistant price feed

HedgeToken (ERC-20)
└── 1B max supply, controlled minting by HedgehogCore only

HedgehogRouter (Periphery)
└── Multi-step convenience functions (S → HEDGE → Meme in one tx)
```

## Key Mechanics

- **$HEDGE** is the hub token. Fixed max supply of 1 billion.
- **Spokes** are meme tokens on linear bonding curves, 1:1 backed by $HEDGE.
- **Toll Booth**: Launching a spoke costs $S. 50% converted to HEDGE for treasury, 50% paired + burned as permanent hub LP.
- **Equity Mint**: Each launch mints a decaying % of remaining HEDGE supply to treasury.
- **POL Engine**: 1% fee on spoke trades accumulates, then gets burned into hub LP. Public crank function.
- **Graduation**: At 50k HEDGE reserve, a spoke graduates (UI-only change, no migration).

## Security

- Per-address same-block trade lock (prevents flash loan loops)
- 100-block EOA-only window on new spokes (kills sniper bots)
- 1800-block TWAP oracle (~30 min on Sonic) with 10% deviation guard on POL burns
- Protocol-favored rounding (buys round up, sells round down)

## Development

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

### Build

```bash
forge build
```

### Test

```bash
forge test -vvv
```

### Deploy (Sonic Mainnet)

```bash
export DEPLOYER_PRIVATE_KEY=<your_key>
export TREASURY_ADDRESS=<your_treasury>

forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://rpc.soniclabs.com \
  --broadcast \
  --verify \
  -vvvv
```

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.26, Foundry |
| Math | Solady (FixedPointMathLib, SafeTransferLib) |
| Chain | Sonic (Chain ID: 146) |
| EVM | Cancun (transient storage support) |

## License

MIT
