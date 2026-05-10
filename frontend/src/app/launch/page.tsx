"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { CONTRACTS, HEDGEHOG_CORE_ABI } from "@/config/contracts";

const DEFAULT_SLOPE = "100000000000000"; // 1e14

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
        Deploying spoke...
      </div>
    );
  }
  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm text-green-400">
        Spoke launched! Check the Explore page.
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

export default function LaunchPage() {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [slope, setSlope] = useState(DEFAULT_SLOPE);

  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: rawToll, isLoading: tollLoading } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "toll",
  });
  const tollAmount = rawToll as bigint | undefined;

  function handleLaunch() {
    if (!name || !symbol) return;
    writeContract({
      address: CONTRACTS.hedgehogCore,
      abi: HEDGEHOG_CORE_ABI,
      functionName: "launchSpoke",
      args: [
        {
          name,
          symbol: symbol.toUpperCase(),
          slope: BigInt(slope),
          metadataURI,
        },
      ],
      value: tollAmount ?? BigInt(0),
    });
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Launch a Spoke</h1>
      <p className="mb-6 text-zinc-400 sm:mb-8">
        Create a new meme token backed by{" "}
        <span className="inline-flex items-center gap-1">
          <Image src="/hedge-48.png" alt="" width={16} height={16} className="inline rounded-full" />
          <span className="font-semibold text-white">$HEDGE</span>
        </span>
        . The toll is{" "}
        <span className="font-semibold text-white">
          {tollLoading ? "..." : tollAmount ? formatEther(tollAmount) : "\u2014"} $S
        </span>
        .
      </p>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Token Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              placeholder="Hedgehog Meme"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Token Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white uppercase placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              placeholder="HOGMEME"
              maxLength={10}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Metadata URI{" "}
              <span className="text-zinc-600">(optional, IPFS)</span>
            </label>
            <input
              type="text"
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
              placeholder="ipfs://..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-zinc-400">
              Bonding Curve Slope{" "}
              <span className="text-zinc-600">(advanced)</span>
            </label>
            <input
              type="text"
              value={slope}
              onChange={(e) => setSlope(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-600">
              Higher slope = steeper price curve. Default: 1e14.
            </p>
          </div>

          {!isConnected ? (
            <p className="text-center text-sm text-zinc-500">
              Connect your wallet to launch
            </p>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isPending || !name || !symbol}
              className="w-full rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Confirming..." : `Launch for ${tollAmount ? formatEther(tollAmount) : "\u2014"} S`}
            </button>
          )}

          <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 sm:mt-8">
        <h3 className="text-sm font-semibold text-zinc-300">
          What happens when you launch?
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-500">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20 text-xs font-bold text-violet-400">1</span>
            You pay <strong className="text-zinc-300">{tollAmount ? formatEther(tollAmount) : "\u2014"} $S</strong> as the toll
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20 text-xs font-bold text-violet-400">2</span>
            50% is swapped to $HEDGE and sent to treasury
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20 text-xs font-bold text-violet-400">3</span>
            50% is paired with minted $HEDGE as permanent LP (burned)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20 text-xs font-bold text-violet-400">4</span>
            Your meme token starts on a linear bonding curve (P = m &times; S)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20 text-xs font-bold text-violet-400">5</span>
            Anyone can now trade your token for $HEDGE
          </li>
        </ul>
      </div>
    </div>
  );
}
