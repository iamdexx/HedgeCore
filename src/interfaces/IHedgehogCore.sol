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
        bool sunset; // true if spoke has been sunset (recycled)
        uint64 createdAtBlock; // block number when spoke was created
        uint64 lastSupplyChangeBlock; // last block where supply changed
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

    event ERC20HubSwap(
        address indexed quoteToken,
        address indexed trader,
        bool isBuyHedge,
        uint256 amountIn,
        uint256 amountOut
    );

    event ERC20HubInitialized(address indexed quoteToken, uint256 hedgeAmount, uint256 quoteAmount);

    event POLBurn(uint256 hedgeBurned, uint256 sLpBurned);

    event SpokeTransfer(
        uint256 indexed spokeId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event SpokeApproval(
        uint256 indexed spokeId,
        address indexed owner,
        address indexed spender,
        uint256 amount
    );

    event TollUpdated(uint256 oldToll, uint256 newToll);

    event EquityRateUpdated(uint256 oldRate, uint256 newRate);

    event FeeUpdated(uint256 oldFee, uint256 newFee);

    event MinSpokeSupplyUpdated(uint256 oldMin, uint256 newMin);

    event SpokeSunset(uint256 indexed spokeId, uint256 reserveReleased);

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
    error InsufficientAllowance();
    error InsufficientSpokeBalance();
    error BelowMinSpokeSupply();
    error SpokeAlreadySunset();
    error SpokeNotAtFloor();
    error SunsetTooEarly();
    error PoolNotInitialized();
    error PoolAlreadyInitialized();

    // --- Core Functions ---

    function launchSpoke(SpokeConfig calldata config) external payable;

    function spokeBuy(uint256 spokeId, uint256 hedgeAmount, uint256 minTokensOut) external;

    function spokeSell(uint256 spokeId, uint256 tokenAmount, uint256 minHedgeOut) external;

    function spokeTransfer(uint256 spokeId, address to, uint256 amount) external;

    function spokeTransferFrom(uint256 spokeId, address from, address to, uint256 amount) external;

    function spokeApprove(uint256 spokeId, address spender, uint256 amount) external;

    function spokeAllowance(uint256 spokeId, address owner_, address spender)
        external
        view
        returns (uint256);

    function hubBuyHedge(uint256 minHedgeOut) external payable;

    function hubSellHedge(uint256 hedgeAmount, uint256 minSOut) external;

    function hubBuyHedgeERC20(address quoteToken, uint256 quoteAmount, uint256 minHedgeOut) external;

    function hubSellHedgeERC20(address quoteToken, uint256 hedgeAmount, uint256 minQuoteOut) external;

    function sunsetSpoke(uint256 spokeId) external;

    // --- View Functions ---

    function getSpokeState(uint256 spokeId) external view returns (SpokeState memory);

    function getSpokeCount() external view returns (uint256);

    function getSpotPrice(uint256 spokeId) external view returns (uint256);

    function getHubPrice() external view returns (uint256);

    function getERC20HubPrice(address quoteToken) external view returns (uint256);

    function getTWAP() external view returns (uint256);

    function getSpokeBalance(uint256 spokeId, address account) external view returns (uint256);
}
