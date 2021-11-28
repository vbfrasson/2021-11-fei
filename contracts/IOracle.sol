//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/// @title interfact to interact with Collateralization Oracle
/// @author elee
interface IOracle {
    function pcvStats()
        external
        returns (
            uint256,
            uint256,
            int256,
            bool
        );
}
