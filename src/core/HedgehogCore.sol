// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "solady/auth/Ownable.sol";
import {ReentrancyGuard} from "solady/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

import {HedgeToken} from "./HedgeToken.sol";
import {BondingCurve} from "./libraries/BondingCurve.sol";
import {TWAPOracle} from "./libraries/TWAPOracle.sol";
import {IHedgehogCore} from "../interfaces/IHedgehogCore.sol";

/// @title HedgehogCore
/// @notice Singleton contract for the Hedgehog Protocol.
///         Manages the HEDGE/S hub pool (constant-product AMM),
///         spoke pools (linear bonding curves), toll booth revenue,
///         POL engine, and TWAP oracle.
contract HedgehogCore is IHedgehogCore, Ownable, ReentrancyGuard {
    using FixedPointMathLib for uint256;
    using TWAPOracle for TWAPOracle.OracleState;

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    uint256 public constant WAD = 1e18;
    uint256 public constant MAX_FEE_BPS = 500; // 5% max fee
    uint256 public constant GRADUATION_THRESHOLD = 50_000e18; // 50k HEDGE
    uint256 public constant EOA_PROTECTION_BLOCKS = 100;
    uint256 public constant EQUITY_RATE_PRECISION = 1e6; // 0.1% = 1000

    // -------------------------------------------------------------------------
    //  Immutables
    // -------------------------------------------------------------------------

    HedgeToken public immutable hedgeToken;

    // -------------------------------------------------------------------------
    //  Hub Pool State (HEDGE / S constant-product AMM)
    // -------------------------------------------------------------------------

    uint256 public hubReserveS; // native S balance in hub
    uint256 public hubReserveHedge; // HEDGE balance in hub
    uint256 public hubK; // invariant k = reserveS * reserveHedge

    // -------------------------------------------------------------------------
    //  Spoke State
    // -------------------------------------------------------------------------

    uint256 public spokeCount;

    struct SpokeData {
        string name;
        string symbol;
        string metadataURI;
        uint256 supply; // meme token total supply (virtual, tracked here)
        uint256 hedgeReserve; // HEDGE locked backing this spoke
        uint256 slope; // bonding curve slope m (WAD)
        bool graduated;
        uint64 createdAtBlock;
        address creator;
    }

    mapping(uint256 => SpokeData) internal _spokes;

    // spokeId => user => balance of the meme token
    mapping(uint256 => mapping(address => uint256)) public spokeBalances;

    // spokeId => owner => spender => allowance
    mapping(uint256 => mapping(address => mapping(address => uint256))) public spokeAllowances;

    // Anti-MEV: spokeId => user => last trade block
    mapping(bytes32 => uint256) public lastTradeBlock;

    // -------------------------------------------------------------------------
    //  Configuration (owner-adjustable)
    // -------------------------------------------------------------------------

    uint256 public toll = 50e18; // default 50 S (adjustable)
    uint256 public feeBps = 100; // 1% = 100 bps
    uint256 public equityRateBps = 1000; // 0.1% of remaining supply per launch
    uint256 public minSlope = 1e12; // minimum slope (WAD)
    uint256 public maxSlope = 1e22; // maximum slope (WAD)
    uint256 public minSpokeSupply = 10_000e18; // floor: 10,000 tokens
    address public treasury;

    // -------------------------------------------------------------------------
    //  POL Engine
    // -------------------------------------------------------------------------

    uint256 public accumulatedFees; // HEDGE fees pending burn
    uint256 public constant TWAP_DEVIATION_BPS = 1000; // 10%

    // -------------------------------------------------------------------------
    //  Oracle
    // -------------------------------------------------------------------------

    TWAPOracle.OracleState internal _oracle;

    // -------------------------------------------------------------------------
    //  Constructor
    // -------------------------------------------------------------------------

    constructor(address _owner, address _treasury, HedgeToken _hedgeToken) {
        _initializeOwner(_owner);
        treasury = _treasury;
        hedgeToken = _hedgeToken;
    }

    // -------------------------------------------------------------------------
    //  Hub Pool — Initialize
    // -------------------------------------------------------------------------

    /// @notice Seed the hub pool with initial liquidity. Called once.
    /// @param hedgeAmount Amount of HEDGE to deposit (must be pre-approved).
    function initializeHub(uint256 hedgeAmount) external payable onlyOwner {
        require(hubK == 0, "Already initialized");
        require(msg.value > 0 && hedgeAmount > 0, "Zero liquidity");

        SafeTransferLib.safeTransferFrom(
            address(hedgeToken), msg.sender, address(this), hedgeAmount
        );

        hubReserveS = msg.value;
        hubReserveHedge = hedgeAmount;
        hubK = hubReserveS * hubReserveHedge;

        _oracle.write(hedgeAmount.divWad(msg.value));
    }

    // -------------------------------------------------------------------------
    //  Hub Pool — Swap
    // -------------------------------------------------------------------------

    /// @notice Buy HEDGE with native S via the hub AMM.
    /// @param minHedgeOut Minimum HEDGE to receive (slippage protection).
    function hubBuyHedge(uint256 minHedgeOut) external payable nonReentrant {
        require(msg.value > 0, "Zero S");

        uint256 sIn = msg.value;
        uint256 hedgeOut = _getHubAmountOut(sIn, hubReserveS, hubReserveHedge);

        if (hedgeOut < minHedgeOut) revert SlippageExceeded();

        hubReserveS += sIn;
        hubReserveHedge -= hedgeOut;

        SafeTransferLib.safeTransfer(address(hedgeToken), msg.sender, hedgeOut);
        _oracle.write(hubReserveHedge.divWad(hubReserveS));

        emit HubSwap(msg.sender, true, sIn, hedgeOut);
    }

    /// @notice Sell HEDGE for native S via the hub AMM.
    /// @param hedgeAmount Amount of HEDGE to sell.
    /// @param minSOut Minimum S to receive (slippage protection).
    function hubSellHedge(uint256 hedgeAmount, uint256 minSOut) external nonReentrant {
        require(hedgeAmount > 0, "Zero HEDGE");

        uint256 sOut = _getHubAmountOut(hedgeAmount, hubReserveHedge, hubReserveS);

        if (sOut < minSOut) revert SlippageExceeded();

        SafeTransferLib.safeTransferFrom(
            address(hedgeToken), msg.sender, address(this), hedgeAmount
        );

        hubReserveHedge += hedgeAmount;
        hubReserveS -= sOut;

        SafeTransferLib.safeTransferETH(msg.sender, sOut);
        _oracle.write(hubReserveHedge.divWad(hubReserveS));

        emit HubSwap(msg.sender, false, hedgeAmount, sOut);
    }

    // -------------------------------------------------------------------------
    //  Spoke — Launch
    // -------------------------------------------------------------------------

    /// @notice Launch a new spoke (meme token) by paying the toll in native S.
    /// @param config The spoke configuration (name, symbol, slope, metadata).
    function launchSpoke(SpokeConfig calldata config) external payable nonReentrant {
        if (msg.value < toll) revert InsufficientToll();
        if (config.slope < minSlope || config.slope > maxSlope) revert SlopeOutOfBounds();

        uint256 spokeId = spokeCount++;
        uint256 tollAmount = msg.value;
        uint256 halfToll = tollAmount / 2;

        // --- 50% → Convert to HEDGE via hub pool → Treasury ---
        uint256 hedgeForTreasury = _getHubAmountOut(halfToll, hubReserveS, hubReserveHedge);
        hubReserveS += halfToll;
        hubReserveHedge -= hedgeForTreasury;
        SafeTransferLib.safeTransfer(address(hedgeToken), treasury, hedgeForTreasury);

        // --- 50% → Pair with minted HEDGE → burn into hub pool as LP ---
        uint256 sForLp = tollAmount - halfToll; // handles odd wei
        // Mint HEDGE proportional to the S being added, maintaining the ratio
        uint256 hedgeForLp = sForLp.mulWad(hubReserveHedge.divWad(hubReserveS));
        hedgeToken.mint(address(this), hedgeForLp);

        // Add to hub pool reserves (permanent liquidity — LP is "burned" by
        // having no LP token; the reserves simply grow with no way to withdraw)
        hubReserveS += sForLp;
        hubReserveHedge += hedgeForLp;
        hubK = hubReserveS * hubReserveHedge;

        // --- Equity mint: % of remaining supply → Treasury ---
        uint256 remaining = HedgeToken(address(hedgeToken)).MAX_SUPPLY()
            - hedgeToken.totalSupply();
        uint256 equityMint = remaining * equityRateBps / EQUITY_RATE_PRECISION;
        if (equityMint > 0) {
            hedgeToken.mint(treasury, equityMint);
        }

        // --- Register the spoke ---
        _spokes[spokeId] = SpokeData({
            name: config.name,
            symbol: config.symbol,
            metadataURI: config.metadataURI,
            supply: 0,
            hedgeReserve: 0,
            slope: config.slope,
            graduated: false,
            createdAtBlock: uint64(block.number),
            creator: msg.sender
        });

        _oracle.write(hubReserveHedge.divWad(hubReserveS));

        emit SpokeLaunched(spokeId, msg.sender, config.name, config.symbol, config.slope);
        emit TollCollected(spokeId, tollAmount, equityMint);
    }

    // -------------------------------------------------------------------------
    //  Spoke — Buy (mint meme tokens with HEDGE)
    // -------------------------------------------------------------------------

    /// @notice Buy meme tokens on a spoke's bonding curve by depositing HEDGE.
    /// @param spokeId The spoke to buy on.
    /// @param hedgeAmount Amount of HEDGE to spend.
    /// @param minTokensOut Minimum meme tokens to receive.
    function spokeBuy(uint256 spokeId, uint256 hedgeAmount, uint256 minTokensOut)
        external
        nonReentrant
    {
        if (hedgeAmount == 0) revert ZeroAmount();
        SpokeData storage spoke = _spokes[spokeId];
        if (spoke.slope == 0) revert SpokeNotFound();

        _enforceSameBlockLock(spokeId, msg.sender);
        _enforceEOAProtection(spoke.createdAtBlock);

        // Collect fee
        uint256 fee = hedgeAmount * feeBps / 10_000;
        uint256 netHedge = hedgeAmount - fee;
        accumulatedFees += fee;

        // Transfer HEDGE from buyer
        SafeTransferLib.safeTransferFrom(
            address(hedgeToken), msg.sender, address(this), hedgeAmount
        );

        // Calculate tokens via bonding curve
        uint256 tokensOut = BondingCurve.calculateBuyReturn(spoke.slope, spoke.supply, netHedge);
        if (tokensOut < minTokensOut) revert InsufficientOutput();

        // Update spoke state
        spoke.supply += tokensOut;
        spoke.hedgeReserve += netHedge;
        spokeBalances[spokeId][msg.sender] += tokensOut;

        // Check graduation
        if (!spoke.graduated && spoke.hedgeReserve >= GRADUATION_THRESHOLD) {
            spoke.graduated = true;
            emit SpokeGraduated(spokeId, spoke.hedgeReserve);
        }

        emit SpokeBuy(spokeId, msg.sender, hedgeAmount, tokensOut);
    }

    // -------------------------------------------------------------------------
    //  Spoke — Sell (burn meme tokens for HEDGE)
    // -------------------------------------------------------------------------

    /// @notice Sell meme tokens on a spoke's bonding curve to receive HEDGE.
    /// @param spokeId The spoke to sell on.
    /// @param tokenAmount Amount of meme tokens to sell.
    /// @param minHedgeOut Minimum HEDGE to receive.
    function spokeSell(uint256 spokeId, uint256 tokenAmount, uint256 minHedgeOut)
        external
        nonReentrant
    {
        if (tokenAmount == 0) revert ZeroAmount();
        SpokeData storage spoke = _spokes[spokeId];
        if (spoke.slope == 0) revert SpokeNotFound();
        require(spokeBalances[spokeId][msg.sender] >= tokenAmount, "Insufficient balance");

        _enforceSameBlockLock(spokeId, msg.sender);

        // Calculate HEDGE revenue via bonding curve
        uint256 grossHedge =
            BondingCurve.calculateSellRevenue(spoke.slope, spoke.supply, tokenAmount);

        // Collect fee
        uint256 fee = grossHedge * feeBps / 10_000;
        uint256 netHedge = grossHedge - fee;
        accumulatedFees += fee;

        if (netHedge < minHedgeOut) revert InsufficientOutput();

        // Enforce minimum supply floor
        if (spoke.supply - tokenAmount < minSpokeSupply) revert BelowMinSpokeSupply();

        // Update spoke state
        spoke.supply -= tokenAmount;
        spoke.hedgeReserve -= grossHedge;
        spokeBalances[spokeId][msg.sender] -= tokenAmount;

        // Transfer HEDGE to seller
        SafeTransferLib.safeTransfer(address(hedgeToken), msg.sender, netHedge);

        emit SpokeSell(spokeId, msg.sender, tokenAmount, netHedge);
    }

    // -------------------------------------------------------------------------
    //  Spoke — Transfer & Approval
    // -------------------------------------------------------------------------

    /// @notice Transfer meme tokens to another address.
    function spokeTransfer(uint256 spokeId, address to, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (spokeBalances[spokeId][msg.sender] < amount) revert InsufficientSpokeBalance();
        spokeBalances[spokeId][msg.sender] -= amount;
        spokeBalances[spokeId][to] += amount;
        emit SpokeTransfer(spokeId, msg.sender, to, amount);
    }

    /// @notice Transfer meme tokens on behalf of another address (requires allowance).
    function spokeTransferFrom(uint256 spokeId, address from, address to, uint256 amount)
        external
    {
        if (amount == 0) revert ZeroAmount();
        if (spokeBalances[spokeId][from] < amount) revert InsufficientSpokeBalance();

        uint256 allowed = spokeAllowances[spokeId][from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            spokeAllowances[spokeId][from][msg.sender] = allowed - amount;
        }

        spokeBalances[spokeId][from] -= amount;
        spokeBalances[spokeId][to] += amount;
        emit SpokeTransfer(spokeId, from, to, amount);
    }

    /// @notice Approve a spender to transfer meme tokens on your behalf.
    function spokeApprove(uint256 spokeId, address spender, uint256 amount) external {
        spokeAllowances[spokeId][msg.sender][spender] = amount;
        emit SpokeApproval(spokeId, msg.sender, spender, amount);
    }

    /// @notice Query spoke allowance.
    function spokeAllowance(uint256 spokeId, address owner_, address spender)
        external
        view
        returns (uint256)
    {
        return spokeAllowances[spokeId][owner_][spender];
    }

    // -------------------------------------------------------------------------
    //  POL Engine — Burn accumulated fees into hub LP
    // -------------------------------------------------------------------------

    /// @notice Cranks the POL engine: uses accumulated HEDGE fees to add
    ///         permanent liquidity to the hub pool. Anyone can call this.
    function crankPOL() external nonReentrant {
        uint256 fees = accumulatedFees;
        require(fees > 0, "No fees");

        // TWAP safety check: refuse if spot is >10% above TWAP
        uint256 twap = _oracle.consult(1800);
        if (twap > 0) {
            uint256 spot = hubReserveHedge.divWad(hubReserveS);
            uint256 maxSpot = twap * (10_000 + TWAP_DEVIATION_BPS) / 10_000;
            require(spot <= maxSpot, "Spot too high vs TWAP");
        }

        accumulatedFees = 0;

        // Sell half the HEDGE fees for S via the hub pool
        uint256 hedgeToSell = fees / 2;
        uint256 sOut = _getHubAmountOut(hedgeToSell, hubReserveHedge, hubReserveS);

        hubReserveHedge += hedgeToSell;
        hubReserveS -= sOut;

        // Add remaining HEDGE + acquired S as permanent liquidity
        uint256 hedgeForLp = fees - hedgeToSell;
        // Scale hedgeForLp down to match the S ratio
        uint256 hedgeNeeded = sOut.mulWad(hubReserveHedge.divWad(hubReserveS));
        if (hedgeNeeded < hedgeForLp) {
            hedgeForLp = hedgeNeeded;
        }

        hubReserveS += sOut;
        hubReserveHedge += hedgeForLp;
        hubK = hubReserveS * hubReserveHedge;

        _oracle.write(hubReserveHedge.divWad(hubReserveS));

        emit POLBurn(fees, sOut);
    }

    // -------------------------------------------------------------------------
    //  View Functions
    // -------------------------------------------------------------------------

    function getSpokeState(uint256 spokeId) external view returns (SpokeState memory) {
        SpokeData storage s = _spokes[spokeId];
        return SpokeState({
            supply: s.supply,
            hedgeReserve: s.hedgeReserve,
            slope: s.slope,
            graduated: s.graduated,
            createdAtBlock: s.createdAtBlock,
            creator: s.creator
        });
    }

    function getSpokeCount() external view returns (uint256) {
        return spokeCount;
    }

    function getSpotPrice(uint256 spokeId) external view returns (uint256) {
        SpokeData storage s = _spokes[spokeId];
        if (s.slope == 0) revert SpokeNotFound();
        return BondingCurve.spotPrice(s.slope, s.supply);
    }

    function getHubPrice() external view returns (uint256) {
        if (hubReserveS == 0) return 0;
        return hubReserveHedge.divWad(hubReserveS);
    }

    function getTWAP() external view returns (uint256) {
        return _oracle.consult(1800);
    }

    function getSpokeBalance(uint256 spokeId, address account)
        external
        view
        returns (uint256)
    {
        return spokeBalances[spokeId][account];
    }

    function getSpokeInfo(uint256 spokeId)
        external
        view
        returns (
            string memory name_,
            string memory symbol_,
            string memory metadataURI_,
            uint256 supply_,
            uint256 reserve_,
            uint256 slope_,
            bool graduated_,
            address creator_
        )
    {
        SpokeData storage s = _spokes[spokeId];
        return (
            s.name,
            s.symbol,
            s.metadataURI,
            s.supply,
            s.hedgeReserve,
            s.slope,
            s.graduated,
            s.creator
        );
    }

    // -------------------------------------------------------------------------
    //  Owner Config
    // -------------------------------------------------------------------------

    function setToll(uint256 _toll) external onlyOwner {
        emit TollUpdated(toll, _toll);
        toll = _toll;
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_FEE_BPS, "Fee too high");
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    function setEquityRateBps(uint256 _rate) external onlyOwner {
        emit EquityRateUpdated(equityRateBps, _rate);
        equityRateBps = _rate;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    function setSlopeBounds(uint256 _min, uint256 _max) external onlyOwner {
        require(_min < _max, "Invalid bounds");
        minSlope = _min;
        maxSlope = _max;
    }

    function setMinSpokeSupply(uint256 _minSupply) external onlyOwner {
        emit MinSpokeSupplyUpdated(minSpokeSupply, _minSupply);
        minSpokeSupply = _minSupply;
    }

    // -------------------------------------------------------------------------
    //  Internal — Hub AMM
    // -------------------------------------------------------------------------

    /// @dev Constant-product swap: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
    function _getHubAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        uint256 numerator = amountIn * reserveOut;
        uint256 denominator = reserveIn + amountIn;
        amountOut = numerator / denominator;
    }

    // -------------------------------------------------------------------------
    //  Internal — Security
    // -------------------------------------------------------------------------

    function _enforceSameBlockLock(uint256 spokeId, address trader) internal {
        bytes32 key = keccak256(abi.encodePacked(spokeId, trader));
        if (lastTradeBlock[key] == block.number) revert SameBlockTrade();
        lastTradeBlock[key] = block.number;
    }

    function _enforceEOAProtection(uint64 createdAtBlock) internal view {
        if (block.number < createdAtBlock + EOA_PROTECTION_BLOCKS) {
            if (msg.sender != tx.origin) revert EOAOnlyPeriod();
        }
    }

    // -------------------------------------------------------------------------
    //  Receive
    // -------------------------------------------------------------------------

    receive() external payable {}
}
