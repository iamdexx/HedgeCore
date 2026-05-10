"use client";

import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import {
  CONTRACTS,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
  USDC_ADDRESS,
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
    <div className="degen-card">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <p className="text-xl font-black text-white sm:text-2xl">{value}</p>
      </div>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
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
      <div className="mb-10 text-center sm:mb-14">
        <div className="mx-auto mb-4 flex items-center justify-center gap-3">
          <Image
            src="/hedge-token.png"
            alt="HEDGE Token"
            width={72}
            height={72}
            className="rounded-full"
          />
        </div>
        <h1 className="glow-text text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          the pump is <span className="text-violet-400">live</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-zinc-500 sm:text-lg">
          ape into $HEDGE. launch memes. every trade hardens the floor.
          the only way is up anon.
        </p>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-500">live on sonic</span>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="$hedge price"
          value={`${fmt(hubPrice)} S`}
          sub="floor only goes up"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="liquidity (S)"
          value={`${fmt(hubReserveS)} S`}
          sub="locked forever"
        />
        <StatCard
          label="liquidity (hedge)"
          value={`${fmt(hubReserveHedge)}`}
          sub="burned LP"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="memes launched"
          value={spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
          sub="and counting"
        />
      </div>

      <div className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-3 sm:mt-8 sm:gap-4">
        <StatCard
          label="total supply"
          value={`${fmt(totalSupply)}`}
          sub="5B max, deflationary"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="pending fees"
          value={`${fmt(accumulatedFees)}`}
          sub="waiting to get cranked"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="ur bag"
          value={address ? `${fmt(hedgeBalance)}` : "connect wallet ser"}
          icon={address ? <HedgeIcon /> : undefined}
        />
      </div>

      <div className="degen-card mt-10 sm:mt-14 !p-6 sm:!p-8">
        <h2 className="text-xl font-black uppercase tracking-wide text-white">how this works</h2>
        <p className="mt-1 text-sm text-zinc-600">its not complicated anon</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 font-black text-lg border border-violet-500/20">
              1
            </div>
            <h3 className="font-bold text-white">launch a meme</h3>
            <p className="mt-1 text-sm text-zinc-500">
              pay the toll in $S. half buys HEDGE for treasury,
              half becomes permanent LP. floor goes up.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 font-black text-lg border border-violet-500/20">
              2
            </div>
            <h3 className="font-bold text-white">trade it</h3>
            <p className="mt-1 text-sm text-zinc-500">
              buy and sell memes on bonding curves backed by $HEDGE.
              1% fee feeds the engine. number go up technology.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 font-black text-lg border border-violet-500/20">
              3
            </div>
            <h3 className="font-bold text-white">floor rises</h3>
            <p className="mt-1 text-sm text-zinc-500">
              every action locks HEDGE permanently. the price floor
              only goes up. its a liquidity black hole ser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
