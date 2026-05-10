"use client";

import Image from "next/image";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { CONTRACTS, HEDGEHOG_CORE_ABI } from "@/config/contracts";

interface SpokeState {
  supply: bigint;
  hedgeReserve: bigint;
  slope: bigint;
  graduated: boolean;
  createdAtBlock: bigint;
  creator: `0x${string}`;
}

const GRADUATION_THRESHOLD = BigInt("50000000000000000000000"); // 50k HEDGE in wei

function fmt(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  return Number(formatEther(val)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function fmtCompact(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  const num = Number(formatEther(val));
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

function progressPercent(reserve: bigint): number {
  if (reserve >= GRADUATION_THRESHOLD) return 100;
  return Number((reserve * BigInt(100)) / GRADUATION_THRESHOLD);
}

function GraduatedCard({ spokeId }: { spokeId: number }) {
  const { data: rawState } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeState",
    args: [BigInt(spokeId)],
  });
  const state = rawState as SpokeState | undefined;

  const { data: rawPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpotPrice",
    args: [BigInt(spokeId)],
  });
  const price = rawPrice as bigint | undefined;

  const { data: rawInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [BigInt(spokeId)],
  });
  const info = rawInfo as
    | [string, string, string, bigint, bigint, bigint, boolean, `0x${string}`]
    | undefined;
  const name = info?.[0] || `meme #${spokeId}`;
  const symbol = info?.[1] || "???";

  if (!state?.graduated) return null;

  return (
    <Link href={`/trade?spoke=${spokeId}`}>
      <div className="group relative overflow-hidden rounded-xl border-2 border-green-500/30 bg-zinc-900/80 p-5 transition-all hover:border-green-400/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]">
        {/* graduated badge */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-green-600/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-green-400 border border-green-500/30">
            pro dex
          </span>
        </div>

        {/* header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600/20 text-lg font-black text-green-400 border border-green-500/20">
            #{spokeId}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-white">{name}</h3>
            <p className="text-xs font-bold uppercase text-green-400">${symbol}</p>
          </div>
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
            <p className="text-xs font-bold uppercase text-zinc-500">price</p>
            <div className="mt-1 flex items-center gap-1">
              <Image src="/hedge-48.png" alt="" width={14} height={14} className="rounded-full" />
              <p className="text-sm font-bold text-white">{fmt(price)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
            <p className="text-xs font-bold uppercase text-zinc-500">supply</p>
            <p className="mt-1 text-sm font-bold text-white">{fmtCompact(state?.supply)}</p>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
            <p className="text-xs font-bold uppercase text-zinc-500">reserve</p>
            <div className="mt-1 flex items-center gap-1">
              <Image src="/hedge-48.png" alt="" width={14} height={14} className="rounded-full" />
              <p className="text-sm font-bold text-green-400">{fmtCompact(state?.hedgeReserve)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
            <p className="text-xs font-bold uppercase text-zinc-500">creator</p>
            <p className="mt-1 text-sm font-bold text-white">
              {state ? `${state.creator.slice(0, 6)}...${state.creator.slice(-4)}` : "\u2014"}
            </p>
          </div>
        </div>

        {/* trade cta */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-600">50k+ HEDGE in protocol LP</p>
          <span className="text-xs font-bold uppercase text-green-400 group-hover:text-green-300 transition-colors">
            trade &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

function RisingCard({ spokeId }: { spokeId: number }) {
  const { data: rawState } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeState",
    args: [BigInt(spokeId)],
  });
  const state = rawState as SpokeState | undefined;

  const { data: rawPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpotPrice",
    args: [BigInt(spokeId)],
  });
  const price = rawPrice as bigint | undefined;

  const { data: rawInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [BigInt(spokeId)],
  });
  const info = rawInfo as
    | [string, string, string, bigint, bigint, bigint, boolean, `0x${string}`]
    | undefined;
  const name = info?.[0] || `meme #${spokeId}`;
  const symbol = info?.[1] || "???";

  if (!state || state.graduated) return null;

  const pct = progressPercent(state.hedgeReserve);
  const hedgeNeeded = GRADUATION_THRESHOLD - state.hedgeReserve;

  return (
    <Link href={`/trade?spoke=${spokeId}`}>
      <div className="degen-card group cursor-pointer">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">
              #{spokeId}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{name}</h3>
              <p className="text-xs font-bold uppercase text-zinc-500">${symbol}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Image src="/hedge-48.png" alt="" width={12} height={12} className="rounded-full" />
              <p className="text-xs font-bold text-white">{fmt(price)}</p>
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-zinc-500">
              {fmtCompact(state.hedgeReserve)} / 50K HEDGE
            </span>
            <span className={`font-black ${pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-zinc-500"}`}>
              {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 border border-zinc-700/50 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pct >= 75
                  ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                  : pct >= 50
                    ? "bg-yellow-500"
                    : "bg-violet-500"
              }`}
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-zinc-600">
          {hedgeNeeded > BigInt(0)
            ? `${fmtCompact(hedgeNeeded)} HEDGE to graduate`
            : "graduating..."}
        </p>
      </div>
    </Link>
  );
}

export default function GraduatePage() {
  const { data: spokeCount, isLoading } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });

  const count = spokeCount ? Number(spokeCount) : 0;
  const spokeIds = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      {/* hero */}
      <div className="mb-8 sm:mb-10">
        <h1 className="glow-text text-3xl font-black uppercase text-white sm:text-5xl">
          pro <span className="text-green-400">dex</span>
        </h1>
        <p className="mt-2 text-zinc-500">
          memes that hit 50k HEDGE in reserves graduate to the big leagues.
          these tokens proved they have diamond hands behind them.
        </p>
      </div>

      {/* graduated section */}
      <div className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green-500" />
          <h2 className="text-lg font-black uppercase text-white">
            graduated
          </h2>
          <span className="text-xs font-bold text-zinc-600 uppercase">50k+ hedge locked</span>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border-2 border-zinc-700 bg-zinc-900/80 p-5">
                <div className="h-5 w-24 rounded bg-zinc-700" />
                <div className="mt-3 h-6 w-40 rounded bg-zinc-700" />
                <div className="mt-4 grid grid-cols-4 gap-3">
                  <div className="h-14 rounded bg-zinc-700" />
                  <div className="h-14 rounded bg-zinc-700" />
                  <div className="h-14 rounded bg-zinc-700" />
                  <div className="h-14 rounded bg-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <div className="degen-empty flex flex-col items-center justify-center py-16">
            <p className="text-lg font-bold text-zinc-500">no graduates yet</p>
            <p className="mt-1 text-sm text-zinc-600">
              first meme to hit 50k HEDGE gets the crown
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {spokeIds.map((id) => (
              <GraduatedCard key={id} spokeId={id} />
            ))}
          </div>
        )}
      </div>

      {/* rising section — memes approaching graduation */}
      {count > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-block text-lg">&#x1f4c8;</span>
            <h2 className="text-lg font-black uppercase text-white">
              rising
            </h2>
            <span className="text-xs font-bold text-zinc-600 uppercase">on the way up</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {spokeIds.map((id) => (
              <RisingCard key={id} spokeId={id} />
            ))}
          </div>
        </div>
      )}

      {/* explainer */}
      <div className="mt-12 rounded-xl border-2 border-zinc-700 bg-zinc-900/60 p-6">
        <h3 className="text-sm font-black uppercase text-white mb-3">how graduation works</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400">1</span>
            <p className="mt-2 text-sm text-zinc-400">
              a meme accumulates HEDGE in its reserve through buys on the bonding curve
            </p>
          </div>
          <div>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-yellow-600/30 text-xs font-black text-yellow-400">2</span>
            <p className="mt-2 text-sm text-zinc-400">
              when the reserve hits 50,000 HEDGE, the meme graduates automatically. no votes, no governance. pure market signal.
            </p>
          </div>
          <div>
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-green-600/30 text-xs font-black text-green-400">3</span>
            <p className="mt-2 text-sm text-zinc-400">
              graduated memes join the pro dex — proof that the community put their HEDGE where their mouth is
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
