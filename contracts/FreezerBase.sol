// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./Interfaces/IStakingPool.sol";
import "./Interfaces/IGhny.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract FreezerBase is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 constant DECIMAL_OFFSET = 1 ether;
    uint256 constant FREEZING_TIME = 4380 hours;
    address internal constant ETHAddress =
        0x0000000000000000000000000000000000000000;

    bool public stopped = false;

    IStakingPool public StakingPool =
        IStakingPool(0x6F42895f37291ec45f0A307b155229b923Ff83F1);
    IGhny public GhnyToken = IGhny(0xa045E37a0D1dd3A45fefb8803D22457abc0A728a);

    // Circuit breaker modifiers
    modifier stopInEmergency() {
        if (stopped) {
            revert("Paused");
        } else {
            _;
        }
    }

    function _transferToken(
        address token,
        address to,
        uint256 amount
    ) internal {
        if (token == address(0)) {
            (bool sent, bytes memory data) = to.call{value: amount}("");
            require(sent, "Failed to send Ether");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    function _approveToken(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20(token).safeApprove(spender, 0);
        IERC20(token).safeApprove(spender, amount);
    }

    // - to Pause the contract
    function toggleContractActive() external onlyOwner {
        stopped = !stopped;
    }

    ///@notice Withdraw tokens like a sweep function
    function withdrawTokens(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 qty;
            // Check weather if is native or just ERC20
            if (tokens[i] == ETHAddress) {
                qty = address(this).balance;
                Address.sendValue(payable(owner()), qty);
            } else {
                qty = IERC20(tokens[i]).balanceOf(address(this));
                IERC20(tokens[i]).safeTransfer(owner(), qty);
            }
        }
    }

    receive() external payable {
        require(msg.sender != tx.origin, "Do not send ETH directly");
    }
}
