// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IHedgehogCore} from "../interfaces/IHedgehogCore.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/// @title TokenListingWrapper
/// @notice Permissionless listing of existing ERC-20 tokens as spokes on
///         Hedgehog Protocol, with owner-gated approval and automatic seed
///         liquidity. Blue-chip tokens can be batch-listed by the owner;
///         community tokens require owner approval after request.
contract TokenListingWrapper is Ownable {
    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    IHedgehogCore public immutable core;
    address public immutable hedgeToken;

    /// @notice HEDGE amount used to seed each spoke pool after creation.
    uint256 public seedAmount = 1e18; // 1 HEDGE default (~few cents)

    /// @notice Default bonding curve slope for listed tokens.
    uint256 public defaultSlope = 1e16;

    /// @dev token address => spokeId (0 means not listed since spokeId starts at 0,
    ///      so we use a separate mapping for existence)
    mapping(address => uint256) public tokenSpokeId;
    mapping(address => bool) public isListed;

    /// @dev Pending listing requests: token => requester
    mapping(address => address) public listingRequests;

    /// @dev All listed token addresses for enumeration
    address[] public listedTokens;

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    event TokenListed(address indexed token, uint256 indexed spokeId, string name, string symbol);
    event ListingRequested(address indexed token, address indexed requester);
    event ListingRejected(address indexed token);
    event SeedAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event DefaultSlopeUpdated(uint256 oldSlope, uint256 newSlope);

    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error AlreadyListed();
    error NotRequested();
    error InvalidToken();

    // -------------------------------------------------------------------------
    //  Constructor
    // -------------------------------------------------------------------------

    constructor(address _core, address _hedgeToken) {
        _initializeOwner(msg.sender);
        core = IHedgehogCore(_core);
        hedgeToken = _hedgeToken;
    }

    // -------------------------------------------------------------------------
    //  Owner: Batch-list blue chips (no approval needed)
    // -------------------------------------------------------------------------

    /// @notice List multiple tokens in a single transaction. Owner-only.
    ///         Pays the toll for each spoke and seeds with HEDGE.
    /// @param tokens Array of ERC-20 addresses to list.
    function batchListTokens(address[] calldata tokens) external payable onlyOwner {
        uint256 tollPerSpoke = _getToll();
        uint256 totalToll = tollPerSpoke * tokens.length;
        require(msg.value >= totalToll, "Insufficient S for tolls");

        // Ensure contract has enough HEDGE for seeding
        uint256 totalSeed = seedAmount * tokens.length;
        SafeTransferLib.safeTransferFrom(hedgeToken, msg.sender, address(this), totalSeed);
        SafeTransferLib.safeApprove(hedgeToken, address(core), totalSeed);

        for (uint256 i; i < tokens.length; ++i) {
            _listToken(tokens[i], tollPerSpoke);
        }

        // Refund excess S
        uint256 excess = msg.value - totalToll;
        if (excess > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, excess);
        }
    }

    // -------------------------------------------------------------------------
    //  Community: Request listing → Owner approves
    // -------------------------------------------------------------------------

    /// @notice Request a token to be listed. Anyone can call.
    /// @param token The ERC-20 address to request.
    function requestListing(address token) external {
        if (isListed[token]) revert AlreadyListed();
        if (token == address(0)) revert InvalidToken();
        listingRequests[token] = msg.sender;
        emit ListingRequested(token, msg.sender);
    }

    /// @notice Approve a pending listing request. Owner-only.
    ///         Owner must send S for the toll and have approved HEDGE for seeding.
    /// @param token The token to approve and list.
    function approveListing(address token) external payable onlyOwner {
        if (listingRequests[token] == address(0)) revert NotRequested();
        if (isListed[token]) revert AlreadyListed();

        uint256 tollPerSpoke = _getToll();
        require(msg.value >= tollPerSpoke, "Insufficient S for toll");

        SafeTransferLib.safeTransferFrom(hedgeToken, msg.sender, address(this), seedAmount);
        SafeTransferLib.safeApprove(hedgeToken, address(core), seedAmount);

        _listToken(token, tollPerSpoke);
        delete listingRequests[token];

        uint256 excess = msg.value - tollPerSpoke;
        if (excess > 0) {
            SafeTransferLib.safeTransferETH(msg.sender, excess);
        }
    }

    /// @notice Reject a pending listing request. Owner-only.
    /// @param token The token to reject.
    function rejectListing(address token) external onlyOwner {
        if (listingRequests[token] == address(0)) revert NotRequested();
        delete listingRequests[token];
        emit ListingRejected(token);
    }

    // -------------------------------------------------------------------------
    //  Config
    // -------------------------------------------------------------------------

    /// @notice Update the HEDGE seed amount per pool.
    function setSeedAmount(uint256 newAmount) external onlyOwner {
        emit SeedAmountUpdated(seedAmount, newAmount);
        seedAmount = newAmount;
    }

    /// @notice Update the default bonding curve slope.
    function setDefaultSlope(uint256 newSlope) external onlyOwner {
        emit DefaultSlopeUpdated(defaultSlope, newSlope);
        defaultSlope = newSlope;
    }

    // -------------------------------------------------------------------------
    //  Views
    // -------------------------------------------------------------------------

    /// @notice Get the total number of listed tokens.
    function listedTokenCount() external view returns (uint256) {
        return listedTokens.length;
    }

    /// @notice Get the spoke ID for a listed token.
    function getSpokeId(address token) external view returns (uint256) {
        require(isListed[token], "Token not listed");
        return tokenSpokeId[token];
    }

    // -------------------------------------------------------------------------
    //  Internal
    // -------------------------------------------------------------------------

    function _listToken(address token, uint256 tollAmount) internal {
        if (isListed[token]) revert AlreadyListed();
        if (token == address(0)) revert InvalidToken();

        // Read token metadata for spoke naming
        string memory name = _tryGetName(token);
        string memory symbol = _tryGetSymbol(token);

        IHedgehogCore.SpokeConfig memory config = IHedgehogCore.SpokeConfig({
            name: name,
            symbol: symbol,
            slope: defaultSlope,
            metadataURI: ""
        });

        // Launch spoke (pays toll in S)
        core.launchSpoke{value: tollAmount}(config);

        // The spoke ID is spokeCount - 1 after launch
        uint256 spokeId = core.getSpokeCount() - 1;

        // Seed the pool with a small HEDGE buy
        if (seedAmount > 0) {
            core.spokeBuy(spokeId, seedAmount, 0);
        }

        // Record listing
        tokenSpokeId[token] = spokeId;
        isListed[token] = true;
        listedTokens.push(token);

        emit TokenListed(token, spokeId, name, symbol);
    }

    function _getToll() internal view returns (uint256) {
        // Read toll from HedgehogCore — it's a public variable
        // We call it via low-level since we only have the interface
        (bool ok, bytes memory data) = address(core).staticcall(
            abi.encodeWithSignature("toll()")
        );
        require(ok && data.length >= 32, "Failed to read toll");
        return abi.decode(data, (uint256));
    }

    function _tryGetName(address token) internal view returns (string memory) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("name()")
        );
        if (ok && data.length > 0) {
            return abi.decode(data, (string));
        }
        return "Unknown Token";
    }

    function _tryGetSymbol(address token) internal view returns (string memory) {
        (bool ok, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("symbol()")
        );
        if (ok && data.length > 0) {
            return abi.decode(data, (string));
        }
        return "???";
    }

    receive() external payable {}
}
