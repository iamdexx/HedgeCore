"use client";

import Image from "next/image";
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
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
      <p className="text-sm text-zinc-400">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
      </div>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function HedgeIcon({ size = 20 }: { size?: number }) {
  return (
    <Image
      src="/hedge-48.png"
      alt="HEDGE"
      width={size}
      height={size}
      className="rounded-full"
    />
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <div className="mb-10 text-center sm:mb-12">
        <div className="mx-auto mb-4 flex items-center justify-center gap-3">
          <Image
            src="/hedge-token.png"
            alt="HEDGE Token"
            width={64}
            height={64}
            className="rounded-full"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Sonic<span className="text-violet-400">Pump</span> Hub
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-zinc-400 sm:mt-4 sm:text-lg">
          The $HEDGE / $S liquidity center. Every spoke launch and trade
          hardens the floor.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="Hub Price"
          value={`${fmt(hubPrice)} S`}
          sub="per HEDGE"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="Hub Liquidity (S)"
          value={`${fmt(hubReserveS)} S`}
        />
        <StatCard
          label="Hub Liquidity"
          value={`${fmt(hubReserveHedge)}`}
          icon={<HedgeIcon />}
        />
        <StatCard
          label="Active Spokes"
          value={spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
        />
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-3 sm:mt-8 sm:gap-4">
        <StatCard
          label="HEDGE Total Supply"
          value={`${fmt(totalSupply)}`}
          sub="1B max"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="Pending POL Fees"
          value={`${fmt(accumulatedFees)}`}
          sub="Waiting for crank"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="Your HEDGE Balance"
          value={address ? `${fmt(hedgeBalance)}` : "Connect wallet"}
          icon={address ? <HedgeIcon /> : undefined}
        />
      </div>

      <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:mt-12 sm:p-8">
        <h2 className="text-xl font-bold text-white">How It Works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 font-bold">
              1
            </div>
            <h3 className="font-semibold text-white">Launch</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Pay the toll in $S to create a new meme spoke. 50% buys HEDGE
              for treasury, 50% becomes permanent LP.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 font-bold">
              2
            </div>
            <h3 className="font-semibold text-white">Trade</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Buy and sell meme tokens on bonding curves. 1% fee accumulates
              for POL engine LP burns.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/20 text-violet-400 font-bold">
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
