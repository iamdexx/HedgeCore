import { http, fallback } from "wagmi";
import { type Chain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

export const sonic: Chain = {
  id: 146,
  name: "Sonic",
  nativeCurrency: { name: "Sonic", symbol: "S", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.soniclabs.com"] },
  },
  blockExplorers: {
    default: { name: "SonicScan", url: "https://sonicscan.org" },
  },
};

export const sonicTestnet: Chain = {
  id: 64165,
  name: "Sonic Testnet",
  nativeCurrency: { name: "Sonic", symbol: "S", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.soniclabs.com"] },
  },
  blockExplorers: {
    default: { name: "SonicScan Testnet", url: "https://testnet.sonicscan.org" },
  },
  testnet: true,
};

export const localhost: Chain = {
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
};

const networkEnv = process.env.NEXT_PUBLIC_NETWORK ?? "anvil";
const chains =
  networkEnv === "testnet"
    ? [sonicTestnet] as const
    : networkEnv === "anvil"
      ? [localhost] as const
      : [sonic] as const;

export const config = getDefaultConfig({
  appName: "Hedgehog Protocol",
  projectId: "hedgehog-protocol",
  chains: chains as any,
  transports: {
    [sonic.id]: fallback([
      http("https://rpc.soniclabs.com"),
      http("https://sonic-rpc.publicnode.com"),
    ]),
    [sonicTestnet.id]: http("https://rpc.testnet.soniclabs.com"),
    [localhost.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
