"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "hub" },
  { href: "/trade", label: "trade" },
  { href: "/explore", label: "explore" },
  { href: "/launch", label: "launch" },
  { href: "/graduate", label: "pro dex" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b-2 border-zinc-700 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/hedge-48.png"
              alt="HEDGE"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-xl font-black tracking-tight text-white uppercase">
              sonic<span className="text-violet-400">pump</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wide transition-colors ${
                    isActive
                      ? "bg-violet-600/20 text-violet-400 border border-violet-500/30"
                      : "text-zinc-500 hover:bg-zinc-800/50 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ConnectButton />
          </div>
          <div className="sm:hidden">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <button
                    onClick={connected ? openAccountModal : openConnectModal}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white uppercase"
                  >
                    {connected ? `${account.displayName}` : "connect"}
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white md:hidden"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t-2 border-zinc-700 px-4 pb-4 pt-2 md:hidden">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-colors ${
                  isActive
                    ? "bg-violet-600/20 text-violet-400"
                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
