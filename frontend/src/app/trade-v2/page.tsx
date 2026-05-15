"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import {
  COMBO_WRAPPER_ABI,
  CONTRACTS,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
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

type TradeTab = "spoke" | "spot" | "hub";
type Direction = "buy" | "sell";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function safeParseEther(value: string): bigint {
  try {
    if (!value || Number(value) <= 0) return 0n;
    return parseEther(value);
  } catch {
    return 0n;
  }
}

function fmt(value: bigint | undefined, decimals = 4) {
  if (value === undefined) return "—";
  return Number(formatEther(value)).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function TxStatus({ isPending, isSuccess, error }: { isPending: boolean; isSuccess: boolean; error: Error | null }) {
  if (isPending) {
    return <div className="rounded-lg border border-violet-500/20 bg-violet-600/10 p-3 text-center text-sm font-bold text-violet-300">waiting for wallet confirmation...</div>;
  }
  if (isSuccess) {
    return <div className="rounded-lg border border-green-500/20 bg-green-600/10 p-3 text-center text-sm font-bold text-green-300">transaction submitted</div>;
  }
  if (error) {
    return <div className="rounded-lg border border-red-500/20 bg-red-600/10 p-3 text-sm text-red-300">{error.message.slice(0, 220)}</div>;
  }
  return null;
}

function SpokeName({ spokeId }: { spokeId: string }) {
  const { data } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [BigInt(spokeId || "0")],
  });
  const info = data as SpokeInfo | undefined;
  return <>{info?.[1] || `#${spokeId}`}</>;
}

function SpokePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const { data } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeCount",
  });
  const count = data ? Number(data) : 0;
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
      >
        {Array.from({ length: count || 1 }, (_, i) => (
          <option key={i} value={String(i)}>
            Spoke #{i}
          </option>
        ))}
      </select>
    </label>
  );
}

function SpokeTradePanel({ initialSpokeId }: { initialSpokeId: string }) {
  const { address, isConnected } = useAccount();
  const [spokeId, setSpokeId] = useState(initialSpokeId || "0");
  const [mode, setMode] = useState<Direction>("buy");
  const [amount, setAmount] = useState("");
  const parsedAmount = useMemo(() => safeParseEther(amount), [amount]);
  const spokeIdBigInt = BigInt(spokeId || "0");
  const { writeContract, isPending, isSuccess, error } = useWriteContract();
  const { data: nativeBalance } = useBalance({ address });

  const { data: rawInfo } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeInfo",
    args: [spokeIdBigInt],
  });
  const info = rawInfo as SpokeInfo | undefined;
  const symbol = info?.[1] || `#${spokeId}`;

  const { data: rawBalance } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "getSpokeBalance",
    args: address ? [spokeIdBigInt, address] : undefined,
  });
  const spokeBalance = rawBalance as bigint | undefined;

  const { data: rawAllowance } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "spokeAllowance",
    args: address ? [spokeIdBigInt, address, CONTRACTS.comboWrapper] : undefined,
    query: { enabled: Boolean(address && mode === "sell" && parsedAmount > 0n) },
  });
  const allowance = rawAllowance as bigint | undefined;
  const needsApproval = mode === "sell" && parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;

  function handleBuy() {
    if (!parsedAmount) return;
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "buyMemeWithS",
      args: [spokeIdBigInt, 0n, ZERO_ADDRESS],
      value: parsedAmount,
    });
  }

  function handleUnifiedSell() {
    if (!parsedAmount) return;
    if (needsApproval) {
      writeContract({
        address: CONTRACTS.hedgehogCore,
        abi: HEDGEHOG_CORE_ABI,
        functionName: "spokeApprove",
        args: [spokeIdBigInt, CONTRACTS.comboWrapper, parsedAmount],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "sellMemeForS",
      args: [spokeIdBigInt, parsedAmount, 0n],
    });
  }

  const cta = mode === "buy" ? `buy ${symbol} with S` : needsApproval ? `approve ${symbol}` : `sell ${symbol} for S`;

  return (
    <div className="degen-card space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
        <div><p className="text-xs uppercase text-zinc-500">ur S</p><p className="font-bold text-white">{nativeBalance ? fmt(nativeBalance.value) : "—"}</p></div>
        <div><p className="text-xs uppercase text-zinc-500">ur {symbol}</p><p className="font-bold text-white">{fmt(spokeBalance)}</p></div>
      </div>
      <SpokePicker value={spokeId} onChange={setSpokeId} label="token" />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMode("buy")} className={`rounded-lg border px-3 py-2 text-sm font-bold uppercase ${mode === "buy" ? "border-green-500/30 bg-green-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>buy</button>
        <button onClick={() => setMode("sell")} className={`rounded-lg border px-3 py-2 text-sm font-bold uppercase ${mode === "sell" ? "border-red-500/30 bg-red-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>dump it</button>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 font-bold text-white placeholder-zinc-600 outline-none focus:border-violet-500" />
      {!isConnected ? <p className="text-center text-sm font-bold text-zinc-600">connect wallet to trade</p> : (
        <button onClick={mode === "buy" ? handleBuy : handleUnifiedSell} disabled={isPending || parsedAmount === 0n} className={`w-full rounded-lg py-3 text-sm font-bold uppercase text-white disabled:opacity-50 ${mode === "buy" ? "bg-green-600 hover:bg-green-700" : needsApproval ? "bg-violet-600 hover:bg-violet-700" : "bg-red-600 hover:bg-red-700"}`}>
          {isPending ? "confirming..." : cta}
        </button>
      )}
      {mode === "sell" && needsApproval ? <p className="text-center text-xs text-zinc-500">one button flow: first click approves this spoke, next click sells it.</p> : null}
      <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
    </div>
  );
}

function SpotTradePanel() {
  const { address, isConnected } = useAccount();
  const [fromSpokeId, setFromSpokeId] = useState("0");
  const [toSpokeId, setToSpokeId] = useState("1");
  const [amount, setAmount] = useState("");
  const [swapStep, setSwapStep] = useState<1 | 2>(1);
  const parsedAmount = useMemo(() => safeParseEther(amount), [amount]);
  const fromBigInt = BigInt(fromSpokeId || "0");
  const toBigInt = BigInt(toSpokeId || "1");
  const { data: nativeBalance } = useBalance({ address });
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: rawAllowance } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "spokeAllowance",
    args: address ? [fromBigInt, address, CONTRACTS.comboWrapper] : undefined,
    query: { enabled: Boolean(address && parsedAmount > 0n && swapStep === 1) },
  });
  const allowance = rawAllowance as bigint | undefined;
  const needsApproval = swapStep === 1 && parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;

  function handleStepOne() {
    if (!parsedAmount) return;
    if (needsApproval) {
      writeContract({
        address: CONTRACTS.hedgehogCore,
        abi: HEDGEHOG_CORE_ABI,
        functionName: "spokeApprove",
        args: [fromBigInt, CONTRACTS.comboWrapper, parsedAmount],
      });
      return;
    }
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "sellMemeForS",
      args: [fromBigInt, parsedAmount, 0n],
    });
  }

  function handleStepTwo() {
    if (!nativeBalance) return;
    const sBalance = Number(formatEther(nativeBalance.value));
    if (sBalance <= 0.01) return;
    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "buyMemeWithS",
      args: [toBigInt, 0n, ZERO_ADDRESS],
      value: parseEther(Math.max(sBalance - 0.01, 0).toFixed(18)),
    });
  }

  return (
    <div className="degen-card space-y-4">
      <p className="text-xs font-bold uppercase text-zinc-500">token → token via S</p>
      <div className="grid grid-cols-2 gap-3"><SpokePicker value={fromSpokeId} onChange={setFromSpokeId} label="from" /><SpokePicker value={toSpokeId} onChange={setToSpokeId} label="to" /></div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 font-bold text-white placeholder-zinc-600 outline-none focus:border-violet-500" />
      <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold uppercase">
        <div className={`rounded-lg border px-3 py-2 ${swapStep === 1 ? "border-violet-500/30 bg-violet-600/20 text-violet-300" : "border-green-500/30 bg-green-600/20 text-green-300"}`}>1. sell <SpokeName spokeId={fromSpokeId} /></div>
        <div className={`rounded-lg border px-3 py-2 ${swapStep === 2 ? "border-violet-500/30 bg-violet-600/20 text-violet-300" : "border-zinc-700 bg-zinc-800 text-zinc-600"}`}>2. buy <SpokeName spokeId={toSpokeId} /></div>
      </div>
      {!isConnected ? <p className="text-center text-sm font-bold text-zinc-600">connect wallet to swap</p> : swapStep === 1 ? (
        <>
          <button onClick={handleStepOne} disabled={isPending || parsedAmount === 0n} className={`w-full rounded-lg py-3 text-sm font-bold uppercase text-white disabled:opacity-50 ${needsApproval ? "bg-violet-600 hover:bg-violet-700" : "bg-orange-600 hover:bg-orange-700"}`}>
            {isPending ? "confirming..." : needsApproval ? "approve first token" : "sell first token"}
          </button>
          {isSuccess ? <button onClick={() => setSwapStep(2)} className="w-full rounded-lg border border-green-500/30 bg-green-600/20 py-2 text-sm font-bold text-green-300">continue to buy token →</button> : null}
        </>
      ) : (
        <>
          <button onClick={handleStepTwo} disabled={isPending} className="w-full rounded-lg bg-green-600 py-3 text-sm font-bold uppercase text-white hover:bg-green-700 disabled:opacity-50">{isPending ? "confirming..." : "buy destination token"}</button>
          <button onClick={() => setSwapStep(1)} className="w-full py-1 text-xs text-zinc-500">← back</button>
        </>
      )}
      <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
    </div>
  );
}

function HubTradePanel() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<Direction>("buy");
  const [amount, setAmount] = useState("");
  const parsedAmount = useMemo(() => safeParseEther(amount), [amount]);
  const { data: nativeBalance } = useBalance({ address });
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: rawHedgeBalance } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const hedgeBalance = rawHedgeBalance as bigint | undefined;

  const { data: rawAllowance } = useReadContract({
    address: CONTRACTS.hedgeToken,
    abi: HEDGE_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.hedgehogCore] : undefined,
    query: { enabled: Boolean(address && mode === "sell" && parsedAmount > 0n) },
  });
  const allowance = rawAllowance as bigint | undefined;
  const needsApproval = mode === "sell" && parsedAmount > 0n && (allowance ?? 0n) < parsedAmount;

  function handleBuy() {
    if (!parsedAmount) return;
    writeContract({ address: CONTRACTS.hedgehogCore, abi: HEDGEHOG_CORE_ABI, functionName: "hubBuyHedge", args: [0n], value: parsedAmount });
  }

  function handleUnifiedSell() {
    if (!parsedAmount) return;
    if (needsApproval) {
      writeContract({ address: CONTRACTS.hedgeToken, abi: HEDGE_TOKEN_ABI, functionName: "approve", args: [CONTRACTS.hedgehogCore, parsedAmount] });
      return;
    }
    writeContract({ address: CONTRACTS.hedgehogCore, abi: HEDGEHOG_CORE_ABI, functionName: "hubSellHedge", args: [parsedAmount, 0n] });
  }

  return (
    <div className="degen-card space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
        <div><p className="text-xs uppercase text-zinc-500">ur S</p><p className="font-bold text-white">{nativeBalance ? fmt(nativeBalance.value) : "—"}</p></div>
        <div><p className="text-xs uppercase text-zinc-500">ur HEDGE</p><p className="font-bold text-white">{fmt(hedgeBalance, 6)}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setMode("buy")} className={`rounded-lg border px-3 py-2 text-sm font-bold uppercase ${mode === "buy" ? "border-violet-500/30 bg-violet-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>buy $hedge</button>
        <button onClick={() => setMode("sell")} className={`rounded-lg border px-3 py-2 text-sm font-bold uppercase ${mode === "sell" ? "border-orange-500/30 bg-orange-600 text-white" : "border-zinc-700 bg-zinc-800 text-zinc-500"}`}>sell $hedge</button>
      </div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.0" className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 font-bold text-white placeholder-zinc-600 outline-none focus:border-violet-500" />
      {!isConnected ? <p className="text-center text-sm font-bold text-zinc-600">connect wallet to trade</p> : (
        <button onClick={mode === "buy" ? handleBuy : handleUnifiedSell} disabled={isPending || parsedAmount === 0n} className={`w-full rounded-lg py-3 text-sm font-bold uppercase text-white disabled:opacity-50 ${mode === "buy" ? "bg-violet-600 hover:bg-violet-700" : needsApproval ? "bg-violet-600 hover:bg-violet-700" : "bg-orange-600 hover:bg-orange-700"}`}>
          {isPending ? "confirming..." : mode === "buy" ? "buy $hedge with S" : needsApproval ? "approve $hedge" : "sell $hedge"}
        </button>
      )}
      <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
    </div>
  );
}

function TradeContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TradeTab>("spoke");
  const spokeParam = searchParams.get("spoke") ?? "0";
  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-2xl font-black uppercase text-white sm:text-3xl">trade</h1>
        <Link href="/explore" className="text-xs font-bold uppercase text-violet-400 hover:text-violet-300">all spokes</Link>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2">
        <button onClick={() => setTab("spoke")} className={`rounded-lg px-3 py-2 text-sm font-bold uppercase ${tab === "spoke" ? "border border-zinc-600 bg-zinc-700 text-white" : "text-zinc-500"}`}>spokes</button>
        <button onClick={() => setTab("spot")} className={`rounded-lg px-3 py-2 text-sm font-bold uppercase ${tab === "spot" ? "border border-zinc-600 bg-zinc-700 text-white" : "text-zinc-500"}`}>swap</button>
        <button onClick={() => setTab("hub")} className={`rounded-lg px-3 py-2 text-sm font-bold uppercase ${tab === "hub" ? "border border-zinc-600 bg-zinc-700 text-white" : "text-zinc-500"}`}>$hedge</button>
      </div>
      {tab === "spoke" ? <SpokeTradePanel initialSpokeId={spokeParam} /> : tab === "spot" ? <SpotTradePanel /> : <HubTradePanel />}
    </div>
  );
}

export default function TradeV2Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-8 text-white">loading trade...</div>}>
      <TradeContent />
    </Suspense>
  );
}
