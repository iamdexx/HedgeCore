"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import Link from "next/link";
import { CONTRACTS, HEDGEHOG_CORE_ABI } from "@/config/contracts";

interface SpokeState {
  supply: bigint;
  hedgeReserve: bigint;
  slope: bigint;
  graduated: boolean;
  createdAtBlock: bigint;
  creator: `0x${string}`;
}

function SpokeCard({ spokeId }: { spokeId: number }) {
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

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })
      : "—";

  return (
    <Link href={`/trade?spoke=${spokeId}`}>
      <div className="group rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-colors hover:border-violet-600/50 hover:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs text-zinc-500">Spoke #{spokeId}</span>
            <h3 className="text-lg font-semibold text-white">
              {state ? `Creator: ${state.creator.slice(0, 6)}...` : "Loading..."}
            </h3>
          </div>
          {state?.graduated && (
            <span className="rounded-full bg-green-600/20 px-2.5 py-1 text-xs font-medium text-green-400">
              Graduated
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <p className="text-xs text-zinc-500">Price</p>
            <p className="text-sm font-medium text-white">
              {fmt(price)} HEDGE
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Supply</p>
            <p className="text-sm font-medium text-white">
              {state ? fmt(state.supply) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Reserve</p>
            <p className="text-sm font-medium text-white">
              {state ? fmt(state.hedgeReserve) : "—"} HEDGE
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const { data: spokeCount } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });

  const count = spokeCount ? Number(spokeCount) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Explore Spokes</h1>
          <p className="mt-1 text-zinc-400">
            {count > 0
              ? `${count} meme token${count > 1 ? "s" : ""} launched`
              : "No spokes launched yet"}
          </p>
        </div>
        <Link
          href="/launch"
          className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Launch New Spoke
        </Link>
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-20">
          <p className="text-lg text-zinc-500">No spokes yet.</p>
          <p className="mt-1 text-sm text-zinc-600">
            Be the first to launch a meme token.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }, (_, i) => (
            <SpokeCard key={i} spokeId={i} />
          ))}
        </div>
      )}
    </div>
  );
}
