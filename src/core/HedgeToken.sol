// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "solady/tokens/ERC20.sol";
import {Ownable} from "solady/auth/Ownable.sol";

/// @title HedgeToken
/// @notice ERC-20 token with a fixed max supply and controlled minting.
///         Only the designated minter (HedgehogCore) can mint new tokens.
contract HedgeToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18; // 1 billion tokens

    address public minter;

    error MaxSupplyExceeded();
    error NotMinter();
    error ZeroAddress();

    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    constructor(address _owner) {
        _initializeOwner(_owner);
    }

    function name() public pure override returns (string memory) {
        return "Hedgehog";
    }

    function symbol() public pure override returns (string memory) {
        return "HEDGE";
    }

    /// @notice Set the minter address. Only callable by the owner.
    /// @param _minter The address of the HedgehogCore contract.
    function setMinter(address _minter) external onlyOwner {
        if (_minter == address(0)) revert ZeroAddress();
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    /// @notice Mint tokens. Only callable by the minter.
    /// @param to Recipient of the minted tokens.
    /// @param amount Amount of tokens to mint (18 decimals).
    function mint(address to, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }

    /// @notice Burn tokens from the caller's balance.
    /// @param amount Amount of tokens to burn.
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
