"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import {
  CONTRACTS,
  HEDGEHOG_ROUTER_ABI,
  HEDGEHOG_CORE_ABI,
  HEDGE_TOKEN_ABI,
} from "@/config/contracts";

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
      <div className="flex items-center justify-center gap-2 rounded-lg bg-violet-600/10 p-3 text-sm text-violet-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Waiting for confirmation...
      </div>
    );
  }
  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm text-green-400">
        Transaction confirmed!
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg bg-red-600/10 p-3 text-sm text-red-400">
        {error.message.slice(0, 200)}
      </div>
    );
  }
  return null;
}

function SpokeTradePanel() {
  const { address, isConnected } = useAccount();
  const [spokeId, setSpokeId] = useState("0");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const spokeIdBigInt = BigInt(spokeId || "0");

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
        sunset: boolean;
        createdAtBlock: bigint;
        lastSupplyChangeBlock: bigint;
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

  const fmt = (val: bigint | undefined) =>
    val !== undefined
      ? Number(formatEther(val)).toLocaleString(undefined, {
          maximumFractionDigits: 4,
        })
      : "\u2014";

  function handleBuy() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogRouter,
      abi: HEDGEHOG_ROUTER_ABI,
      functionName: "buyMemeWithS",
      args: [spokeIdBigInt, BigInt(0)],
      value: parseEther(amount),
    });
  }

  function handleSell() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogRouter,
      abi: HEDGEHOG_ROUTER_ABI,
      functionName: "sellMemeForS",
      args: [spokeIdBigInt, parseEther(amount), BigInt(0)],
    });
  }

  function handleApprove() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogCore,
      abi: HEDGEHOG_CORE_ABI,
      functionName: "spokeApprove",
      args: [spokeIdBigInt, CONTRACTS.hedgehogRouter, parseEther(amount)],
    });
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
      <div className="mb-5 flex gap-2 sm:mb-6">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            mode === "buy"
              ? "bg-green-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Buy Meme
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            mode === "sell"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Sell Meme
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            Spoke ID
          </label>
          <input
            type="number"
            min="0"
            value={spokeId}
            onChange={(e) => setSpokeId(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            placeholder="0"
          />
        </div>

        {stateLoading ? (
          <div className="animate-pulse grid grid-cols-3 gap-3 rounded-lg bg-zinc-800/50 p-3">
            <div className="h-8 rounded bg-zinc-700" />
            <div className="h-8 rounded bg-zinc-700" />
            <div className="h-8 rounded bg-zinc-700" />
          </div>
        ) : state ? (
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-zinc-800/50 p-3">
            <div>
              <p className="text-xs text-zinc-500">Price</p>
              <div className="flex items-center gap-1">
                <HedgeIcon size={14} />
                <p className="text-sm font-medium text-white">{fmt(spotPrice)}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Supply</p>
              <p className="text-sm font-medium text-white">
                {fmt(state.supply)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Your Balance</p>
              <p className="text-sm font-medium text-white">
                {address ? fmt(spokeBalance) : "\u2014"}
              </p>
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            {mode === "buy" ? "Amount (S to spend)" : "Amount (Meme Tokens)"}
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            placeholder="0.0"
          />
        </div>

        {!isConnected ? (
          <p className="text-center text-sm text-zinc-500">
            Connect your wallet to trade
          </p>
        ) : mode === "sell" ? (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-zinc-700 py-3 text-sm font-semibold text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handleSell}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Confirming..." : "Sell for S"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuy}
            disabled={isPending || !amount}
            className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Confirming..." : "Buy with S"}
          </button>
        )}

        <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
      </div>
    </div>
  );
}

function HubTradePanel() {
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const { writeContract, isPending, isSuccess, error } = useWriteContract();

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
      <div className="mb-5 flex gap-2 sm:mb-6">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            mode === "buy"
              ? "bg-violet-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Buy HEDGE
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
            mode === "sell"
              ? "bg-orange-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Sell HEDGE
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-zinc-800/50 p-3">
        <div>
          <p className="text-xs text-zinc-500">Hub Price</p>
          <div className="flex items-center gap-1">
            <HedgeIcon size={14} />
            <p className="text-sm font-medium text-white">{fmt(hubPrice)} S</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Your HEDGE</p>
          <div className="flex items-center gap-1">
            <HedgeIcon size={14} />
            <p className="text-sm font-medium text-white">
              {address ? fmt(hedgeBalance) : "\u2014"}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-400">
            {mode === "buy" ? "Amount (S to spend)" : "Amount (HEDGE to sell)"}
          </label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            placeholder="0.0"
          />
        </div>

        {!isConnected ? (
          <p className="text-center text-sm text-zinc-500">
            Connect your wallet to trade
          </p>
        ) : mode === "sell" ? (
          <div className="flex gap-2">
            <button
              onClick={handleApproveHedge}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-zinc-700 py-3 text-sm font-semibold text-white hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={handleSellHedge}
              disabled={isPending || !amount}
              className="flex-1 rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Confirming..." : "Sell HEDGE"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuyHedge}
            disabled={isPending || !amount}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Confirming..." : "Buy HEDGE with S"}
          </button>
        )}

        <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
      </div>
    </div>
  );
}

export default function TradePage() {
  const [tab, setTab] = useState<"spoke" | "hub">("spoke");

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="mb-6 text-2xl font-bold text-white sm:mb-8 sm:text-3xl">Trade</h1>

      <div className="mb-5 flex gap-2 sm:mb-6">
        <button
          onClick={() => setTab("spoke")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "spoke"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Meme Tokens
        </button>
        <button
          onClick={() => setTab("hub")}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            tab === "hub"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <HedgeIcon size={16} />
          HEDGE / S Hub
        </button>
      </div>

      {tab === "spoke" ? <SpokeTradePanel /> : <HubTradePanel />}
    </div>
  );
}
