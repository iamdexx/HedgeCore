// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title TWAPOracle
/// @notice Ring-buffer TWAP oracle for the HEDGE/S hub pool.
///         Stores cumulative price observations and computes time-weighted
///         average price over a configurable window.
library TWAPOracle {
    struct Observation {
        uint64 blockNumber;
        uint64 timestamp;
        uint128 cumulativePrice; // cumulative price * time delta (truncated to 128 bits)
    }

    struct OracleState {
        Observation[1800] observations; // ring buffer (~30 min at 1s blocks)
        uint16 index; // current write position
        uint16 cardinality; // number of populated observations
        uint128 lastCumulativePrice;
        uint64 lastTimestamp;
    }

    /// @notice Write a new price observation.
    /// @param state The oracle state storage reference.
    /// @param price Current spot price (WAD).
    function write(OracleState storage state, uint256 price) internal {
        uint64 ts = uint64(block.timestamp);
        uint64 bn = uint64(block.number);

        uint64 elapsed = state.lastTimestamp > 0 ? ts - state.lastTimestamp : 0;
        uint128 cumPrice = state.lastCumulativePrice + uint128(price) * uint128(elapsed);

        uint16 idx = state.index;
        state.observations[idx] = Observation({
            blockNumber: bn,
            timestamp: ts,
            cumulativePrice: cumPrice
        });

        state.lastCumulativePrice = cumPrice;
        state.lastTimestamp = ts;
        state.index = (idx + 1) % 1800;
        if (state.cardinality < 1800) {
            state.cardinality++;
        }
    }

    /// @notice Compute the TWAP over the last `window` observations.
    /// @param state The oracle state storage reference.
    /// @param window Number of observations to look back (max = cardinality - 1).
    /// @return twap The time-weighted average price (WAD).
    function consult(OracleState storage state, uint16 window)
        internal
        view
        returns (uint256 twap)
    {
        if (state.cardinality < 2 || window == 0) return 0;
        if (window >= state.cardinality) window = state.cardinality - 1;

        uint16 latestIdx =
            state.index == 0 ? state.cardinality - 1 : state.index - 1;
        uint16 oldestIdx =
            (latestIdx + 1800 - window) % 1800;

        Observation memory latest = state.observations[latestIdx];
        Observation memory oldest = state.observations[oldestIdx];

        uint128 cumDiff = latest.cumulativePrice - oldest.cumulativePrice;
        uint64 timeDiff = latest.timestamp - oldest.timestamp;

        if (timeDiff == 0) return 0;
        twap = uint256(cumDiff) / uint256(timeDiff);
    }
}
