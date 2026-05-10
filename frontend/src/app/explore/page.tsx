"use client";

import Image from "next/image";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { CONTRACTS, HEDGEHOG_CORE_ABI } from "@/config/contracts";

interface SpokeState {
  supply: bigint;
  hedgeReserve: bigint;
  slope: bigint;
  graduated: boolean;
  sunset: boolean;
  createdAtBlock: bigint;
  lastSupplyChangeBlock: bigint;
  creator: `0x${string}`;
}

function MemeCard({ spokeId }: { spokeId: number }) {
  const { data: rawState, isLoading } = useReadContract({
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

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })
      : "\u2014";

  if (isLoading) {
    return (
      <div className="animate-pulse degen-card">
        <div className="h-4 w-20 rounded bg-zinc-700" />
        <div className="mt-3 h-5 w-32 rounded bg-zinc-700" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-8 rounded bg-zinc-700" />
          <div className="h-8 rounded bg-zinc-700" />
          <div className="h-8 rounded bg-zinc-700" />
        </div>
      </div>
    );
  }

  return (
    <Link href={`/trade?spoke=${spokeId}`}>
      <div className="degen-card group cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600/30 text-sm font-black text-violet-400 border border-violet-500/20">
              #{spokeId}
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-zinc-600">meme #{spokeId}</span>
              <h3 className="text-sm font-bold text-white">
                {state ? `${state.creator.slice(0, 6)}...${state.creator.slice(-4)}` : "\u2014"}
              </h3>
            </div>
          </div>
          <div className="flex gap-2">
            {state?.sunset && (
              <span className="rounded-full bg-zinc-600/30 px-2.5 py-1 text-xs font-bold uppercase text-zinc-500 border border-zinc-600/30">
                rip
              </span>
            )}
            {state?.graduated && !state?.sunset && (
              <span className="rounded-full bg-green-600/30 px-2.5 py-1 text-xs font-bold uppercase text-green-400 border border-green-500/30">
                graduated
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-zinc-600">price</p>
            <div className="flex items-center gap-1">
              <Image src="/hedge-48.png" alt="" width={14} height={14} className="rounded-full" />
              <p className="text-sm font-bold text-white">{fmt(price)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-zinc-600">supply</p>
            <p className="text-sm font-bold text-white">
              {state ? fmt(state.supply) : "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-zinc-600">reserve</p>
            <div className="flex items-center gap-1">
              <Image src="/hedge-48.png" alt="" width={14} height={14} className="rounded-full" />
              <p className="text-sm font-bold text-white">
                {state ? fmt(state.hedgeReserve) : "\u2014"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const { data: spokeCount, isLoading } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });

  const count = spokeCount ? Number(spokeCount) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="glow-text text-2xl font-black uppercase text-white sm:text-3xl">
            explore memes
          </h1>
          <p className="mt-1 text-zinc-500">
            {isLoading
              ? "loading..."
              : count > 0
                ? `${count} meme${count > 1 ? "s" : ""} live rn`
                : "no memes yet. be first anon"}
          </p>
        </div>
        <Link
          href="/launch"
          className="w-fit rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold uppercase text-white hover:bg-violet-700 border border-violet-500/30"
        >
          launch a meme
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse degen-card">
              <div className="h-4 w-20 rounded bg-zinc-700" />
              <div className="mt-3 h-5 w-32 rounded bg-zinc-700" />
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-8 rounded bg-zinc-700" />
                <div className="h-8 rounded bg-zinc-700" />
                <div className="h-8 rounded bg-zinc-700" />
              </div>
            </div>
          ))}
        </div>
      ) : count === 0 ? (
        <div className="degen-empty flex flex-col items-center justify-center py-20">
          <p className="text-lg font-bold text-zinc-500">nothing here yet ser</p>
          <p className="mt-1 text-sm text-zinc-600">
            be the first degen to launch a meme
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }, (_, i) => (
            <MemeCard key={i} spokeId={i} />
          ))}
        </div>
      )}
    </div>
  );
}
