"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { CONTRACTS, HEDGEHOG_CORE_ABI, COMBO_WRAPPER_ABI } from "@/config/contracts";
import { ImageUpload } from "@/components/ImageUpload";
import { uploadJsonToIPFS, hasPinataConfig } from "@/lib/ipfs";

const DEFAULT_SLOPE = "100000000000000"; // 1e14

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
        deploying ur spoke...
      </div>
    );
  }
  if (isSuccess) {
    return (
      <div className="rounded-lg bg-green-600/10 p-3 text-center text-sm font-bold text-green-400 border border-green-500/20">
        spoke launched. real ERC-20 deployed. go check explore.
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

function FeatureCheckbox({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 hover:border-violet-500/50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-700 text-violet-500 focus:ring-violet-500 accent-violet-500"
      />
      <div>
        <span className="text-sm font-bold text-white">{label}</span>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
    </label>
  );
}

export default function LaunchPage() {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [github, setGithub] = useState("");
  const [slope, setSlope] = useState(DEFAULT_SLOPE);
  const [buildingMetadata, setBuildingMetadata] = useState(false);

  // Feature toggles
  const [referralEnabled, setReferralEnabled] = useState(false);
  const [referralBps, setReferralBps] = useState("200"); // 2% default
  const [vestingEnabled, setVestingEnabled] = useState(false);
  const [vestingDays, setVestingDays] = useState("7"); // 7 days default

  const { writeContract, isPending, isSuccess, error } = useWriteContract();

  const { data: rawToll, isLoading: tollLoading } = useReadContract({
    address: CONTRACTS.hedgehogCore,
    abi: HEDGEHOG_CORE_ABI,
    functionName: "toll",
  });
  const tollAmount = rawToll as bigint | undefined;

  async function handleLaunch() {
    if (!name || !symbol) return;

    let metadataURI = "";

    if (imageUri || description || twitter || telegram || github) {
      const metadata: Record<string, unknown> = {
        name,
        symbol: symbol.toUpperCase(),
        description: description || `${name} — launched on sonicpump.meme`,
      };
      if (imageUri) metadata.image = imageUri;

      const links: Record<string, string> = {};
      if (twitter) links.twitter = twitter.startsWith("@") ? `https://x.com/${twitter.slice(1)}` : twitter;
      if (telegram) links.telegram = telegram.startsWith("@") ? `https://t.me/${telegram.slice(1)}` : telegram;
      if (github) links.github = github;
      if (Object.keys(links).length > 0) metadata.links = links;

      if (hasPinataConfig()) {
        setBuildingMetadata(true);
        try {
          metadataURI = await uploadJsonToIPFS(metadata);
        } catch {
          metadataURI = "";
        } finally {
          setBuildingMetadata(false);
        }
      }
    }

    const vestingDuration = vestingEnabled ? BigInt(parseInt(vestingDays) * 86400) : BigInt(0);
    const refBps = referralEnabled ? BigInt(parseInt(referralBps)) : BigInt(0);

    writeContract({
      address: CONTRACTS.comboWrapper,
      abi: COMBO_WRAPPER_ABI,
      functionName: "launchSpoke",
      args: [
        {
          name,
          symbol: symbol.toUpperCase(),
          slope: BigInt(slope),
          metadataURI,
          referralEnabled,
          referralBps: refBps,
          vestingEnabled,
          vestingDuration,
        },
      ],
      value: tollAmount ?? BigInt(0),
    });
  }

  const isLaunching = isPending || buildingMetadata;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <h1 className="glow-text mb-2 text-2xl font-black uppercase text-white sm:text-3xl">
        launch a spoke
      </h1>
      <p className="mb-6 text-zinc-500 sm:mb-8">
        create a real ERC-20 token backed by{" "}
        <span className="inline-flex items-center gap-1">
          <Image src="/hedge-48.png" alt="" width={16} height={16} className="inline rounded-full" />
          <span className="font-bold text-white">$HEDGE</span>
        </span>
        . toll is{" "}
        <span className="font-bold text-white">
          {tollLoading ? "..." : tollAmount ? formatEther(tollAmount) : "\u2014"} $S
        </span>
        . pick ur features.
      </p>

      <div className="degen-card !p-5 sm:!p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
              token name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              placeholder="based hedgehog"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
              ticker
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white uppercase font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
              placeholder="BHOG"
              maxLength={10}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
              description{" "}
              <span className="text-zinc-700">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none resize-none"
              placeholder="the most based hedgehog on sonic"
              rows={2}
              maxLength={280}
            />
          </div>

          <ImageUpload imageUri={imageUri} onImageUri={setImageUri} />

          {/* social links */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-3 text-xs font-bold uppercase text-zinc-500">
              socials <span className="text-zinc-700">(optional)</span>
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700">
                  <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </span>
                <input
                  type="text"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="@yourtoken"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700">
                  <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </span>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="@yourgroup or t.me/yourgroup"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-zinc-800 border border-zinc-700">
                  <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </span>
                <input
                  type="text"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
                  placeholder="github.com/yourproject"
                />
              </div>
            </div>
          </div>

          {/* Token features */}
          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-3 text-xs font-bold uppercase text-zinc-500">
              token features <span className="text-zinc-700">(pick ur power-ups)</span>
            </p>
            <div className="space-y-2">
              <FeatureCheckbox
                checked={referralEnabled}
                onChange={setReferralEnabled}
                label="Referral Rewards"
                description="Referrers receive a % of spoke tokens when their link gets used"
              />
              {referralEnabled && (
                <div className="ml-7 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    value={(parseInt(referralBps) / 100).toString()}
                    onChange={(e) => setReferralBps((parseFloat(e.target.value) * 100).toString())}
                    className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                  <span className="text-xs text-zinc-500">% referral cut (max 5%)</span>
                </div>
              )}

              <FeatureCheckbox
                checked={vestingEnabled}
                onChange={setVestingEnabled}
                label="Vesting Lock"
                description="Buyers' tokens locked for X days after purchase (anti-dump)"
              />
              {vestingEnabled && (
                <div className="ml-7 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={vestingDays}
                    onChange={(e) => setVestingDays(e.target.value)}
                    className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                  <span className="text-xs text-zinc-500">days lock (max 30)</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
              curve slope{" "}
              <span className="text-zinc-700">(advanced, dont touch)</span>
            </label>
            <input
              type="text"
              value={slope}
              onChange={(e) => setSlope(e.target.value)}
              className="w-full rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-700">
              higher slope = steeper price curve. default: 1e14.
            </p>
          </div>

          {!isConnected ? (
            <p className="text-center text-sm font-bold text-zinc-600">
              connect wallet to launch anon
            </p>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={isLaunching || !name || !symbol}
              className="w-full rounded-lg bg-violet-600 py-3 text-sm font-bold uppercase text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 border border-violet-500/30"
            >
              {buildingMetadata
                ? "pinning metadata to ipfs..."
                : isPending
                  ? "confirming..."
                  : `launch for ${tollAmount ? formatEther(tollAmount) : "\u2014"} S`}
            </button>
          )}

          <TxStatus isPending={isPending} isSuccess={isSuccess} error={error} />
        </div>
      </div>

      <div className="degen-card mt-6 sm:mt-8 !bg-zinc-900/30">
        <h3 className="text-sm font-bold uppercase text-zinc-400">
          what happens when u launch
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-500">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">1</span>
            u pay <strong className="text-zinc-300">{tollAmount ? formatEther(tollAmount) : "\u2014"} $S</strong> as the toll
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">2</span>
            a real ERC-20 token is deployed (shows up in MetaMask)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">3</span>
            50% toll → treasury HEDGE, 50% → permanent LP (burned forever)
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">4</span>
            ur spoke starts on a bonding curve. price goes up with buys
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-xs font-black text-violet-400 border border-violet-500/20">5</span>
            features (referral, vesting) are locked per token at launch
          </li>
        </ul>
      </div>
    </div>
  );
}
