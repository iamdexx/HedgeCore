import { http, createConfig } from "wagmi";
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

export const config = getDefaultConfig({
  appName: "Hedgehog Protocol",
  projectId: "hedgehog-protocol",
  chains: [sonic],
  transports: {
    [sonic.id]: http("https://rpc.soniclabs.com"),
  },
  ssr: true,
});
