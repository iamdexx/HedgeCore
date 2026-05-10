"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, HEDGEHOG_ROUTER_ABI } from "@/config/contracts";

export default function TradePage() {
  const { address, isConnected } = useAccount();
  const [spokeId, setSpokeId] = useState("0");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const { writeContract, isPending } = useWriteContract();

  const toll = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: [
      {
        type: "function",
        name: "toll",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "toll",
  });

  function handleBuy() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogRouter,
      abi: HEDGEHOG_ROUTER_ABI,
      functionName: "buyMemeWithS",
      args: [BigInt(spokeId), BigInt(0)],
      value: parseEther(amount),
    });
  }

  function handleSell() {
    if (!amount) return;
    writeContract({
      address: CONTRACTS.hedgehogRouter,
      abi: HEDGEHOG_ROUTER_ABI,
      functionName: "sellMemeForS",
      args: [BigInt(spokeId), parseEther(amount), BigInt(0)],
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-white">Trade</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="mb-6 flex gap-2">
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

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              {mode === "buy" ? "Amount (S)" : "Amount (Meme Tokens)"}
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
          ) : (
            <button
              onClick={mode === "buy" ? handleBuy : handleSell}
              disabled={isPending || !amount}
              className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === "buy"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isPending
                ? "Confirming..."
                : mode === "buy"
                  ? "Buy with S"
                  : "Sell for S"}
            </button>
          )}
        </div>

        {mode === "sell" && (
          <p className="mt-4 text-xs text-zinc-500">
            Selling requires prior approval: call{" "}
            <code className="rounded bg-zinc-800 px-1">
              core.spokeApprove(spokeId, router, amount)
            </code>{" "}
            first.
          </p>
        )}
      </div>
    </div>
  );
}
