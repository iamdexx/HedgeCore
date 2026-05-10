"use client";

import Image from "next/image";
import Link from "next/link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-4 text-sm leading-relaxed text-zinc-400 sm:text-base">
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 font-mono text-xs text-green-400 sm:text-sm">
      {children}
    </pre>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-violet-400">{children}</span>;
}

export default function WhitepaperPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <Image
            src="/hedge-token.png"
            alt="HEDGE"
            width={80}
            height={80}
            className="rounded-full"
          />
        </div>
        <h1 className="glow-text text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          hedgehog <span className="text-violet-400">protocol</span>
        </h1>
        <p className="mt-3 text-base text-zinc-500 sm:text-lg">
          a meme token launchpad with permanent liquidity on sonic
        </p>
        <p className="mt-1 text-sm text-violet-400 font-bold">sonicpump.meme</p>
      </div>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* wtf is this */}
      <Section title="wtf is this">
        <p>
          Hedgehog Protocol is a hub-and-spoke token factory on Sonic. anyone can launch a meme token in one click. every token gets instant liquidity from block one — no external LPs needed. all liquidity is protocol-owned and non-withdrawable.
        </p>
        <p>
          the protocol runs on a single hub token called <Highlight>$HEDGE</Highlight>. memes are priced in HEDGE via bonding curves. HEDGE itself trades against native S and USDC through two constant-product AMM pools. the pools receive fee deposits every time someone launches a meme or trades. there is no withdrawal mechanism.
        </p>
      </Section>

      {/* how it works */}
      <Section title="how it works">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <ol className="list-decimal list-inside space-y-2 text-zinc-300">
            <li>pay a <Highlight>50 S toll</Highlight> to launch a meme token</li>
            <li>your meme gets a <Highlight>bonding curve</Highlight> — price up on buy, down on sell</li>
            <li>all trades route through HEDGE: buy HEDGE from hub pool, then buy meme with HEDGE</li>
            <li><Highlight>1% fee</Highlight> on every hub swap, denominated in HEDGE</li>
            <li>fees get permanently deposited back into hub pools — 50/50 split between S pool and USDC pool</li>
            <li>no LP tokens. no withdrawal mechanism. deposited liquidity is non-retrievable</li>
          </ol>
        </div>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* architecture */}
      <Section title="architecture">
        <h3 className="text-lg font-bold text-white uppercase tracking-wide">the hub</h3>
        <p>
          HEDGE is the center of everything. two hub pools:
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li><Highlight>HEDGE/S</Highlight> — trade HEDGE against Sonic&apos;s native token</li>
          <li><Highlight>HEDGE/USDC</Highlight> — trade HEDGE against USDC (Circle native, 6 decimals)</li>
        </ul>
        <p>
          both pools are constant-product AMMs (x &times; y = k). standard stuff. the key difference: <span className="text-white font-semibold">there are no LP tokens</span>. the protocol owns all liquidity. nobody can pull it. the k invariant only increases over time as fees get recycled.
        </p>
        <p className="text-zinc-500 text-xs">
          more hub pools (new base assets) can be added later without breaking meme mechanics.
        </p>

        <h3 className="mt-8 text-lg font-bold text-white uppercase tracking-wide">the spokes</h3>
        <p>
          each meme is a &quot;spoke&quot; radiating from the HEDGE hub. priced in HEDGE via a linear bonding curve:
        </p>
        <Code>{`Price(S) = m × S

where:
  S = current circulating supply
  m = slope constant (set at launch, immutable)

cost to buy from S_old to S_new:
  Cost = (m/2) × (S_new² − S_old²)

revenue from selling:
  Revenue = (m/2) × (S_old² − S_new²)

total HEDGE reserve at supply S:
  Reserve = (m/2) × S²`}</Code>
        <p>
          every meme has instant two-way liquidity from the moment it&apos;s created. no waiting for someone to add liquidity. the curve IS the market.
        </p>

        <h3 className="mt-8 text-lg font-bold text-white uppercase tracking-wide">the router</h3>
        <p>
          convenience layer. wraps multi-step swaps into one tx so you don&apos;t have to manually buy HEDGE first:
        </p>
        <Code>{`buyMemeWithS()     — S → HEDGE → meme
sellMemeForS()     — meme → HEDGE → S
buyMemeWithERC20() — USDC → HEDGE → meme
sellMemeForERC20() — meme → HEDGE → USDC`}</Code>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* toll booth */}
      <Section title="toll booth">
        <p>
          launching a meme costs <Highlight>50 S</Highlight>. flat fee. the toll is split:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
            <p className="text-2xl font-black text-violet-400">50%</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">treasury</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
            <p className="text-2xl font-black text-green-400">50%</p>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">permanent LP</p>
          </div>
        </div>
        <p>
          the hub pool half is converted to HEDGE and deposited into the S pool reserves — permanently increasing depth.
        </p>

        <h3 className="mt-8 text-lg font-bold text-white uppercase tracking-wide">equity minting</h3>
        <p>
          each launch also mints <Highlight>0.01% of HEDGE&apos;s remaining unminted supply</Highlight> to treasury. geometric decay:
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li>early launches mint more (remaining supply is larger)</li>
          <li>later launches mint less (geometric decay)</li>
          <li>capped at 5B — rate approaches zero asymptotically. it never runs out</li>
        </ul>
        <p className="text-zinc-500 text-xs">
          not dilution — minted to treasury, not into circulation. doesn&apos;t affect pool reserves or curves.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* fee engine */}
      <Section title="fee engine">
        <p>
          every hub pool swap pays <Highlight>1% fee</Highlight> in HEDGE. fees accumulate in a pending buffer. when <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-green-400">crankPOL()</code> is called (by anyone, permissionless):
        </p>
        <ol className="list-decimal list-inside space-y-1 text-zinc-300">
          <li>takes all accumulated HEDGE fees</li>
          <li>splits equally across all hub pools (currently 2)</li>
          <li>deposits each share into the pool&apos;s HEDGE reserve</li>
          <li>k invariant goes up. pools get deeper. less slippage. more volume. more fees.</li>
        </ol>
        <p className="mt-4">
          TWAP deviation check: if spot price deviates &gt;10% from time-weighted average, crank won&apos;t execute. prevents manipulation.
        </p>
      </Section>

      {/* twap */}
      <Section title="twap oracle">
        <p>
          each hub pool maintains its own time-weighted average price oracle. updated on every swap, computes a rolling average.
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li><span className="text-white">POL safety</span> — prevents cranking at manipulated prices</li>
          <li><span className="text-white">external integrations</span> — other contracts can read the TWAP for manipulation-resistant price feeds</li>
        </ul>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* security */}
      <Section title="security">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">anti-MEV</h3>
            <p>first 100 blocks after a meme launches: only EOAs can trade. no sandwich bots, no flashloan snipers. after 100 blocks, contracts can interact normally. same address can&apos;t buy and sell in the same block on the same spoke.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">minimum supply floor</h3>
            <p>every meme has a floor of <Highlight>10,000 tokens</Highlight> that can never be sold. prevents total drain attacks.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">reentrancy protection</h3>
            <p>all state-modifying functions use Solady&apos;s ReentrancyGuard. hub pool, spoke buys/sells, POL engine — all protected.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">no admin keys on pools</h3>
            <p>once initialized, the owner cannot drain, pause, or change pool reserves. admin can only adjust: toll amount, fee rate (capped at 5%), equity rate, slope bounds, treasury address. owner <span className="text-red-400 font-semibold">cannot</span> withdraw liquidity, change slopes after launch, move user funds, or mint beyond cap.</p>
          </div>
        </div>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* graduation */}
      <Section title="graduation">
        <p>
          when a meme&apos;s HEDGE reserve hits <Highlight>50,000 HEDGE</Highlight>, it &quot;graduates&quot; — proved enough demand to be considered real rather than a fly-by-night shitcoin. graduated memes get featured in the Pro DEX section. this is purely UI — curve mechanics don&apos;t change, reserve stays locked.
        </p>
        <p className="text-zinc-500 text-xs">
          future: graduated memes could qualify for external LP pools, additional features, or community governance. the flag is on-chain and readable by any contract.
        </p>
      </Section>

      {/* sunset */}
      <Section title="sunset mechanism">
        <p>
          if a meme sits at minimum supply (10k tokens) for <Highlight>30 consecutive days</Highlight> with zero activity, it sunsets:
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li>50% of remaining HEDGE reserve → HEDGE/S hub pool</li>
          <li>50% → treasury</li>
          <li>spoke marked as sunset, no more trading</li>
        </ul>
        <p className="text-zinc-500 text-xs">
          prevents dead memes from locking liquidity. reserve gets recycled back into the ecosystem.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* token details */}
      <Section title="token details">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wide mb-2">$HEDGE</h3>
          <ul className="space-y-1 text-zinc-300 text-sm">
            <li>ERC-20 (Solady implementation)</li>
            <li>max supply: <span className="text-white font-bold">5,000,000,000</span> (5B)</li>
            <li>decimals: 18</li>
            <li>initial mint: 50M (1% of max) — split equally between both hub pools</li>
            <li>minter: HedgehogCore only (via equity mechanism)</li>
          </ul>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-2">meme tokens (spokes)</h3>
          <ul className="space-y-1 text-zinc-300 text-sm">
            <li>not separate ERC-20 contracts — balances tracked in HedgehogCore mappings</li>
            <li>each spoke has name, symbol, metadata URI (IPFS)</li>
            <li>transferable: supports transfer() and approve()/transferFrom()</li>
            <li>supply is virtual — minted on buy, burned on sell</li>
          </ul>
        </div>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* deployed contracts */}
      <Section title="deployed contracts">
        <p className="mb-3 text-xs text-zinc-500 uppercase tracking-wide">sonic mainnet &bull; all verified on sonicscan</p>
        <div className="space-y-2">
          {[
            { name: "HedgeToken", addr: "0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c" },
            { name: "HedgehogCore", addr: "0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e" },
            { name: "HedgehogRouter", addr: "0xB09fb21bA329F3318101A9C6C454080b6D2abbB2" },
            { name: "Treasury", addr: "0xc81eAAbee7cCdfdcf5E82E5d2C0E222185BAF721" },
          ].map((c) => (
            <a
              key={c.name}
              href={`https://sonicscan.org/address/${c.addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-violet-500/40 hover:bg-violet-600/5"
            >
              <span className="text-sm font-bold text-white">{c.name}</span>
              <span className="font-mono text-xs text-zinc-500 truncate ml-2">{c.addr.slice(0, 6)}...{c.addr.slice(-4)}</span>
            </a>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          USDC (Circle native on Sonic): <code className="text-zinc-400">0x29219dd400f2Bf60E5a23d13Be72B486D4038894</code>
        </p>
      </Section>

      {/* initial pool state */}
      <Section title="initial pool state">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">HEDGE/S pool</p>
            <p className="text-white text-sm">959 S + 25M HEDGE</p>
            <p className="text-zinc-500 text-xs mt-1">~26,065 HEDGE per S</p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <p className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">HEDGE/USDC pool</p>
            <p className="text-white text-sm">104.4 USDC + 25M HEDGE</p>
            <p className="text-zinc-500 text-xs mt-1">~239,387 HEDGE per USDC</p>
          </div>
        </div>
        <p className="text-zinc-500 text-xs mt-3">
          97% of deployer balance seeded. 50/50 split. 3% gas reserve. S → USDC via Odos on Shadow DEX.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* disclaimer */}
      <Section title="what this isn&apos;t">
        <div className="rounded-lg border border-red-900/30 bg-red-950/20 p-4">
          <p className="text-zinc-300 text-sm">
            this is not a security. HEDGE is a utility token that serves as the routing layer for a meme token launchpad. it is not:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-zinc-400 text-sm">
            <li>a share in any company or entity</li>
            <li>a claim on any revenue, dividend, or distribution</li>
            <li>a representation of ownership in any asset, fund, or enterprise</li>
            <li>a promise of any future value, development, or action</li>
          </ul>
          <p className="mt-3 text-zinc-300 text-sm">
            the protocol is a set of immutable smart contracts on Sonic. the contracts do what the code says. read the code. it&apos;s verified on SonicScan.
          </p>
          <p className="mt-2 text-zinc-300 text-sm">
            toll, fee, and equity parameters can be adjusted by the protocol owner within hard-coded bounds. the owner cannot extract user funds, modify bonding curves, or drain pool liquidity. all pools are protocol-owned and permanent.
          </p>
          <p className="mt-3 text-zinc-500 text-xs font-bold uppercase">
            no one is telling you to buy anything. dyor. the code is the product.
          </p>
        </div>
      </Section>

      {/* technical references */}
      <Section title="technical references">
        <div className="space-y-2">
          {[
            { name: "HedgeToken.sol", desc: "ERC-20 with capped supply and controlled minting", addr: "0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c" },
            { name: "HedgehogCore.sol", desc: "hub AMM, spoke curves, toll booth, POL engine, TWAP oracle", addr: "0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e" },
            { name: "HedgehogRouter.sol", desc: "convenience router for single-tx meme trades", addr: "0xB09fb21bA329F3318101A9C6C454080b6D2abbB2" },
          ].map((c) => (
            <a
              key={c.name}
              href={`https://sonicscan.org/address/${c.addr}#code`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 transition-colors hover:border-violet-500/40"
            >
              <span className="text-sm font-bold text-white">{c.name}</span>
              <span className="ml-2 text-xs text-zinc-500">{c.desc}</span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          all math uses 18-decimal fixed-point (WAD) precision via Solady&apos;s FixedPointMathLib. rounding is protocol-favored: buys round up, sells round down.
        </p>
      </Section>

      {/* footer */}
      <div className="mt-12 border-t border-zinc-800 pt-8 text-center">
        <p className="text-xs text-zinc-600 italic">
          built on sonic. not financial advice. read the contracts.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Link href="/hub" className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            enter app &rarr;
          </Link>
          <a href="https://sonicscan.org/address/0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
            sonicscan
          </a>
        </div>
      </div>
    </main>
  );
}
