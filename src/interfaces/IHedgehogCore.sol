// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IHedgehogCore {
    // --- Structs ---

    struct SpokeConfig {
        string name;
        string symbol;
        uint256 slope; // bonding curve slope m (WAD)
        string metadataURI; // IPFS URI for image/description
    }

    struct SpokeState {
        uint256 supply; // current meme token supply (WAD)
        uint256 hedgeReserve; // HEDGE locked in the spoke
        uint256 slope; // bonding curve slope m (WAD)
        bool graduated; // true if reserve >= graduationThreshold
        uint64 createdAtBlock; // block number when spoke was created
        address creator;
    }

    // --- Events ---

    event SpokeLaunched(
        uint256 indexed spokeId,
        address indexed creator,
        string name,
        string symbol,
        uint256 slope
    );

    event SpokeBuy(
        uint256 indexed spokeId,
        address indexed buyer,
        uint256 hedgeIn,
        uint256 tokensOut
    );

    event SpokeSell(
        uint256 indexed spokeId,
        address indexed seller,
        uint256 tokensIn,
        uint256 hedgeOut
    );

    event SpokeGraduated(uint256 indexed spokeId, uint256 reserve);

    event TollCollected(uint256 indexed spokeId, uint256 tollAmount, uint256 equityMinted);

    event HubSwap(address indexed trader, bool isBuyHedge, uint256 amountIn, uint256 amountOut);

    event POLBurn(uint256 hedgeBurned, uint256 sLpBurned);

    event TollUpdated(uint256 oldToll, uint256 newToll);

    event EquityRateUpdated(uint256 oldRate, uint256 newRate);

    event FeeUpdated(uint256 oldFee, uint256 newFee);

    // --- Errors ---

    error InsufficientToll();
    error SpokeNotFound();
    error NotUnlocked();
    error AlreadyUnlocked();
    error SameBlockTrade();
    error EOAOnlyPeriod();
    error SlippageExceeded();
    error ZeroAmount();
    error SlopeOutOfBounds();
    error InsufficientOutput();

    // --- Core Functions ---

    function launchSpoke(SpokeConfig calldata config) external payable;

    function spokeBuy(uint256 spokeId, uint256 hedgeAmount, uint256 minTokensOut) external;

    function spokeSell(uint256 spokeId, uint256 tokenAmount, uint256 minHedgeOut) external;

    function hubBuyHedge(uint256 minHedgeOut) external payable;

    function hubSellHedge(uint256 hedgeAmount, uint256 minSOut) external;

    // --- View Functions ---

    function getSpokeState(uint256 spokeId) external view returns (SpokeState memory);

    function getSpokeCount() external view returns (uint256);

    function getSpotPrice(uint256 spokeId) external view returns (uint256);

    function getHubPrice() external view returns (uint256);

    function getTWAP() external view returns (uint256);
}
