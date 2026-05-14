"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { isAddress } from "viem";
import { CONTRACTS, TOKEN_LISTING_WRAPPER_ABI, ERC20_ABI } from "@/config/contracts";

function TokenPreview({ address }: { address: `0x${string}` }) {
  const { data: name } = useReadContract({
    address,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
  const { data: decimals } = useReadContract({
    address,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  return (
    <div className="mt-3 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-zinc-500">detected token</p>
          <p className="text-sm font-bold text-white">{name ?? "loading..."}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-zinc-500">decimals</p>
          <p className="text-sm font-bold text-white">{decimals?.toString() ?? "—"}</p>
        </div>
        <a
          href={`https://sonicscan.org/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          view on sonicscan
        </a>
      </div>
    </div>
  );
}

function ListedTokenRow({ index }: { index: number }) {
  const { data: tokenAddress } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "listedTokens",
    args: [BigInt(index)],
  });

  const { data: spokeId } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "tokenSpokeId",
    args: tokenAddress ? [tokenAddress] : undefined,
  });

  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}` | undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  if (!tokenAddress) return null;

  return (
    <Link href={`/trade?spoke=${spokeId?.toString() ?? "0"}`}>
      <div className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-4 py-3 border border-zinc-700/30 hover:border-violet-500/30 hover:bg-zinc-800/50 transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-xs font-black text-violet-400 border border-violet-500/20">
            #{spokeId?.toString() ?? "?"}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{symbol ?? "..."}</p>
            <p className="text-xs text-zinc-500 font-mono">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-green-600/20 px-2.5 py-1 text-xs font-bold uppercase text-green-400 border border-green-500/20">
          live
        </span>
      </div>
    </Link>
  );
}

export default function ListPage() {
  const { address: userAddress, isConnected } = useAccount();
  const [tokenInput, setTokenInput] = useState("");
  const validAddress = isAddress(tokenInput) ? (tokenInput as `0x${string}`) : null;

  const { data: isAlreadyListed } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "isListed",
    args: validAddress ? [validAddress] : undefined,
  });

  const { data: existingRequest } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "listingRequests",
    args: validAddress ? [validAddress] : undefined,
  });

  const { data: listedCount } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "listedTokenCount",
  });

  const { data: ownerAddress } = useReadContract({
    address: CONTRACTS.tokenListingWrapper,
    abi: TOKEN_LISTING_WRAPPER_ABI,
    functionName: "owner",
  });

  const isOwner = isConnected && userAddress && ownerAddress &&
    userAddress.toLowerCase() === (ownerAddress as string).toLowerCase();

  const hasPendingRequest = existingRequest && existingRequest !== "0x0000000000000000000000000000000000000000";

  const {
    writeContract: requestListing,
    isPending: isRequesting,
    isSuccess: requestSuccess,
    error: requestError,
  } = useWriteContract();

  const {
    writeContract: approveListing,
    isPending: isApproving,
    isSuccess: approveSuccess,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: rejectListing,
    isPending: isRejecting,
  } = useWriteContract();

  const handleRequest = () => {
    if (!validAddress) return;
    requestListing({
      address: CONTRACTS.tokenListingWrapper,
      abi: TOKEN_LISTING_WRAPPER_ABI,
      functionName: "requestListing",
      args: [validAddress],
    });
  };

  const handleApprove = () => {
    if (!validAddress) return;
    approveListing({
      address: CONTRACTS.tokenListingWrapper,
      abi: TOKEN_LISTING_WRAPPER_ABI,
      functionName: "approveListing",
      args: [validAddress],
      value: BigInt("50000000000000000000"),
    });
  };

  const handleReject = () => {
    if (!validAddress) return;
    rejectListing({
      address: CONTRACTS.tokenListingWrapper,
      abi: TOKEN_LISTING_WRAPPER_ABI,
      functionName: "rejectListing",
      args: [validAddress],
    });
  };

  const count = listedCount ? Number(listedCount) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          list a <span className="text-violet-400">token</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Request any ERC-20 on Sonic to be listed as a spoke on Hedgehog Protocol.
          The owner reviews and approves listings to protect against malicious contracts.
        </p>
      </div>

      {/* Request Form */}
      <div className="degen-card space-y-4">
        <h2 className="text-lg font-bold uppercase text-white">request listing</h2>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
            token contract address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-lg bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-600 border border-zinc-700 focus:border-violet-500 focus:outline-none font-mono"
          />
        </div>

        {validAddress && <TokenPreview address={validAddress} />}

        {isAlreadyListed && (
          <div className="rounded-lg bg-green-600/10 p-3 text-sm font-bold text-green-400 border border-green-500/20">
            this token is already listed as a spoke
          </div>
        )}

        {!isAlreadyListed && hasPendingRequest && (
          <div className="rounded-lg bg-yellow-600/10 p-3 text-sm font-bold text-yellow-400 border border-yellow-500/20">
            listing request pending — awaiting owner approval
          </div>
        )}

        {/* User actions */}
        {validAddress && !isAlreadyListed && !hasPendingRequest && (
          <button
            onClick={handleRequest}
            disabled={!isConnected || isRequesting}
            className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold uppercase text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {!isConnected
              ? "connect wallet to request"
              : isRequesting
                ? "submitting..."
                : "request listing"}
          </button>
        )}

        {requestSuccess && (
          <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm font-bold text-green-400 border border-green-500/20">
            listing request submitted. the owner will review your token.
          </div>
        )}
        {requestError && (
          <div className="rounded-lg bg-red-600/10 p-3 text-sm text-red-400 border border-red-500/20">
            {requestError.message.slice(0, 200)}
          </div>
        )}

        {/* Owner actions */}
        {isOwner && validAddress && hasPendingRequest && !isAlreadyListed && (
          <div className="space-y-2 rounded-lg bg-violet-600/5 p-4 border border-violet-500/20">
            <p className="text-xs font-bold uppercase text-violet-400">owner actions</p>
            <p className="text-xs text-zinc-500">
              Requested by: <span className="font-mono text-zinc-400">{(existingRequest as string).slice(0, 6)}...{(existingRequest as string).slice(-4)}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-bold uppercase text-white hover:bg-green-500 disabled:opacity-50 transition-colors"
              >
                {isApproving ? "approving..." : "approve (50 S toll)"}
              </button>
              <button
                onClick={handleReject}
                disabled={isRejecting}
                className="flex-1 rounded-lg bg-red-600/20 py-2.5 text-sm font-bold uppercase text-red-400 hover:bg-red-600/30 border border-red-500/30 disabled:opacity-50 transition-colors"
              >
                {isRejecting ? "rejecting..." : "reject"}
              </button>
            </div>
            {approveSuccess && (
              <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm font-bold text-green-400 border border-green-500/20">
                token approved and listed as a spoke
              </div>
            )}
            {approveError && (
              <div className="rounded-lg bg-red-600/10 p-3 text-sm text-red-400 border border-red-500/20">
                {approveError.message.slice(0, 200)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listed Tokens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase text-white">
            listed tokens <span className="text-violet-400">({count})</span>
          </h2>
          <Link
            href="/explore"
            className="text-xs font-bold uppercase text-violet-400 hover:text-violet-300 transition-colors"
          >
            view all spokes
          </Link>
        </div>
        <div className="space-y-2">
          {Array.from({ length: count }, (_, i) => (
            <ListedTokenRow key={i} index={i} />
          ))}
          {count === 0 && (
            <p className="text-center text-sm text-zinc-600 py-8">
              no tokens listed yet
            </p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="rounded-lg bg-zinc-800/30 p-4 border border-zinc-700/30">
        <h3 className="text-sm font-bold uppercase text-zinc-400 mb-2">how it works</h3>
        <ol className="list-decimal list-inside space-y-1 text-xs text-zinc-500">
          <li>Paste any ERC-20 contract address on Sonic</li>
          <li>Submit a listing request (costs only gas)</li>
          <li>The protocol owner reviews the contract for safety</li>
          <li>Once approved, the token gets a HEDGE-paired bonding curve spoke</li>
          <li>Anyone can trade the token through Hedgehog Protocol</li>
        </ol>
      </div>
    </div>
  );
}
