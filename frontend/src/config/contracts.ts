// Contract addresses per network
const ADDRESSES = {
  // Local Anvil deployment
  anvil: {
    hedgeToken: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed" as `0x${string}`,
    hedgehogCore: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c" as `0x${string}`,
    hedgehogRouter: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d" as `0x${string}`,
  },
  // Sonic testnet — update after testnet deployment
  testnet: {
    hedgeToken: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    hedgehogCore: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    hedgehogRouter: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  // Sonic mainnet — deployed 2026-05-10
  mainnet: {
    hedgeToken: "0x5cccEbCb0C0af721a6539aFDa1628EeaAF7d6C5c" as `0x${string}`,
    hedgehogCore: "0x985a53B9B82eF766E69Fd7Da49E4d53e1a13A27e" as `0x${string}`,
    hedgehogRouter: "0xB09fb21bA329F3318101A9C6C454080b6D2abbB2" as `0x${string}`,
  },
} as const;

const network = process.env.NEXT_PUBLIC_NETWORK ?? "anvil";
export const CONTRACTS = ADDRESSES[network as keyof typeof ADDRESSES] ?? ADDRESSES.anvil;

// USDC address on Sonic mainnet (Circle native, 6 decimals)
export const USDC_ADDRESS = "0x29219dd400f2Bf60E5a23d13Be72B486D4038894" as `0x${string}`;
export const USDC_DECIMALS = 6;

// Minimal ERC20 ABI for USDC interactions
export const ERC20_ABI = [
  {
    "type": "function",
    "name": "approve",
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [{"name": "owner", "type": "address"}, {"name": "spender", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  }
] as const;

export const HEDGE_TOKEN_ABI = [
  {
    "type": "function",
    "name": "MAX_SUPPLY",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address"
      },
      {
        "name": "spender",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "result",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "owner",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "result",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "result",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  }
] as const;

export const HEDGEHOG_CORE_ABI = [
  {
    "type": "function",
    "name": "GRADUATION_THRESHOLD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SUNSET_THRESHOLD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accumulatedFees",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "crankPOL",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "feeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getHubPrice",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpokeBalance",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "account",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpokeCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpokeInfo",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "name_",
        "type": "string"
      },
      {
        "name": "symbol_",
        "type": "string"
      },
      {
        "name": "metadataURI_",
        "type": "string"
      },
      {
        "name": "supply_",
        "type": "uint256"
      },
      {
        "name": "reserve_",
        "type": "uint256"
      },
      {
        "name": "slope_",
        "type": "uint256"
      },
      {
        "name": "graduated_",
        "type": "bool"
      },
      {
        "name": "creator_",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpokeState",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "supply",
            "type": "uint256"
          },
          {
            "name": "hedgeReserve",
            "type": "uint256"
          },
          {
            "name": "slope",
            "type": "uint256"
          },
          {
            "name": "graduated",
            "type": "bool"
          },
          {
            "name": "createdAtBlock",
            "type": "uint64"
          },
          {
            "name": "creator",
            "type": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSpotPrice",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTWAP",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hubBuyHedge",
    "inputs": [
      {
        "name": "minHedgeOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "hubReserveHedge",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hubReserveS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hubSellHedge",
    "inputs": [
      {
        "name": "hedgeAmount",
        "type": "uint256"
      },
      {
        "name": "minSOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "launchSpoke",
    "inputs": [
      {
        "name": "config",
        "type": "tuple",
        "components": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "slope",
            "type": "uint256"
          },
          {
            "name": "metadataURI",
            "type": "string"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "minSpokeSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "spokeAllowance",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "owner_",
        "type": "address"
      },
      {
        "name": "spender",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "spokeApprove",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "spokeBalances",
    "inputs": [
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "spokeBuy",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "hedgeAmount",
        "type": "uint256"
      },
      {
        "name": "minTokensOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "spokeCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "spokeSell",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "tokenAmount",
        "type": "uint256"
      },
      {
        "name": "minHedgeOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "spokeTransfer",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "spokeTransferFrom",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "from",
        "type": "address"
      },
      {
        "name": "to",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sunsetSpoke",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "toll",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "treasury",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hubK",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "equityRateBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "HubSwap",
    "inputs": [
      {
        "name": "trader",
        "type": "address",
        "indexed": true
      },
      {
        "name": "isBuyHedge",
        "type": "bool",
        "indexed": false
      },
      {
        "name": "amountIn",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "amountOut",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "POLBurn",
    "inputs": [
      {
        "name": "hedgeBurned",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "sLpBurned",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeBuy",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true
      },
      {
        "name": "hedgeIn",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "tokensOut",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeGraduated",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "reserve",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeLaunched",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true
      },
      {
        "name": "name",
        "type": "string",
        "indexed": false
      },
      {
        "name": "symbol",
        "type": "string",
        "indexed": false
      },
      {
        "name": "slope",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeSell",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true
      },
      {
        "name": "tokensIn",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "hedgeOut",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeSunset",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "reserveReleased",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SpokeTransfer",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TollCollected",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256",
        "indexed": true
      },
      {
        "name": "tollAmount",
        "type": "uint256",
        "indexed": false
      },
      {
        "name": "equityMinted",
        "type": "uint256",
        "indexed": false
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BelowMinSpokeSupply",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EOAOnlyPeriod",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientAllowance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientOutput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientSpokeBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientToll",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SameBlockTrade",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SlippageExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SlopeOutOfBounds",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpokeAlreadySunset",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpokeNotAtFloor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SpokeNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SunsetTooEarly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "function",
    "name": "getERC20HubPool",
    "inputs": [{"name": "quoteToken", "type": "address"}],
    "outputs": [
      {"name": "reserveQuote", "type": "uint256"},
      {"name": "reserveHedge", "type": "uint256"},
      {"name": "k", "type": "uint256"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getERC20HubPrice",
    "inputs": [{"name": "quoteToken", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getERC20PoolTokens",
    "inputs": [],
    "outputs": [{"name": "", "type": "address[]"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getERC20HubTWAP",
    "inputs": [{"name": "quoteToken", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hubBuyHedgeERC20",
    "inputs": [
      {"name": "quoteToken", "type": "address"},
      {"name": "quoteAmount", "type": "uint256"},
      {"name": "minHedgeOut", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hubSellHedgeERC20",
    "inputs": [
      {"name": "quoteToken", "type": "address"},
      {"name": "hedgeAmount", "type": "uint256"},
      {"name": "minQuoteOut", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ERC20HubSwap",
    "inputs": [
      {"name": "quoteToken", "type": "address", "indexed": true},
      {"name": "trader", "type": "address", "indexed": true},
      {"name": "isBuyHedge", "type": "bool", "indexed": false},
      {"name": "amountIn", "type": "uint256", "indexed": false},
      {"name": "amountOut", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ERC20HubInitialized",
    "inputs": [
      {"name": "quoteToken", "type": "address", "indexed": true},
      {"name": "hedgeAmount", "type": "uint256", "indexed": false},
      {"name": "quoteAmount", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "PoolNotInitialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PoolAlreadyInitialized",
    "inputs": []
  }
] as const;

export const HEDGEHOG_ROUTER_ABI = [
  {
    "type": "function",
    "name": "buyMemeWithS",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "minTokensOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "core",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "crankPOL",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "hedgeToken",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "launchSpoke",
    "inputs": [
      {
        "name": "config",
        "type": "tuple",
        "components": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "slope",
            "type": "uint256"
          },
          {
            "name": "metadataURI",
            "type": "string"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "sellMemeForS",
    "inputs": [
      {
        "name": "spokeId",
        "type": "uint256"
      },
      {
        "name": "tokenAmount",
        "type": "uint256"
      },
      {
        "name": "minSOut",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "buyMemeWithERC20",
    "inputs": [
      {"name": "quoteToken", "type": "address"},
      {"name": "quoteAmount", "type": "uint256"},
      {"name": "spokeId", "type": "uint256"},
      {"name": "minTokensOut", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sellMemeForERC20",
    "inputs": [
      {"name": "quoteToken", "type": "address"},
      {"name": "spokeId", "type": "uint256"},
      {"name": "tokenAmount", "type": "uint256"},
      {"name": "minQuoteOut", "type": "uint256"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "InsufficientOutput",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  }
] as const;
