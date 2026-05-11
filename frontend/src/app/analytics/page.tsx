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

const MAX_SUPPLY = BigInt("5000000000000000000000000000"); // 5B HEDGE in wei

function fmtPricePerHedge(hubPrice: bigint | undefined) {
  if (hubPrice === undefined || hubPrice === BigInt(0)) return "\u2014";
  const hedgePerS = Number(formatEther(hubPrice));
  const sPerHedge = 1 / hedgePerS;
  if (sPerHedge < 0.0001) return sPerHedge.toExponential(2);
  return sPerHedge.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

function fmt(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  return Number(formatEther(val)).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function fmtCompact(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  const num = Number(formatEther(val));
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(2);
}

function fmtK(val: bigint | undefined) {
  if (val === undefined) return "\u2014";
  const num = Number(formatEther(val));
  const k = num / 1e18; // K is product of two WAD values
  if (k >= 1_000_000) return `${(k / 1_000_000).toFixed(2)}M`;
  if (k >= 1_000) return `${(k / 1_000).toFixed(1)}K`;
  return k.toFixed(2);
}

function HedgeIcon({ size = 14 }: { size?: number }) {
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

function StatBox({
  label,
  value,
  sub,
  icon,
  color = "white",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
}) {
  const colorClass =
    color === "green"
      ? "text-green-400"
      : color === "violet"
        ? "text-violet-400"
        : color === "amber"
          ? "text-amber-400"
          : "text-white";
  return (
    <div className="rounded-lg bg-zinc-800/50 p-4 border border-zinc-700/50">
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {icon}
        <p className={`text-lg font-black ${colorClass}`}>{value}</p>
      </div>
      {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
    </div>
  );
}

function SpokeRow({
  spokeId,
  rank,
}: {
  spokeId: number;
  rank: number;
}) {
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

  if (!state) return null;

  return (
    <Link href={`/trade?spoke=${spokeId}`}>
      <div className="group flex items-center gap-4 rounded-lg border border-zinc-800/50 bg-zinc-900/50 p-3 transition-all hover:border-zinc-600/50 hover:bg-zinc-800/30">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-black text-zinc-400">
          #{rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black uppercase text-white truncate">
              {name}
            </span>
            <span className="text-xs font-bold text-zinc-500">${symbol}</span>
            {state.graduated && (
              <span className="rounded-full bg-green-600/20 px-2 py-0.5 text-[10px] font-black uppercase text-green-400 border border-green-500/30">
                graduated
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <HedgeIcon size={10} />
              {fmt(price)}
            </span>
            <span>supply: {fmtCompact(state.supply)}</span>
            <span>
              {state.creator.slice(0, 6)}...{state.creator.slice(-4)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-violet-400">
            {fmtCompact(state.hedgeReserve)}
          </p>
          <p className="text-[10px] font-bold uppercase text-zinc-600">
            hedge locked
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function AnalyticsPage() {
  // --- Protocol-level reads ---
  const { data: rawHubPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getHubPrice",
  });
  const hubPrice = rawHubPrice as bigint | undefined;

  const { data: rawTotalSupply } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "totalSupply",
  });
  const totalSupply = rawTotalSupply as bigint | undefined;

  const { data: rawReserveS } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubReserveS",
  });
  const hubReserveS = rawReserveS as bigint | undefined;

  const { data: rawReserveHedge } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubReserveHedge",
  });
  const hubReserveHedge = rawReserveHedge as bigint | undefined;

  const { data: rawK } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "hubK",
  });
  const hubK = rawK as bigint | undefined;

  const { data: rawTwap } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getTWAP",
  });
  const twap = rawTwap as bigint | undefined;

  const { data: rawSpokeCount } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });
  const spokeCount = rawSpokeCount as bigint | undefined;

  const { data: rawFees } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "accumulatedFees",
  });
  const accumulatedFees = rawFees as bigint | undefined;

  const { data: rawFeeBps } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "feeBps",
  });
  const feeBps = rawFeeBps as bigint | undefined;

  const { data: rawToll } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "toll",
  });
  const toll = rawToll as bigint | undefined;

  const { data: rawEquityRate } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "equityRateBps",
  });
  const equityRate = rawEquityRate as bigint | undefined;

  const { data: rawTreasury } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "treasury",
  });
  const treasuryAddr = rawTreasury as `0x${string}` | undefined;

  const { data: rawTreasuryBal } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "balanceOf",
    args: treasuryAddr ? [treasuryAddr] : undefined,
  });
  const treasuryBalance = rawTreasuryBal as bigint | undefined;

  // --- USDC Hub Pool reads ---
  const usdcAddr = CONTRACTS.usdc;
  const hasUsdcPool = usdcAddr !== "0x0000000000000000000000000000000000000000";

  const { data: rawUsdcPool } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getERC20HubPool",
    args: hasUsdcPool ? [usdcAddr] : undefined,
  });
  const usdcPool = rawUsdcPool as [bigint, bigint, bigint] | undefined;
  const usdcReserveQuote = usdcPool?.[0];
  const usdcReserveHedge = usdcPool?.[1];
  const usdcK = usdcPool?.[2];

  const { data: rawUsdcPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getERC20HubPrice",
    args: hasUsdcPool ? [usdcAddr] : undefined,
  });
  const usdcHubPrice = rawUsdcPrice as bigint | undefined;

  // --- Derived metrics ---
  const supplyMinted = totalSupply ?? BigInt(0);
  const supplyRemaining = MAX_SUPPLY - supplyMinted;
  const mintedPercent =
    totalSupply !== undefined
      ? ((Number(totalSupply) / Number(MAX_SUPPLY)) * 100).toFixed(2)
      : "\u2014";

  // Aggregate spoke data — read all spoke states
  const count = spokeCount !== undefined ? Number(spokeCount) : 0;
  const spokeIds = Array.from({ length: count }, (_, i) => i);

  // TWAP vs spot deviation
  const twapDeviation =
    hubPrice !== undefined && twap !== undefined && twap > BigInt(0)
      ? (
          ((Number(hubPrice) - Number(twap)) / Number(twap)) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <h1 className="glow-text text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
          PROTO<span className="text-violet-400">COL</span>
        </h1>
        <p className="mt-2 text-base text-zinc-500">
          real-time on-chain metrics. no backend. no api. just the chain anon.
        </p>
      </div>

      {/* Section: HEDGE Token */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            $hedge
          </h2>
          <span className="text-xs font-bold uppercase text-zinc-600">
            token metrics
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatBox
            label="1 HEDGE"
            value={`${fmtPricePerHedge(hubPrice)} S`}
            sub="protocol-owned AMM"
            icon={<HedgeIcon size={16} />}
            color="violet"
          />
          <StatBox
            label="market cap"
            value={
              hubPrice !== undefined && hubPrice > BigInt(0) && totalSupply !== undefined
                ? `${fmtCompact(
                    (totalSupply * BigInt(1e18)) / hubPrice
                  )} S`
                : "\u2014"
            }
            sub="supply × price per HEDGE"
          />
          <StatBox
            label="total supply"
            value={fmtCompact(totalSupply)}
            sub={`${mintedPercent}% of 5B minted`}
            icon={<HedgeIcon size={16} />}
          />
          <StatBox
            label="unminted"
            value={fmtCompact(supplyRemaining)}
            sub="remaining to mint"
            color="green"
          />
        </div>
      </div>

      {/* Section: Hub Pool */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            hub pool
          </h2>
          <span className="text-xs font-bold uppercase text-zinc-600">
            hedge / S amm
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatBox
            label="S reserves"
            value={`${fmt(hubReserveS)} S`}
            sub="non-withdrawable"
            color="green"
          />
          <StatBox
            label="hedge reserves"
            value={fmtCompact(hubReserveHedge)}
            sub="permanent liquidity"
            icon={<HedgeIcon size={16} />}
          />
          <StatBox
            label="pool K invariant"
            value={fmtK(hubK)}
            sub="constant product"
            color="green"
          />
          <StatBox
            label="twap vs spot"
            value={
              twapDeviation !== null
                ? `${Number(twapDeviation) >= 0 ? "+" : ""}${twapDeviation}%`
                : "\u2014"
            }
            sub={twap !== undefined ? `twap: ${fmt(twap)} S` : "oracle"}
            color={
              twapDeviation !== null && Math.abs(Number(twapDeviation)) > 10
                ? "amber"
                : "green"
            }
          />
        </div>
      </div>

      {/* Section: USDC Hub Pool */}
      {hasUsdcPool && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">
              usdc pool
            </h2>
            <span className="text-xs font-bold uppercase text-zinc-600">
              hedge / usdc amm
            </span>
          </div>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatBox
              label="USDC reserves"
              value={
                usdcReserveQuote !== undefined
                  ? `${(Number(usdcReserveQuote) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
                  : "\u2014"
              }
              sub="non-withdrawable"
              color="green"
            />
            <StatBox
              label="hedge reserves"
              value={fmtCompact(usdcReserveHedge)}
              sub="permanent liquidity"
              icon={<HedgeIcon size={16} />}
            />
            <StatBox
              label="HEDGE price (USDC)"
              value={
                usdcHubPrice !== undefined
                  ? `${(Number(usdcHubPrice) / 1e36).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDC`
                  : "\u2014"
              }
              sub="per HEDGE via USDC pool"
              color="violet"
            />
            <StatBox
              label="pool K invariant"
              value={
                usdcK !== undefined
                  ? (() => {
                      const k = Number(usdcK) / 1e24;
                      if (k >= 1_000_000) return `${(k / 1_000_000).toFixed(2)}M`;
                      if (k >= 1_000) return `${(k / 1_000).toFixed(1)}K`;
                      return k.toFixed(2);
                    })()
                  : "\u2014"
              }
              sub="constant product"
              color="green"
            />
          </div>
        </div>
      )}

      {/* Section: Treasury */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            treasury
          </h2>
          <span className="text-xs font-bold uppercase text-zinc-600">
            protocol revenue
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          <StatBox
            label="hedge balance"
            value={fmtCompact(treasuryBalance)}
            sub="from tolls + equity"
            icon={<HedgeIcon size={16} />}
            color="amber"
          />
          <StatBox
            label="treasury address"
            value={
              treasuryAddr
                ? `${treasuryAddr.slice(0, 6)}...${treasuryAddr.slice(-4)}`
                : "\u2014"
            }
            sub="receives 50% of tolls"
          />
          <StatBox
            label="pending fees"
            value={fmtCompact(accumulatedFees)}
            sub="waiting to get cranked"
            icon={<HedgeIcon size={16} />}
          />
        </div>
      </div>

      {/* Section: Fee Engine */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            fee engine
          </h2>
          <span className="text-xs font-bold uppercase text-zinc-600">
            protocol parameters
          </span>
        </div>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatBox
            label="trade fee"
            value={feeBps !== undefined ? `${Number(feeBps) / 100}%` : "\u2014"}
            sub="on every spoke trade"
          />
          <StatBox
            label="launch toll"
            value={toll !== undefined ? `${fmt(toll)} S` : "\u2014"}
            sub="per meme launch"
          />
          <StatBox
            label="equity rate"
            value={
              equityRate !== undefined
                ? `${(Number(equityRate) / 100).toFixed(2)}%`
                : "\u2014"
            }
            sub={`${equityRate !== undefined ? equityRate.toString() : "\u2014"} bps / launch`}
          />
          <StatBox
            label="memes launched"
            value={spokeCount !== undefined ? spokeCount.toString() : "\u2014"}
            sub="and counting"
            color="violet"
          />
        </div>
      </div>

      {/* Section: Meme Leaderboard */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            meme leaderboard
          </h2>
          <span className="text-xs font-bold uppercase text-zinc-600">
            ranked by hedge locked
          </span>
        </div>
        {count === 0 ? (
          <div className="degen-card text-center py-8">
            <p className="text-zinc-500 text-sm">
              no memes yet. be the first degen to{" "}
              <Link
                href="/launch"
                className="text-violet-400 hover:text-violet-300 font-bold"
              >
                launch one
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {spokeIds.map((id) => (
              <SpokeRow key={id} spokeId={id} rank={id + 1} />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="degen-card !p-6 sm:!p-8">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">
          where does the money go
        </h3>
        <p className="mb-4 text-xs text-zinc-600">every action feeds the machine</p>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/20 text-xs font-black text-violet-400">
              1
            </div>
            <h4 className="text-sm font-bold text-white lowercase">
              launch toll
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              50% buys HEDGE for treasury. 50% becomes permanent hub LP. floor
              goes up.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-green-600/20 text-xs font-black text-green-400">
              2
            </div>
            <h4 className="text-sm font-bold text-white lowercase">
              trade fees
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              1% fee on every meme buy/sell. accumulates as HEDGE. gets cranked
              into permanent hub LP.
            </p>
          </div>
          <div>
            <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/20 text-xs font-black text-amber-400">
              3
            </div>
            <h4 className="text-sm font-bold text-white lowercase">
              equity mint
            </h4>
            <p className="mt-1 text-xs text-zinc-500">
              each launch mints a small % of remaining HEDGE to treasury.
              geometric decay means early launches get more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
