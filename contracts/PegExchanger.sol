//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./IERC20.sol";

/// @title Contract to exchange RGT with TRIBE post-merger
/// @author elee
contract PegExchanger {
    address public constant party0Timelock =
        0x8ace03Fc45139fDDba944c6A4082b604041d19FC; // rgt timelock
    address public constant party1Timelock =
        0xd51dbA7a94e1adEa403553A8235C302cEbF41a3c; // tribe timelock

    bool public party0Accepted = false; // rgt timelock accepted
    bool public party1Accepted = false; // tribe timelock accepted

    uint256 public constant MIN_EXPIRY_WINDOW = 6500 * 365;

    uint256 public constant token0InBase = 1000000;
    uint256 public constant token1OutBase = 26710000;

    uint256 public expirationBlock = 0;

    IERC20 public constant token0 =
        IERC20(0xD291E7a03283640FDc51b121aC401383A46cC623); // rgt
    IERC20 public constant token1 =
        IERC20(0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B); //tribe

    event Exchange(address indexed from, uint256 amountIn, uint256 amountOut);

    /// @notice since all variables are hard coded, the constructor does nothing
    constructor() {}

    /// @notice call to exchange held RGT with TRIBE
    /// @param multiplier the amount to scale the base exchange amounts by
    function exchange(uint256 multiplier) public {
        require(isExpired() == false, "Redemption period is over");
        require(isEnabled() == true, "Proposals are not both passed");
        require(msg.sender != address(this), "????");
        uint256 token0TakenTotal = token0InBase * multiplier;
        uint256 token1GivenTotal = token1OutBase * multiplier;
        takeFrom(msg.sender, token0TakenTotal);
        giveTo(msg.sender, token1GivenTotal);
        emit Exchange(msg.sender, token0TakenTotal, token1GivenTotal);
    }

    /// @notice tells whether or not the contract is expired.
    /// @dev note that a expirationBlock of 0 means that no block is set, therefore not expired
    /// @return boolean true if we have passed the expiration block, else false
    function isExpired() public view returns (bool) {
        if (expirationBlock != 0) {
            return (block.number > expirationBlock);
        }
        return false;
    }

    /// @notice function which ultimately transfers the RGT
    /// @param target the address of which to transfer RGT from
    /// @param amount the amount of RGT to transfer from the target address
    function takeFrom(address target, uint256 amount) internal {
        bool check = token0.transferFrom(target, address(this), amount);
        require(check, "erc20 transfer failed");
    }

    /// @notice function which ultimately transfers the TRIBE
    /// @param target the address of which to transfer TRIBE to
    /// @param amount the amount of TRIBE to transfer to the target address
    function giveTo(address target, uint256 amount) internal {
        bool check = token1.transferFrom(address(this), target, amount);
        require(check, "erc20 transfer failed");
    }

    /// @notice tells whether or not both parties have accepted the deal
    /// @return boolean true if both parties have accepted, else false
    function isEnabled() public view returns (bool) {
        return party0Accepted && party1Accepted;
    }

    /// @notice function for the rari timelock to accept the deal
    function party0Accept() public {
        require(
            msg.sender == party0Timelock,
            "Only the timelock for party 0 may call this function"
        );
        party0Accepted = true;
    }

    /// @notice function for the tribe timelock to accept the deal
    function party1Accept() public {
        require(
            msg.sender == party1Timelock,
            "Only the timelock for party 1 may call this function"
        );
        party1Accepted = true;
    }

    // Admin function

    /// @param blockNumber  the block number of which to set the expiration block of the contract to
    /// @notice the expiry block must be set to at least MIN_EXPIRY_WINDOW in the future.
    function setExpirationBlock(uint256 blockNumber) public {
        require(
            msg.sender == party1Timelock,
            "Only the tribe timelock may call this function"
        );
        require(
            blockNumber > (block.number + MIN_EXPIRY_WINDOW),
            "block number too low"
        );
        require(
            isEnabled() == true,
            "Contract must be enabled before admin functions called"
        );
        expirationBlock = blockNumber;
    }
}
