// Contract addresses — update after deployment
export const CONTRACTS = {
  hedgeToken: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  hedgehogCore: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  hedgehogRouter: "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

export const HEDGE_TOKEN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

export const HEDGEHOG_CORE_ABI = [
  {
    type: "function",
    name: "getSpokeCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSpokeState",
    inputs: [{ name: "spokeId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "supply", type: "uint256" },
          { name: "hedgeReserve", type: "uint256" },
          { name: "slope", type: "uint256" },
          { name: "graduated", type: "bool" },
          { name: "createdAtBlock", type: "uint64" },
          { name: "creator", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSpokeBalance",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSpotPrice",
    inputs: [{ name: "spokeId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getHubPrice",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hubReserveS",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hubReserveHedge",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "toll",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "spokeBalances",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "spokeBuy",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "hedgeAmount", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "spokeSell",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
      { name: "minHedgeOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "launchSpoke",
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "slope", type: "uint256" },
          { name: "metadataURI", type: "string" },
        ],
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "spokeApprove",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "hubBuyHedge",
    inputs: [{ name: "minHedgeOut", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "hubSellHedge",
    inputs: [
      { name: "hedgeAmount", type: "uint256" },
      { name: "minSOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getTWAP",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "accumulatedFees",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const HEDGEHOG_ROUTER_ABI = [
  {
    type: "function",
    name: "buyMemeWithS",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sellMemeForS",
    inputs: [
      { name: "spokeId", type: "uint256" },
      { name: "tokenAmount", type: "uint256" },
      { name: "minSOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
] as const;
