"use client";

import Image from "next/image";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  CONTRACTS,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
} from "@/config/contracts";

function fmt(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  return Number(formatEther(val)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function fmtPricePerHedge(hubPrice: bigint | undefined) {
  if (hubPrice === undefined || hubPrice === BigInt(0)) return "\u2014";
  const hedgePerS = Number(formatEther(hubPrice));
  const sPerHedge = 1 / hedgePerS;
  if (sPerHedge < 0.0001) return sPerHedge.toExponential(2);
  return sPerHedge.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function fmtCompact(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  const num = Number(formatEther(val));
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toFixed(2);
}

export default function LandingPage() {
  const hubPrice = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getHubPrice",
  }).data as bigint | undefined;

  const totalSupply = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "totalSupply",
  }).data as bigint | undefined;

  const hubReserveS = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubReserveS",
  }).data as bigint | undefined;

  const usdcAddr = CONTRACTS.usdc;
  const hasUsdcPool = usdcAddr !== "0x0000000000000000000000000000000000000000";

  const usdcPool = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getERC20HubPool",
    args: hasUsdcPool ? [usdcAddr] : undefined,
  }).data as [bigint, bigint, bigint] | undefined;
  const usdcReserve = usdcPool?.[0];

  const spokeCount = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  }).data as bigint | undefined;

  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 h-[300px] w-[300px] rounded-full bg-green-500/5 blur-[100px]" />
        </div>

        <div className="text-center">
          <div className="mx-auto mb-6 flex items-center justify-center">
            <Image
              src="/hedge-token.png"
              alt="HEDGE"
              width={96}
              height={96}
              className="rounded-full"
            />
          </div>
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-green-500">
              live on sonic mainnet
            </span>
          </div>
          <h1 className="glow-text text-5xl font-black uppercase tracking-tight text-white sm:text-7xl lg:text-8xl">
            sonic<span className="text-violet-400">pump</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 sm:text-xl">
            the meme launchpad built on bonding curves.
            launch tokens backed by{" "}
            <span className="font-bold text-violet-400">$HEDGE</span> on Sonic.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/hub"
              className="rounded-xl bg-violet-600 px-8 py-4 text-lg font-black uppercase tracking-wide text-white transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25"
            >
              enter app
            </Link>
            <Link
              href="/launch"
              className="rounded-xl border-2 border-zinc-600 bg-zinc-900/50 px-8 py-4 text-lg font-black uppercase tracking-wide text-zinc-300 transition-all hover:border-violet-500/50 hover:text-white"
            >
              launch a meme
            </Link>
          </div>
        </div>
      </section>

      {/* Live Stats Ticker */}
      <section className="border-y-2 border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 overflow-x-auto px-4 py-5 sm:gap-12">
          <div className="shrink-0 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              1 HEDGE
            </p>
            <p className="mt-1 text-lg font-black text-violet-400 sm:text-xl">
              {fmtPricePerHedge(hubPrice)} S
            </p>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              S pool
            </p>
            <p className="mt-1 text-lg font-black text-green-400 sm:text-xl">
              {fmt(hubReserveS)} S
            </p>
          </div>
          {hasUsdcPool && (
            <div className="shrink-0 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                USDC pool
              </p>
              <p className="mt-1 text-lg font-black text-green-400 sm:text-xl">
                {usdcReserve !== undefined
                  ? `${(Number(usdcReserve) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
                  : "\u2014"}
              </p>
            </div>
          )}
          <div className="shrink-0 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              total supply
            </p>
            <p className="mt-1 text-lg font-black text-white sm:text-xl">
              {fmtCompact(totalSupply)}
            </p>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
              memes launched
            </p>
            <p className="mt-1 text-lg font-black text-white sm:text-xl">
              {spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          how it <span className="text-violet-400">works</span>
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-500">
          three steps. no VC. no pre-sale. just pure on-chain meme economics.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-violet-500/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600/20 text-xl font-black text-violet-400 border border-violet-500/20">
              1
            </div>
            <h3 className="text-lg font-black uppercase text-white">
              launch a meme
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              pay the toll in $S. half buys $HEDGE for the treasury, half
              gets deposited into protocol-owned liquidity. your meme token
              goes live instantly.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-green-500/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600/20 text-xl font-black text-green-400 border border-green-500/20">
              2
            </div>
            <h3 className="text-lg font-black uppercase text-white">
              trade it
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              every meme trades on its own bonding curve backed by $HEDGE. 1%
              fee on every trade accumulates and gets cranked into permanent
              protocol-owned liquidity.
            </p>
          </div>
          <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:border-amber-500/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/20 text-xl font-black text-amber-400 border border-amber-500/20">
              3
            </div>
            <h3 className="text-lg font-black uppercase text-white">
              permanent liquidity
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              all hub pool liquidity is protocol-owned. no LP tokens are minted,
              so no one can withdraw it. fees accumulate and get deposited back
              into the pools via the permissionless crank.
            </p>
          </div>
        </div>
      </section>

      {/* Hub & Spoke Architecture */}
      <section className="border-y-2 border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            hub & <span className="text-green-400">spoke</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-zinc-500">
            $HEDGE is the center of everything. every meme pairs against it.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-950/50 p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  the hub
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                $HEDGE is the reserve asset. it pairs against $S (native Sonic)
                and USDC (stablecoin) in two protocol-owned pools. no external
                LPs. liquidity is protocol-owned and non-withdrawable.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs font-bold uppercase text-zinc-600">
                    HEDGE/S
                  </p>
                  <p className="mt-1 text-sm font-black text-green-400">
                    {fmt(hubReserveS)} S
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                  <p className="text-xs font-bold uppercase text-zinc-600">
                    HEDGE/USDC
                  </p>
                  <p className="mt-1 text-sm font-black text-green-400">
                    {usdcReserve !== undefined
                      ? `${(Number(usdcReserve) / 1e6).toFixed(2)} USDC`
                      : "\u2014"}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-zinc-800 bg-zinc-950/50 p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                  the spokes
                </h3>
              </div>
              <p className="text-sm text-zinc-500">
                every meme token lives on its own bonding curve priced in
                $HEDGE. buy memes with S or USDC through the router &mdash; it
                swaps to HEDGE under the hood. each spoke is an independent
                market, but they all feed back into the hub.
              </p>
              <div className="mt-4 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
                <p className="text-xs font-bold uppercase text-zinc-600">
                  memes live
                </p>
                <p className="mt-1 text-sm font-black text-violet-400">
                  {spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protocol Features */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          protocol <span className="text-amber-400">features</span>
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-violet-400">
              protocol-owned liquidity
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              no LP tokens. no withdrawals. all hub pool liquidity is permanent
              and grows with every fee deposit. protocol-owned, non-custodial.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-green-400">
              dual hub pools
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              HEDGE/S and HEDGE/USDC. two entry points, one hub token. POL
              fees split 50/50 between both pools.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-amber-400">
              bonding curves
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              every meme trades on a quadratic bonding curve. price goes up
              with supply, down when supply shrinks. no order books. pure math.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-violet-400">
              permissionless crank
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              anyone can call crankPOL() to deposit accumulated fees into
              permanent hub LP. no keepers needed. no admin gas costs.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-green-400">
              geometric equity
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              each launch mints 0.01% of remaining supply to treasury.
              geometric decay means it never runs out. 5B max supply.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
            <h3 className="text-sm font-black uppercase text-amber-400">
              fully on-chain
            </h3>
            <p className="mt-2 text-xs text-zinc-500">
              no backend. no database. no API keys. everything reads directly
              from Sonic mainnet contracts. verified on SonicScan.
            </p>
          </div>
        </div>
      </section>

      {/* Contract Addresses */}
      <section className="border-t-2 border-zinc-800 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <h2 className="text-center text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            contracts
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-xs text-zinc-600">
            all verified on SonicScan. immutable. no admin keys needed.
          </p>
          <div className="mt-8 space-y-3 max-w-2xl mx-auto">
            {[
              {
                label: "Hedgehog (HEDGE)",
                addr: CONTRACTS.hedgeToken,
              },
              {
                label: "HedgehogCore",
                addr: CONTRACTS.hedgehogCore,
              },
              {
                label: "HedgehogRouter",
                addr: CONTRACTS.hedgehogRouter,
              },
            ].map((c) => (
              <a
                key={c.label}
                href={`https://sonicscan.org/address/${c.addr}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition-all hover:border-violet-500/30 group"
              >
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white">
                  {c.label}
                </span>
                <span className="font-mono text-xs text-zinc-600 group-hover:text-violet-400 truncate ml-4">
                  {c.addr}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-24 text-center">
        <h2 className="glow-text text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          ready to <span className="text-violet-400">start</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-zinc-500">
          connect your wallet and swap. or launch your own meme
          on a bonding curve.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/hub"
            className="rounded-xl bg-violet-600 px-8 py-4 text-lg font-black uppercase tracking-wide text-white transition-all hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25"
          >
            enter app
          </Link>
          <Link
            href="/analytics"
            className="rounded-xl border-2 border-zinc-600 bg-zinc-900/50 px-8 py-4 text-lg font-black uppercase tracking-wide text-zinc-300 transition-all hover:border-violet-500/50 hover:text-white"
          >
            view protocol
          </Link>
        </div>
        <div className="mt-12 flex items-center justify-center gap-6">
          <a
            href="https://x.com/sonicpumpmeme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-violet-400 transition-colors"
          >
            X / Twitter
          </a>
          <span className="text-zinc-800">|</span>
          <a
            href="https://t.me/sonicpumpmeme"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-violet-400 transition-colors"
          >
            Telegram
          </a>
          <span className="text-zinc-800">|</span>
          <a
            href="https://sonicscan.org/address/0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-violet-400 transition-colors"
          >
            SonicScan
          </a>
          <span className="text-zinc-800">|</span>
          <Link
            href="/whitepaper"
            className="text-xs font-bold uppercase tracking-wider text-zinc-600 hover:text-violet-400 transition-colors"
          >
            Whitepaper
          </Link>
        </div>
      </section>
    </div>
  );
}
