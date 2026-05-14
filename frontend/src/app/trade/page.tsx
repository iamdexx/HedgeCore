"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseEther, formatEther } from "viem";
import {
  CONTRACTS,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
  COMBO_WRAPPER_ABI,
} from "@/config/contracts";

type SpokeInfo = readonly [
  string,
  string,
  string,
  bigint,
  bigint,
  bigint,
  boolean,
  `0x${string}`,
];

const TOKEN_LOGOS: Record<string, string> = {
  wS: "https://assets.coingecko.com/coins/images/44071/standard/Sonic_Logomark_Dark.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
  WETH: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
  USDT: "https://assets.coingecko.com/coins/images/325/standard/Tether.png",
  "EURC.e": "https://assets.coingecko.com/coins/images/26045/standard/euro-coin.png",
  EURC: "https://assets.coingecko.com/coins/images/26045/standard/euro-coin.png",
  WBTC: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png",
  stS: "https://assets.coingecko.com/coins/images/44071/standard/Sonic_Logomark_Dark.png",
  SHADOW: "https://assets.coingecko.com/coins/images/54213/standard/Shadow.png",
  scUSD: "https://assets.coingecko.com/coins/images/44071/standard/Sonic_Logomark_Dark.png",
  FT: "https://assets.coingecko.com/coins/images/54059/standard/FT.png",
};

function HedgeIcon({ size = 16 }: { size?: number }) {
  return (
    <Image src="/hedge-48.png" alt="HEDGE" width={size} height={size} className="rounded-full" />
  );
}

function TxStatus({ isPending, isSuccess, error }: {
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
}) {
  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-violet-600/10 p-3 text-sm text-violet-400 border border-violet-500/20">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        waiting for confirmation...
      </div>
    );
  }
  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm font-bold text-green-400 border border-green-500/20">
        tx confirmed
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-600/10 p-3 text-sm text-red-400 border border-red-500/20">
        {error.message.slice(0, 200)}
      </div>
    );
  }
  return null;
}

function SpokeOption({ spokeId }: { spokeId: number }) {
  const { data: rawInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [BigInt(spokeId)],
  });
  const info = rawInfo as SpokeInfo | undefined;
  const name = info?.[0] ?? `Spoke #${spokeId}`;
  const symbol = info?.[1] ?? "";
  const logoUrl = TOKEN_LOGOS[symbol] ?? null;

  return (
    <Link
      href={`/trade?spoke=${spokeId}`}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-700/50 transition-colors"
    >
      {logoUrl ? (
        <img src={logoUrl} alt={symbol} className="h-7 w-7 rounded-full border border-violet-500/20" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">
          #{spokeId}
        </div>
      )}
      <div>
        <p className="text-sm font-bold text-white">{name}</p>
        <p className="text-xs text-zinc-500">{symbol} · spoke #{spokeId}</p>
      </div>
    </Link>
  );
}

function SpokeTradePanel({ initialSpokeId }: { initialSpokeId: string }) {
  const { address, isConnected } = useAccount();
  const [spokeId, setSpokeId] = useState(initialSpokeId);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: nativeBalance } = useBalance({ address });

  const { data: rawHedgeBalance } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const hedgeBalance = rawHedgeBalance as bigint | undefined;

  const spokeIdBigInt = BigInt(spokeId || "0");

  const { data: rawInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [spokeIdBigInt],
  });
  const info = rawInfo as SpokeInfo | undefined;
  const tokenName = info?.[0] ?? "";
  const tokenSymbol = info?.[1] ?? "";
  const logoUrl = TOKEN_LOGOS[tokenSymbol] ?? null;

  const { data: rawState, isLoading: stateLoading } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeState",
    args: [spokeIdBigInt],
  });
  const state = rawState as
    | {
        supply: bigint;
        hedgeReserve: bigint;
        slope: bigint;
        graduated: boolean;
        createdAtBlock: bigint;
        creator: `0x${string}`;
      }
    | undefined;

  const { data: rawPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpotPrice",
    args: [spokeIdBigInt],
  });
  const spotPrice = rawPrice as bigint | undefined;

  const { data: rawBalance } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeBalance",
    args: address ? [spokeIdBigInt, address] : undefined,
  });
  const spokeBalance = rawBalance as bigint | undefined;

  const { data: spokeCount } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });
  const count = spokeCount ? Number(spokeCount) : 0;

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })
      : "\u2014";

  function handleBuy() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "buyMemeWithS",
      args: [spokeIdBigInt, BigInt(0), "0x0000000000000000000000000000000000000000"],
      value: parseEther(amount),
    });
  }

  function handleSell() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "sellMemeForS",
      args: [spokeIdBigInt, parseEther(amount), BigInt(0)],
    });
  }

  function handleApprove() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgeToken,
      abi: HEDGE_TOKEN_ABI,
      functionName: "approve",
      args: [CONTRACTS.comboWrapper, parseEther(amount)],
    });
  }

  return (
    <div className="space-y-4">
      {/* Token Header */}
      <div className="degen-card">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setSelectorOpen(!selectorOpen)}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tokenSymbol}
                className="h-10 w-10 rounded-full border-2 border-violet-500/30"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/30 text-sm font-black text-violet-400 border-2 border-violet-500/30">
                #{spokeId}
              </div>
            )}
            <div>
              <h2 className="text-lg font-black text-white">
                {tokenName || `Spoke #${spokeId}`}
              </h2>
              <p className="text-xs text-zinc-500">
                {tokenSymbol} · spoke #{spokeId}
              </p>
            </div>
          </div>
          <svg
            className={`h-5 w-5 text-zinc-500 transition-transform ${selectorOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {selectorOpen && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg bg-zinc-800/80 border border-zinc-700 divide-y divide-zinc-700/50">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} onClick={() => { setSpokeId(String(i)); setSelectorOpen(false); }}>
                <SpokeOption spokeId={i} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swap Card */}
      <div className="degen-card">
        {isConnected && (
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-600">ur S</p>
              <p className="text-sm font-bold text-white">
                {nativeBalance ? Number(formatEther(nativeBalance.value)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "\u2014"}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-zinc-600">ur HEDGE</p>
              <div className="flex items-center gap-1">
                <HedgeIcon size={12} />
                <p className="text-sm font-bold text-white">{fmt(hedgeBalance)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-zinc-600">ur {tokenSymbol || "bag"}</p>
              <p className="text-sm font-bold text-white">{fmt(spokeBalance)}</p>
            </div>
          </div>
        )}

        <div className="mb-5 flex gap-2 sm:mb-6">
          <button
            onClick={() => setMode("buy")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold uppercase transition-colors ${
              mode === "buy"
                ? "bg-green-600 text-white border border-green-500/30"
                : "bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700"
            }`}
          >
            buy
          </button>
          <button
            onClick={() => setMode("sell")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold uppercase transition-colors ${
              mode === "sell"
                ? "bg-red-600 text-white border border-red-500/30"
                : "bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700"
            }`}
          >
            dump it
          </button>
        </div>

        <div className="space-y-4">
          {stateLoading ? (
            <div className="animate-pulse grid grid-cols-3 gap-3 rounded-lg bg-zinc-800/50 p-3">
              <div className="h-8 rounded bg-zinc-700" />
              <div className="h-8 rounded bg-zinc-700" />
              <div className="h-8 rounded bg-zinc-700" />
            </div>
          ) : state ? (
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700">
              <div>
                <p className="text-xs font-bold uppercase text-zinc-600">price</p>
                <div className="flex items-center gap-1">
                  <HedgeIcon size={14} />
                  <p className="text-sm font-bold text-white">{fmt(spotPrice)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-zinc-600">supply</p>
                <p className="text-sm font-bold text-white">{fmt(state.supply)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-zinc-600">reserve</p>
                <div className="flex items-center gap-1">
                  <HedgeIcon size={12} />
                  <p className="text-sm font-bold text-white">{fmt(state.hedgeReserve)}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
              {mode === "buy" ? "amount (S to spend)" : `amount (${tokenSymbol || "tokens"} to dump)`}
            </label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              placeholder="0.0"
            />
          </div>

          {!isConnected ? (
            <p className="text-center text-sm font-bold text-zinc-600">
              connect wallet to trade anon
            </p>
          ) : mode === "sell" ? (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isPending || !amount}
                className="flex-1 rounded-lg bg-zinc-700 py-3 text-sm font-bold uppercase text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 border border-zinc-600"
              >
                approve
              </button>
              <button
                onClick={handleSell}
                disabled={isPending || !amount}
                className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-bold uppercase text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 border border-red-500/30"
              >
                {isPending ? "confirming..." : `sell ${tokenSymbol || ""} for S`}
              </button>
            </div>
          ) : (
            <button
              onClick={handleBuy}
              disabled={isPending || !amount}
              className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold uppercase text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 border border-green-500/30"
            >
              {isPending ? "confirming..." : `buy ${tokenSymbol || ""} with S`}
            </button>
          )}

          <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
        </div>
      </div>
    </div>
  );
}

function HubTradePanel() {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: nativeBalance } = useBalance({ address });

  const { data: rawHubPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getHubPrice",
  });
  const hubPrice = rawHubPrice as bigint | undefined;

  const { data: rawHedgeBalance } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const hedgeBalance = rawHedgeBalance as bigint | undefined;

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        })
      : "\u2014";

  const fmtPricePerHedge = (price: bigint | undefined) => {
    if (price === undefined || price === BigInt(0)) return "\u2014";
    const hedgePerS = Number(formatEther(price));
    const sPerHedge = 1 / hedgePerS;
    if (sPerHedge < 0.0001) return sPerHedge.toExponential(2);
    return sPerHedge.toLocaleString(undefined, { maximumSignificantDigits: 4 });
  };

  function handleBuyHedge() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogCore,
      abi: HEDGEHOG_CORE_ABI,
      functionName: "hubBuyHedge",
      args: [BigInt(0)],
      value: parseEther(amount),
    });
  }

  function handleApproveHedge() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgeToken,
      abi: HEDGE_TOKEN_ABI,
      functionName: "approve",
      args: [CONTRACTS.hedgehogCore, parseEther(amount)],
    });
  }

  function handleSellHedge() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogCore,
      abi: HEDGEHOG_CORE_ABI,
      functionName: "hubSellHedge",
      args: [parseEther(amount), BigInt(0)],
    });
  }

  return (
    <div className="degen-card">
      <div className="mb-5 flex gap-2 sm:mb-6">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold uppercase transition-colors ${
            mode === "buy"
              ? "bg-violet-600 text-white border border-violet-500/30"
              : "bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700"
          }`}
        >
          buy $hedge
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-bold uppercase transition-colors ${
            mode === "sell"
              ? "bg-orange-600 text-white border border-orange-500/30"
              : "bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700"
          }`}
        >
          sell $hedge
        </button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700">
        <div>
          <p className="text-xs font-bold uppercase text-zinc-600">1 hedge</p>
          <div className="flex items-center gap-1">
            <HedgeIcon size={14} />
            <p className="text-sm font-bold text-white">{fmtPricePerHedge(hubPrice)} S</p>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-zinc-600">ur S</p>
          <p className="text-sm font-bold text-white">
            {address && nativeBalance ? Number(formatEther(nativeBalance.value)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "\u2014"}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-zinc-600">ur hedge</p>
          <div className="flex items-center gap-1">
            <HedgeIcon size={14} />
            <p className="text-sm font-bold text-white">
              {address ? fmt(hedgeBalance) : "\u2014"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
            {mode === "buy" ? "amount (S to spend)" : "amount (HEDGE to sell)"}
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            placeholder="0.0"
          />
        </div>

        {!isConnected ? (
          <p className="text-center text-sm font-bold text-zinc-600">
            connect wallet to trade anon
          </p>
        ) : mode === "sell" ? (
          <div className="flex gap-2">
            <button
              onClick={handleApproveHedge}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-zinc-700 py-3 text-sm font-bold uppercase text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 border border-zinc-600"
            >
              approve
            </button>
            <button
              onClick={handleSellHedge}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-orange-600 py-3 text-sm font-bold uppercase text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 border border-orange-500/30"
            >
              {isPending ? "confirming..." : "sell $hedge"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuyHedge}
            disabled={isPending || !amount}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 border border-violet-500/30"
          >
            {isPending ? "confirming..." : "buy $hedge with S"}
          </button>
        )}

        <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
      </div>
    </div>
  );
}

function TradeContent() {
  const searchParams = useSearchParams();
  const spokeParam = searchParams.get("spoke") ?? "0";
  const [tab, setTab] = useState<"spoke" | "hub">("spoke");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between sm:mb-8">
        <h1 className="glow-text text-2xl font-black uppercase text-white sm:text-3xl">trade</h1>
        <Link
          href="/explore"
          className="text-xs font-bold uppercase text-violet-400 hover:text-violet-300 transition-colors"
        >
          all spokes
        </Link>
      </div>

      <div className="mb-5 flex gap-2 sm:mb-6">
        <button
          onClick={() => setTab("spoke")}
          className={`rounded-lg px-4 py-2 text-sm font-bold uppercase transition-colors ${
            tab === "spoke"
              ? "bg-zinc-700 text-white border border-zinc-600"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          spoke tokens
        </button>
        <button
          onClick={() => setTab("hub")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold uppercase transition-colors ${
            tab === "hub"
              ? "bg-zinc-700 text-white border border-zinc-600"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          <HedgeIcon size={16} />
          $hedge / S
        </button>
      </div>

      {tab === "spoke" ? <SpokeTradePanel initialSpokeId={spokeParam} /> : <HubTradePanel />}
    </div>
  );
}

export default function TradePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <h1 className="glow-text mb-6 text-2xl font-black uppercase text-white sm:mb-8 sm:text-3xl">trade</h1>
        <div className="animate-pulse degen-card"><div className="h-40 rounded bg-zinc-700" /></div>
      </div>
    }>
      <TradeContent />
    </Suspense>
  );
}
