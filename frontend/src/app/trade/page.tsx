"use client";

import { useState, Suspense, useMemo } from "react";
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

const TOKEN_ADDRESSES: Record<string, string> = {
  wS: "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
  USDC: "0x29219dd400f2Bf60E5a23d13Be72B486D4038894",
  WETH: "0x50c42dEAcD8Fc9773493ED674b675bE577f2634b",
  USDT: "0x6047828dc181963ba44974801FF68e538Da5eAf9",
  EURC: "0xe715cbA7B5CCB33790cEBFF1436809D36Cb17E57",
  "EURC.e": "0xe715cbA7B5CCB33790cEBFF1436809D36Cb17E57",
  WBTC: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
  stS: "0xE5DA20F15420aD15DE0fa650600aFc998bbE3955",
  SHADOW: "0x3333b97138D4b086720b5aE8A7844b1345a33333",
  scUSD: "0xd3DCe716f3eF535C5Ff8d041c1A41C3bd89b97aE",
  FT: "0x5DD1A7A369e8273371d2DBf9d83356057088082c",
};

function getDexScreenerUrl(symbol: string): string | null {
  const addr = TOKEN_ADDRESSES[symbol];
  if (!addr) return null;
  return `https://dexscreener.com/sonic/${addr}?embed=1&trades=0&info=0&chartTheme=dark&theme=dark`;
}

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

function SlippageWarning({ supply, reserve, amount, mode, hubPrice }: {
  supply: bigint | undefined;
  reserve: bigint | undefined;
  amount: string;
  mode: "buy" | "sell";
  hubPrice?: bigint;
}) {
  const slippage = useMemo(() => {
    if (!supply || !reserve || !amount || amount === "0") return null;
    try {
      const supplyNum = Number(formatEther(supply));
      const reserveNum = Number(formatEther(reserve));
      let amountNum = Number(amount);
      if (supplyNum === 0 || reserveNum === 0 || amountNum === 0) return null;

      const spotPrice = reserveNum > 0 && supplyNum > 0
        ? (2 * reserveNum) / supplyNum
        : 0;
      if (spotPrice === 0) return null;

      let effectivePrice: number;
      if (mode === "buy") {
        // Input is S, convert to estimated HEDGE via hub price
        const hubRate = hubPrice ? Number(formatEther(hubPrice)) : 0;
        const hedgeIn = hubRate > 0 ? amountNum * hubRate * 0.99 : amountNum;
        const newReserve = reserveNum + hedgeIn;
        const newSupply = Math.sqrt((2 * newReserve) / (spotPrice / supplyNum)) || supplyNum;
        const tokensOut = newSupply - supplyNum;
        effectivePrice = tokensOut > 0 ? hedgeIn / tokensOut : spotPrice;
      } else {
        const tokensIn = amountNum;
        const newSupply = Math.max(supplyNum - tokensIn, 0);
        const slopeEst = spotPrice / supplyNum;
        const newReserve = (slopeEst * newSupply * newSupply) / 2;
        const hedgeOut = reserveNum - newReserve;
        effectivePrice = hedgeOut > 0 ? hedgeOut / tokensIn : spotPrice;
      }

      const slippagePct = Math.abs((effectivePrice - spotPrice) / spotPrice) * 100;
      return slippagePct;
    } catch {
      return null;
    }
  }, [supply, reserve, amount, mode, hubPrice]);

  if (slippage === null || slippage < 0.01) return null;

  const color = slippage < 2 ? "green" : slippage < 10 ? "yellow" : "red";
  const colorClasses = {
    green: "bg-green-600/10 text-green-400 border-green-500/20",
    yellow: "bg-yellow-600/10 text-yellow-400 border-yellow-500/20",
    red: "bg-red-600/10 text-red-400 border-red-500/20",
  };

  return (
    <div className={`rounded-lg p-3 text-xs font-bold border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <span>estimated slippage</span>
        <span>{slippage.toFixed(2)}%</span>
      </div>
      <div className="flex items-center justify-between mt-1 opacity-70">
        <span>protocol fee</span>
        <span>1.00%</span>
      </div>
      <div className="flex items-center justify-between mt-1 opacity-70">
        <span>fee → permanent LP</span>
        <span>burned into hub pool</span>
      </div>
      {slippage > 10 && (
        <p className="mt-2 text-xs font-normal">
          ⚠ high slippage — pool is thinly seeded. consider a smaller trade.
        </p>
      )}
    </div>
  );
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
  const [showChart, setShowChart] = useState(true);
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

  const { data: rawHubPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getHubPrice",
  });
  const hubPrice = rawHubPrice as bigint | undefined;

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
  const chartUrl = getDexScreenerUrl(tokenSymbol);

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

      {/* Price Banner — Hedgehog vs Market */}
      <div className="degen-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase text-zinc-500">hedgehog curve price</p>
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
          >
            {showChart ? "hide chart" : "show chart"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <HedgeIcon size={18} />
          <span className="text-xl font-black text-white">{fmt(spotPrice)} HEDGE</span>
          <span className="text-xs text-zinc-500">per {tokenSymbol || "token"}</span>
        </div>
        <p className="mt-1 text-xs text-zinc-600">
          chart shows market price on external DEXes · trade executes on hedgehog bonding curve
        </p>
      </div>

      {/* DexScreener Chart */}
      {showChart && chartUrl && (
        <div className="overflow-hidden rounded-xl border border-zinc-700">
          <iframe
            src={chartUrl}
            title={`${tokenSymbol} chart`}
            className="w-full border-0"
            style={{ height: 350 }}
            allow="clipboard-write"
            loading="lazy"
          />
        </div>
      )}

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

          {amount && Number(amount) > 0 && (
            <SlippageWarning
              supply={state?.supply}
              reserve={state?.hedgeReserve}
              amount={amount}
              mode={mode}
              hubPrice={hubPrice}
            />
          )}

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

function SpotTradePanel() {
  const { address, isConnected } = useAccount();
  const [fromSpokeId, setFromSpokeId] = useState("0");
  const [toSpokeId, setToSpokeId] = useState("1");
  const [amount, setAmount] = useState("");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [swapStep, setSwapStep] = useState<1 | 2>(1);
  const { writeContract, isPending, isSuccess, error } = useWriteContract();
  const { data: nativeBalance } = useBalance({ address });

  const { data: spokeCount } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });
  const count = spokeCount ? Number(spokeCount) : 0;

  const fromBigInt = BigInt(fromSpokeId || "0");
  const toBigInt = BigInt(toSpokeId || "1");

  const { data: rawFromInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [fromBigInt],
  });
  const fromInfo = rawFromInfo as SpokeInfo | undefined;
  const fromSymbol = fromInfo?.[1] ?? "";
  const fromName = fromInfo?.[0] ?? `Spoke #${fromSpokeId}`;
  const fromLogo = TOKEN_LOGOS[fromSymbol] ?? null;

  const { data: rawToInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [toBigInt],
  });
  const toInfo = rawToInfo as SpokeInfo | undefined;
  const toSymbol = toInfo?.[1] ?? "";
  const toName = toInfo?.[0] ?? `Spoke #${toSpokeId}`;
  const toLogo = TOKEN_LOGOS[toSymbol] ?? null;

  const { data: rawFromPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpotPrice",
    args: [fromBigInt],
  });
  const fromPrice = rawFromPrice as bigint | undefined;

  const { data: rawToPrice } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpotPrice",
    args: [toBigInt],
  });
  const toPrice = rawToPrice as bigint | undefined;

  const { data: rawFromBalance } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeBalance",
    args: address ? [fromBigInt, address] : undefined,
  });
  const fromBalance = rawFromBalance as bigint | undefined;

  const exchangeRate = useMemo(() => {
    if (!fromPrice || !toPrice || fromPrice === BigInt(0) || toPrice === BigInt(0)) return null;
    const from = Number(formatEther(fromPrice));
    const to = Number(formatEther(toPrice));
    if (from === 0 || to === 0) return null;
    return from / to;
  }, [fromPrice, toPrice]);

  const estimatedOut = useMemo(() => {
    if (!exchangeRate || !amount || Number(amount) === 0) return null;
    const out = Number(amount) * exchangeRate * 0.98;
    return out;
  }, [exchangeRate, amount]);

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : "\u2014";

  function handleSellStep() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "sellMemeForS",
      args: [fromBigInt, parseEther(amount), BigInt(0)],
    });
  }

  function handleBuyStep() {
    if (!nativeBalance) return;
    const sBalance = Number(formatEther(nativeBalance.value));
    if (sBalance <= 0.01) return;
    const sToSpend = Math.max(sBalance - 0.01, 0);
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "buyMemeWithS",
      args: [toBigInt, BigInt(0), "0x0000000000000000000000000000000000000000"],
      value: parseEther(sToSpend.toFixed(18)),
    });
  }

  function handleApproveFrom() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgeToken,
      abi: HEDGE_TOKEN_ABI,
      functionName: "approve",
      args: [CONTRACTS.comboWrapper, parseEther(amount)],
    });
  }

  function swapDirection() {
    const tmp = fromSpokeId;
    setFromSpokeId(toSpokeId);
    setToSpokeId(tmp);
  }

  return (
    <div className="space-y-4">
      <div className="degen-card">
        <p className="mb-3 text-xs font-bold uppercase text-zinc-500">
          swap token → token via HEDGE
        </p>
        <p className="text-xs text-zinc-600 mb-4">
          route: {fromSymbol || "token"} → HEDGE → {toSymbol || "token"} · 1% fee per leg (burned into LP)
        </p>

        {/* From Token */}
        <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase text-zinc-600">from</p>
            {fromBalance !== undefined && (
              <p className="text-xs text-zinc-500">bal: {fmt(fromBalance)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setFromOpen(!fromOpen); setToOpen(false); }}
              className="flex items-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 hover:bg-zinc-600 transition-colors shrink-0"
            >
              {fromLogo ? (
                <img src={fromLogo} alt={fromSymbol} className="h-6 w-6 rounded-full" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-violet-600/30 flex items-center justify-center text-xs text-violet-400 font-bold">
                  #{fromSpokeId}
                </div>
              )}
              <span className="text-sm font-bold text-white">{fromSymbol || `#${fromSpokeId}`}</span>
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-right text-lg font-bold text-white placeholder-zinc-600 focus:outline-none"
              placeholder="0.0"
            />
          </div>
          {fromOpen && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700 divide-y divide-zinc-700/50">
              {Array.from({ length: count }, (_, i) => (
                <div key={i} onClick={() => { setFromSpokeId(String(i)); setFromOpen(false); }}>
                  <SpokeOption spokeId={i} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={swapDirection}
            className="rounded-full bg-zinc-700 p-2 border border-zinc-600 hover:bg-zinc-600 transition-colors"
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Token */}
        <div className="rounded-lg bg-zinc-800/50 p-3 border border-zinc-700 mt-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase text-zinc-600">to (estimated)</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setToOpen(!toOpen); setFromOpen(false); }}
              className="flex items-center gap-2 rounded-lg bg-zinc-700 px-3 py-2 hover:bg-zinc-600 transition-colors shrink-0"
            >
              {toLogo ? (
                <img src={toLogo} alt={toSymbol} className="h-6 w-6 rounded-full" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-violet-600/30 flex items-center justify-center text-xs text-violet-400 font-bold">
                  #{toSpokeId}
                </div>
              )}
              <span className="text-sm font-bold text-white">{toSymbol || `#${toSpokeId}`}</span>
              <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <p className="w-full text-right text-lg font-bold text-zinc-400">
              {estimatedOut !== null ? `~${estimatedOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : "—"}
            </p>
          </div>
          {toOpen && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-zinc-800 border border-zinc-700 divide-y divide-zinc-700/50">
              {Array.from({ length: count }, (_, i) => (
                <div key={i} onClick={() => { setToSpokeId(String(i)); setToOpen(false); }}>
                  <SpokeOption spokeId={i} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rate + Fee Info */}
        {exchangeRate !== null && (
          <div className="mt-3 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>rate</span>
              <span>1 {fromSymbol} ≈ {exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {toSymbol}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-500 mt-1">
              <span>route</span>
              <span>{fromSymbol} → HEDGE → {toSymbol}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-500 mt-1">
              <span>total fees</span>
              <span>~2% (1% per leg → burned into LP)</span>
            </div>
          </div>
        )}

        {/* Slippage Warning */}
        {amount && Number(amount) > 0 && (
          <div className="mt-3 rounded-lg bg-yellow-600/10 p-3 border border-yellow-500/20 text-xs text-yellow-400">
            <p className="font-bold">⚠ spot swaps route through two bonding curves</p>
            <p className="mt-1 opacity-70">
              slippage compounds across both legs. pools are early-stage — consider smaller trades.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-3">
          {!isConnected ? (
            <p className="text-center text-sm font-bold text-zinc-600">
              connect wallet to trade anon
            </p>
          ) : swapStep === 1 ? (
            <>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 text-center rounded-lg bg-violet-600/20 py-1.5 text-xs font-bold text-violet-400 border border-violet-500/30">
                  step 1: sell {fromSymbol} → S
                </div>
                <div className="flex-1 text-center rounded-lg bg-zinc-800 py-1.5 text-xs font-bold text-zinc-600 border border-zinc-700">
                  step 2: buy {toSymbol}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApproveFrom}
                  disabled={isPending || !amount}
                  className="flex-1 rounded-lg bg-zinc-700 py-3 text-sm font-bold uppercase text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50 border border-zinc-600"
                >
                  1. approve
                </button>
                <button
                  onClick={() => { handleSellStep(); }}
                  disabled={isPending || !amount}
                  className="flex-1 rounded-lg bg-orange-600 py-3 text-sm font-bold uppercase text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 border border-orange-500/30"
                >
                  {isPending ? "confirming..." : `sell ${fromSymbol} → S`}
                </button>
              </div>
              {isSuccess && (
                <button
                  onClick={() => setSwapStep(2)}
                  className="w-full rounded-lg bg-green-600/20 py-2 text-sm font-bold text-green-400 border border-green-500/30 hover:bg-green-600/30 transition-colors"
                >
                  step 1 done — proceed to step 2 →
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <div className="flex-1 text-center rounded-lg bg-green-600/20 py-1.5 text-xs font-bold text-green-400 border border-green-500/30">
                  step 1: done
                </div>
                <div className="flex-1 text-center rounded-lg bg-violet-600/20 py-1.5 text-xs font-bold text-violet-400 border border-violet-500/30">
                  step 2: buy {toSymbol}
                </div>
              </div>
              <p className="text-xs text-zinc-500 text-center">
                your S from step 1 is ready — now buy {toSymbol}
              </p>
              <button
                onClick={handleBuyStep}
                disabled={isPending}
                className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold uppercase text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 border border-green-500/30"
              >
                {isPending ? "confirming..." : `buy ${toSymbol} with S`}
              </button>
              <button
                onClick={() => setSwapStep(1)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-400 transition-colors py-1"
              >
                ← back to step 1
              </button>
            </>
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
  const [tab, setTab] = useState<"spoke" | "spot" | "hub">("spoke");

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
          onClick={() => setTab("spot")}
          className={`rounded-lg px-4 py-2 text-sm font-bold uppercase transition-colors ${
            tab === "spot"
              ? "bg-zinc-700 text-white border border-zinc-600"
              : "text-zinc-500 hover:text-white"
          }`}
        >
          spot swap
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
          $hedge
        </button>
      </div>

      {tab === "spoke" ? (
        <SpokeTradePanel initialSpokeId={spokeParam} />
      ) : tab === "spot" ? (
        <SpotTradePanel />
      ) : (
        <HubTradePanel />
      )}
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
