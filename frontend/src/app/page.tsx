"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  CONTRACTS,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
} from "@/config/contracts";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function HubPage() {
  const { address } = useAccount();

  const hubReserveS = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubReserveS",
  }).data as bigint | undefined;

  const hubReserveHedge = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubReserveHedge",
  }).data as bigint | undefined;

  const hubPrice = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getHubPrice",
  }).data as bigint | undefined;

  const spokeCount = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  }).data as bigint | undefined;

  const totalSupply = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "totalSupply",
  }).data as bigint | undefined;

  const accumulatedFees = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "accumulatedFees",
  }).data as bigint | undefined;

  const hedgeBalance = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  }).data as bigint | undefined;

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "\u2014";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Hedgehog Hub
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          The $HEDGE / $S liquidity center. Every spoke launch and trade
          hardens the floor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Hub Price"
          value={`${fmt(hubPrice)} S`}
          sub="per HEDGE"
        />
        <StatCard
          label="Hub Liquidity (S)"
          value={`${fmt(hubReserveS)} S`}
        />
        <StatCard
          label="Hub Liquidity (HEDGE)"
          value={`${fmt(hubReserveHedge)} HEDGE`}
        />
        <StatCard
          label="Active Spokes"
          value={spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="HEDGE Total Supply"
          value={`${fmt(totalSupply)}`}
          sub="1B max"
        />
        <StatCard
          label="Pending POL Fees"
          value={`${fmt(accumulatedFees)} HEDGE`}
          sub="Waiting for crank"
        />
        <StatCard
          label="Your HEDGE Balance"
          value={address ? `${fmt(hedgeBalance)}` : "Connect wallet"}
        />
      </div>

      <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h2 className="text-xl font-bold text-white">How It Works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              1
            </div>
            <h3 className="font-semibold text-white">Launch</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Pay the toll in $S to create a new meme spoke. 50% buys HEDGE
              for treasury, 50% becomes permanent LP.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              2
            </div>
            <h3 className="font-semibold text-white">Trade</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Buy and sell meme tokens on bonding curves. 1% fee accumulates
              for POL engine LP burns.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400">
              3
            </div>
            <h3 className="font-semibold text-white">Floor Rises</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Every action locks HEDGE permanently. The price floor only goes
              up &mdash; it&apos;s a liquidity black hole.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
