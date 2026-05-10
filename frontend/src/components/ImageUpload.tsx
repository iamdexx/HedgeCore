"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { uploadFileToIPFS, ipfsToHttp, hasPinataConfig } from "@/lib/ipfs";

interface ImageUploadProps {
  onImageUri: (uri: string) => void;
  imageUri: string;
}

export function ImageUpload({ onImageUri, imageUri }: ImageUploadProps) {
  const [mode, setMode] = useState<"upload" | "url">(hasPinataConfig() ? "upload" : "url");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const previewUrl = imageUri
    ? imageUri.startsWith("ipfs://")
      ? ipfsToHttp(imageUri)
      : imageUri
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("not an image ser");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("too big. max 10mb");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ipfsUri = await uploadFileToIPFS(file);
      onImageUri(ipfsUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleUrlSubmit() {
    if (!urlInput.trim()) return;
    setError(null);
    onImageUri(urlInput.trim());
    setUrlInput("");
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase text-zinc-500">
        token art
      </label>

      <div className="mb-3 flex gap-2">
        {hasPinataConfig() && (
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
              mode === "upload"
                ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                : "bg-zinc-800 text-zinc-600 border border-zinc-700"
            }`}
          >
            upload
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
            mode === "url"
              ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
              : "bg-zinc-800 text-zinc-600 border border-zinc-700"
          }`}
        >
          paste url
        </button>
      </div>

      {mode === "upload" ? (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-800/50 px-4 py-6 text-center text-sm font-bold text-zinc-500 hover:border-violet-500 hover:text-violet-400 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                pinning to ipfs...
              </span>
            ) : (
              "drop ur art here (max 10mb)"
            )}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            className="flex-1 rounded-lg border-2 border-zinc-700 bg-zinc-800 px-4 py-3 text-white font-bold placeholder-zinc-600 focus:border-violet-500 focus:outline-none"
            placeholder="ipfs://... or https://..."
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="rounded-lg bg-zinc-700 px-4 py-3 text-sm font-bold uppercase text-white hover:bg-zinc-600 disabled:opacity-50 border border-zinc-600"
          >
            set
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs font-bold text-red-400">{error}</p>
      )}

      {previewUrl && (
        <div className="mt-3 flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3 border border-zinc-700">
          <Image
            src={previewUrl}
            alt="Token art preview"
            width={48}
            height={48}
            className="rounded-lg"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase text-green-400">art set</p>
            <p className="truncate text-xs text-zinc-600">{imageUri}</p>
          </div>
          <button
            type="button"
            onClick={() => onImageUri("")}
            className="text-xs font-bold text-zinc-600 hover:text-red-400"
          >
            remove
          </button>
        </div>
      )}
    </div>
  );
}
