"use client";

import Image from "next/image";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
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
  const { address, isConnected } = useAccount();
  const { writeContract, isPending: isCranking, isSuccess: crankSuccess } = useWriteContract();

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

  const usdcAddr = CONTRACTS.usdc;
  const hasUsdcPool = usdcAddr !== "0x0000000000000000000000000000000000000000";

  const usdcPool = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getERC20HubPool",
    args: hasUsdcPool ? [usdcAddr] : undefined,
  }).data as [bigint, bigint, bigint] | undefined;
  const usdcReserveQuote = usdcPool?.[0];
  const usdcReserveHedge = usdcPool?.[1];

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })
      : "\u2014";

  const fmtPricePerHedge = (price: bigint | undefined) => {
    if (price === undefined || price === BigInt(0)) return "\u2014";
    const hedgePerS = Number(formatEther(price));
    const sPerHedge = 1 / hedgePerS;
    if (sPerHedge < 0.0001) return sPerHedge.toExponential(2);
    return sPerHedge.toLocaleString(undefined, { maximumSignificantDigits: 4 });
  };

  const marketCap = hubPrice && hubPrice > BigInt(0) && totalSupply
    ? Number(formatEther((totalSupply * BigInt(1e18)) / hubPrice)).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "\u2014";

  const tvl = (() => {
    let total = 0;
    if (hubReserveS) total += Number(formatEther(hubReserveS));
    if (usdcReserveQuote !== undefined) {
      const usdcInS = Number(usdcReserveQuote) / 1e6 / 0.40;
      total += usdcInS;
    }
    return total > 0 ? total.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "\u2014";
  })();

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
          ape into $HEDGE. launch memes. trade on bonding curves.
          all liquidity is protocol-owned.
        </p>
        <div className="mx-auto mt-3 flex items-center justify-center gap-2">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-green-500" />
          <span className="text-xs font-bold uppercase tracking-widest text-green-500">live on sonic</span>
        </div>
      </div>

      {/* wallet balance bar */}
      {address && (
        <div className="mb-6 rounded-lg border border-violet-500/20 bg-violet-600/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">ur bag</p>
              <div className="mt-1 flex items-center gap-1.5">
                <HedgeIcon />
                <p className="text-xl font-black text-white">{fmt(hedgeBalance)}</p>
                <span className="text-sm text-zinc-500">HEDGE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="1 hedge ="
          value={`${fmtPricePerHedge(hubPrice)} S`}
          sub="protocol-owned AMM"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="market cap"
          value={`${marketCap} S`}
          sub="supply × price"
        />
        <StatCard
          label="TVL"
          value={`${tvl} S`}
          sub="total value locked"
        />
        <StatCard
          label="memes launched"
          value={spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
          sub="and counting"
        />
        <StatCard
          label="S pool"
          value={`${fmt(hubReserveS)} S`}
          sub="non-withdrawable"
        />
        {hasUsdcPool && (
          <StatCard
            label="USDC pool"
            value={
              usdcReserveQuote !== undefined
                ? `${(Number(usdcReserveQuote) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
                : "\u2014"
            }
            sub="non-withdrawable"
          />
        )}
        <StatCard
          label="total supply"
          value={`${fmt(totalSupply)}`}
          sub="5B max"
          icon={<HedgeIcon />}
        />
        <StatCard
          label="pending fees"
          value={`${fmt(accumulatedFees)}`}
          sub="waiting to get cranked"
          icon={<HedgeIcon />}
        />
      </div>

      {/* crank POL */}
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-white uppercase">crank the engine</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            deposits accumulated fees into both hub pools. anyone can call this.
          </p>
        </div>
        <button
          onClick={() => writeContract({
            address: CONTRACTS.hedgehogCore,
            abi: HEDGEHOG_CORE_ABI,
            functionName: "crankPOL",
          })}
          disabled={!isConnected || isCranking || (accumulatedFees !== undefined && accumulatedFees === BigInt(0))}
          className="shrink-0 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-bold uppercase text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 border border-green-500/30 transition-colors"
        >
          {isCranking ? "cranking..." : crankSuccess ? "cranked!" : "crank"}
        </button>
      </div>
      {accumulatedFees !== undefined && accumulatedFees === BigInt(0) && (
        <p className="mt-2 text-center text-xs text-zinc-600">no fees to crank rn. trade more.</p>
      )}

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
              half deposits into protocol-owned LP across both pools.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 font-black text-lg border border-violet-500/20">
              2
            </div>
            <h3 className="font-bold text-white">trade it</h3>
            <p className="mt-1 text-sm text-zinc-500">
              buy and sell memes on bonding curves backed by $HEDGE.
              1% fee accumulates for protocol-owned liquidity.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 font-black text-lg border border-violet-500/20">
              3
            </div>
            <h3 className="font-bold text-white">permanent liquidity</h3>
            <p className="mt-1 text-sm text-zinc-500">
              all hub pool liquidity is protocol-owned. no LP tokens,
              no withdrawals. fees get cranked back into the pools.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
