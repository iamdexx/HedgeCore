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
        <p className="mt-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">v1</p>
        <p className="mt-3 text-base text-zinc-500 sm:text-lg">
          a permissionless meme token launchpad with permanent liquidity on sonic
        </p>
        <p className="mt-1 text-sm text-violet-400 font-bold">sonicpump.meme</p>
      </div>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* wtf is this */}
      <Section title="wtf is this">
        <p>
          Hedgehog Protocol is a hub-and-spoke token factory on Sonic. anyone can launch a meme token in one click. every token is a real ERC-20 with instant liquidity from block one — no external LPs needed, no seed money required. all liquidity is protocol-owned and non-withdrawable.
        </p>
        <p>the protocol has two layers:</p>
        <ol className="list-decimal list-inside space-y-1 text-zinc-300">
          <li><span className="text-white font-semibold">the liquidity engine</span> — hub pools, bonding curves, fees, POL accumulation. immutable. holds all the money.</li>
          <li><span className="text-white font-semibold">the token layer</span> — deploys real ERC-20 tokens per meme launch with optional feature toggles (referral, vesting). upgradeable without touching liquidity.</li>
        </ol>
        <p>
          the protocol runs on a single hub token called <Highlight>$HEDGE</Highlight>. memes are priced in HEDGE via bonding curves. HEDGE itself trades against native S and USDC through two constant-product AMM pools. these pools grow deeper over time as fees are recycled into them permanently. there is no withdrawal mechanism.
        </p>
      </Section>

      {/* how it works */}
      <Section title="how it works">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <ol className="list-decimal list-inside space-y-2 text-zinc-300">
            <li>pay a <Highlight>50 S toll</Highlight> to launch a meme token</li>
            <li>your meme gets a <Highlight>bonding curve</Highlight> — price up on buy, down on sell</li>
            <li>a real <Highlight>ERC-20 contract</Highlight> gets deployed for your meme (visible in wallets, transferable, composable with anything)</li>
            <li>all trades route through HEDGE: S &rarr; HEDGE &rarr; meme on buy; meme &rarr; HEDGE &rarr; S on sell</li>
            <li><Highlight>1% fee</Highlight> on every hub swap, denominated in HEDGE</li>
            <li>fees get permanently deposited back into hub pools — split across all active pools</li>
            <li>no LP tokens. no withdrawal mechanism. deposited liquidity is non-retrievable. it only goes up.</li>
          </ol>
        </div>
        <p>at launch, the creator can optionally enable:</p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li><Highlight>referral rewards</Highlight> — referrers earn a % of the meme token on referred buys</li>
          <li><Highlight>vesting locks</Highlight> — purchased tokens are time-locked to prevent immediate dumps</li>
        </ul>
        <p className="text-white font-semibold">
          feature configuration is set at launch and cannot be changed after. buyers know exactly what they&apos;re getting into. rules don&apos;t change.
        </p>
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
          both pools are constant-product AMMs (x &times; y = k). the key difference: <span className="text-white font-semibold">there are no LP tokens</span>. the protocol owns all liquidity. nobody can pull it. the k invariant only increases over time as fees get recycled. it&apos;s a one-way ratchet.
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
          every meme has instant two-way liquidity from the moment it&apos;s created. no waiting. the curve IS the market.
        </p>

        <h3 className="mt-8 text-lg font-bold text-white uppercase tracking-wide">real ERC-20 tokens</h3>
        <p>
          every meme launched deploys a real ERC-20 contract:
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li>shows up in MetaMask, wallets, portfolio trackers</li>
          <li>transferable freely between addresses</li>
          <li>indexable by DexScreener, GeckoTerminal, aggregators</li>
          <li>can be paired on external DEXes post-graduation</li>
          <li>backed 1:1 by bonding curve reserves at all times</li>
        </ul>
        <p>
          minted on buy, burned on sell. no fractional reserve. the ERC-20 contract is <span className="text-white font-semibold">non-upgradeable</span> once deployed.
        </p>

        <h3 className="mt-8 text-lg font-bold text-white uppercase tracking-wide">how trades work</h3>
        <Code>{`buyMemeWithS()  — S → HEDGE → meme (one tx)
sellMemeForS()  — meme → HEDGE → S (one tx)`}</Code>
        <p>
          all tolls, fees, and POL flow directly into the original liquidity pools. the token layer holds zero liquidity.
        </p>
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
          <li>later launches mint less</li>
          <li>capped at 5B — rate approaches zero asymptotically. it never runs out</li>
        </ul>
        <p className="text-zinc-500 text-xs">
          not dilution — minted to treasury, not into circulation. doesn&apos;t affect pool reserves or curves.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* fee engine */}
      <Section title="fee engine (POL)">
        <p>
          every hub pool swap pays <Highlight>1% fee</Highlight> in HEDGE. fees accumulate in a pending buffer. when <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-green-400">crankPOL()</code> is called (by anyone, permissionless):
        </p>
        <ol className="list-decimal list-inside space-y-1 text-zinc-300">
          <li>takes all accumulated HEDGE fees</li>
          <li>splits equally across all hub pools (currently 2)</li>
          <li>deposits each share into the pool&apos;s HEDGE reserve</li>
          <li>k invariant goes up. pools get deeper. less slippage. more volume. more fees.</li>
        </ol>
        <p className="mt-2 text-white font-semibold">flywheel.</p>
        <p className="mt-4">
          TWAP deviation check: if spot price deviates &gt;10% from time-weighted average, crank won&apos;t execute. prevents manipulation.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* referral */}
      <Section title="feature: referral rewards">
        <p>
          when launching a meme, the creator can enable a referral mechanism. entirely optional, configured at launch, <span className="text-white font-semibold">immutable after</span>.
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-white font-semibold mb-2">how it works:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>launcher sets referral % (1–500 bps, max 5%)</li>
            <li>buyer purchases using a referral link → referrer gets a cut of the <span className="text-white">meme tokens</span></li>
            <li>example: 2% referral, buyer buys 1000 → buyer gets 980, referrer gets 20</li>
            <li>total from curve is unchanged (1000). it&apos;s redistribution, not inflation</li>
          </ul>
        </div>
        <div className="mt-4 rounded-lg border border-red-900/30 bg-red-950/20 p-4">
          <p className="text-white font-semibold mb-2">what this is NOT:</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300 text-sm">
            <li>referral rewards are paid in the <span className="text-white font-bold">launcher&apos;s meme token</span> — not HEDGE, not S, not any protocol token. it is their token, not ours.</li>
            <li>the protocol does not pay referral rewards. it provides tooling. the smart contract executes on-chain.</li>
            <li><span className="text-red-400 font-bold">there is no yield. there is no promised return.</span> no revenue sharing, no staking rewards, no dividends, no recurring distributions.</li>
            <li>referral is a one-time token split at the moment of purchase. that&apos;s it.</li>
            <li>it&apos;s a marketing tool for launchers to grow <span className="text-white">their own token&apos;s</span> community.</li>
          </ul>
          <p className="mt-3 text-zinc-400 text-sm font-semibold">
            be mindful of your jurisdiction. referral mechanisms may be subject to local regulation. participants use this feature entirely at their own risk. the protocol is permissionless infrastructure — it does not control, endorse, or take responsibility for how this feature is used.
          </p>
        </div>
      </Section>

      {/* vesting */}
      <Section title="feature: vesting locks">
        <p>
          anti-dump protection. configured at launch, <span className="text-white font-semibold">immutable after</span>.
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <ul className="list-disc list-inside space-y-1 text-zinc-300">
            <li>launcher sets vesting duration (up to 30 days max)</li>
            <li>bought tokens are locked for that duration — cannot sell during lock</li>
            <li>after lock expires, sell normally</li>
            <li>multiple purchases extend the lock (latest buy resets timer)</li>
          </ul>
        </div>
        <p>
          protects communities from pump-and-dump. vesting duration is visible on-chain before purchase — no surprises.
        </p>
      </Section>

      {/* feature immutability */}
      <Section title="feature immutability">
        <p>
          all feature configurations are <span className="text-white font-semibold">permanent at launch</span>. once a token is deployed with referral at 3% and vesting at 7 days, those parameters cannot be changed by anyone — not the launcher, not the protocol owner, nobody.
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li>buyers can trust the rules won&apos;t change after they buy</li>
          <li>launchers can&apos;t flip vesting on after people hold tokens</li>
          <li>referral percentages can&apos;t be jacked up or zeroed out</li>
        </ul>
        <p className="text-zinc-500 text-xs">
          trade-off: want different features? launch a new token. old tokens keep their config forever.
        </p>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

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
            <p>first 100 blocks after launch: only EOAs can trade. no sandwich bots, no flashloan snipers. same address can&apos;t buy and sell in the same block.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">minimum supply floor</h3>
            <p>every meme has a floor of <Highlight>50,000 tokens</Highlight> that can never be sold. prevents total drain attacks. this means there&apos;s always HEDGE locked in the spoke reserve backing those tokens (reserve = slope/2 × supply²). the floor guarantees permanent two-way liquidity — there&apos;s always a price and always a way to trade.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">reentrancy protection</h3>
            <p>all state-modifying functions use Solady&apos;s ReentrancyGuard. hub pool, spoke buys/sells, POL engine — all protected.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">no admin keys on pools</h3>
            <p>once initialized, the owner cannot drain, pause, or change pool reserves. admin can only adjust: toll amount, fee rate (capped at 5%), equity rate, slope bounds, treasury address. owner <span className="text-red-400 font-semibold">cannot</span> withdraw liquidity, change slopes after launch, move user funds, or mint beyond cap.</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide mb-1">1:1 backing</h3>
            <p>every ERC-20 meme token in circulation is backed by exactly 1 unit of internal spoke balance in the liquidity engine. mint on buy, burn on sell. no fractional reserve.</p>
          </div>
        </div>
      </Section>

      <div className="mb-12 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

      {/* graduation */}
      <Section title="graduation">
        <p>
          when a meme&apos;s HEDGE reserve hits <Highlight>50,000 HEDGE</Highlight>, it &quot;graduates.&quot; graduated memes get featured in the Pro DEX section. this is purely UI — curve mechanics don&apos;t change, reserve stays locked.
        </p>
        <p>
          graduated memes are composable ERC-20 tokens. holders can pair them on external DEXes, use them in DeFi, or build communities around them. the bonding curve remains as permanent two-way liquidity regardless.
        </p>
      </Section>

      {/* sunset */}
      <Section title="sunset mechanism">
        <p>
          if a meme sits at minimum supply (50k tokens) for <Highlight>30 consecutive days</Highlight> with zero activity, it sunsets:
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-300">
          <li>50% of remaining HEDGE reserve &rarr; HEDGE/S hub pool</li>
          <li>50% &rarr; treasury</li>
          <li>spoke marked as sunset, no more trading</li>
        </ul>
        <p className="text-zinc-500 text-xs">
          prevents dead memes from locking liquidity. reserve gets recycled.
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
            <li>minter: HedgehogCore only</li>
          </ul>
        </div>
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
          <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-2">meme tokens (spokes)</h3>
          <ul className="space-y-1 text-zinc-300 text-sm">
            <li>real ERC-20 contracts deployed per launch (one contract per meme)</li>
            <li>each has name, symbol, metadata URI (IPFS)</li>
            <li>fully transferable: standard transfer(), approve(), transferFrom()</li>
            <li>supply is elastic — minted on buy, burned on sell, backed 1:1</li>
            <li>non-upgradeable once deployed</li>
            <li>feature config (referral, vesting) is immutable per token</li>
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
            { name: "ComboWrapper", addr: "0xc931DD1e5eD9B59568DF50372701374706Bdbc60" },
            { name: "SpokeWrapper", addr: "0x77223fed0c1e1148fA3FB3f315BDB519ff5107C1" },
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
          <p className="mt-3 text-red-400 font-bold text-sm">
            the protocol does not give yield. the protocol does not promise returns.
          </p>
          <p className="mt-2 text-zinc-300 text-sm">
            there is no revenue sharing, no staking rewards, no dividend mechanism, and no guaranteed appreciation. HEDGE is a routing asset for bonding curve mechanics — nothing more.
          </p>
          <p className="mt-2 text-zinc-300 text-sm">
            the referral feature is tooling provided to token launchers. referral rewards are paid in the <span className="text-white font-bold">launcher&apos;s meme token</span> — it is their token, not ours. the protocol does not pay anyone anything.
          </p>
          <p className="mt-3 text-zinc-300 text-sm">
            hedgehog protocol is a set of immutable smart contracts on Sonic. the contracts do what the code says. read the code. it&apos;s verified on SonicScan. the protocol is permissionless infrastructure. anyone can deploy. anyone can buy or sell. the protocol does not curate, endorse, or take responsibility for any token launched through it.
          </p>
          <p className="mt-3 text-zinc-300 text-sm font-semibold">
            be mindful of your jurisdiction. crypto regulation varies by country. referral mechanisms, token launches, and speculative trading may be regulated where you live. everything you do on this protocol is entirely at your own risk.
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
            { name: "ComboWrapper.sol", desc: "ERC-20 deployment + referral + vesting features", addr: "0xc931DD1e5eD9B59568DF50372701374706Bdbc60" },
            { name: "SpokeWrapper.sol", desc: "basic ERC-20 wrapper (no features)", addr: "0x77223fed0c1e1148fA3FB3f315BDB519ff5107C1" },
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
          built on sonic. not financial advice. read the contracts. participate at your own risk.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4">
          <Link href="/hub" className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            enter app &rarr;
          </Link>
          <a href="https://sonicscan.org/address/0x985A53B9b82eF766E69FD7DA49E4D53e1A13a27e" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
            sonicscan
          </a>
        </div>
      </div>
    </main>
  );
}
