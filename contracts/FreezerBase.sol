// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./Interfaces/IStakingPool.sol";
import "./Interfaces/IGhny.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract FreezerBase is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

    uint256 constant DECIMAL_OFFSET = 1 ether;
    uint256 public constant FREEZING_TIME = 4380 hours;
    address internal constant ETHAddress =
        0x0000000000000000000000000000000000000000;
    address public constant OLD_FREEZER =
        0xB80287c110a76e4BbF0315337Dbc8d98d7DE25DB;

    bool public stopped;

    IStakingPool public StakingPool;
    IGhny public GhnyToken;

    uint256 public freezingMultiplier;

    function __FreezerBase_init() internal onlyInitializing {
        StakingPool = IStakingPool(0x6F42895f37291ec45f0A307b155229b923Ff83F1);
        GhnyToken = IGhny(0xa045E37a0D1dd3A45fefb8803D22457abc0A728a);
        // total multiplier of 4x
        freezingMultiplier = 300;
        stopped = false;

        __ReentrancyGuard_init();
        __Ownable_init();
    }

    // Circuit breaker modifiers
    modifier stopInEmergency() {
        if (stopped) {
            revert("Paused");
        } else {
            _;
        }
    }

    function _approveToken(
        address token,
        address spender,
        uint256 amount
    ) internal {
        IERC20Upgradeable(token).safeApprove(spender, 0);
        IERC20Upgradeable(token).safeApprove(spender, amount);
    }

    // - to Pause the contract
    function toggleContractActive() external onlyOwner {
        stopped = !stopped;
    }

    ///@notice sweep ETH
    function withdrawEth() external onlyOwner {
        uint256 qty = address(this).balance;
        AddressUpgradeable.sendValue(payable(owner()), qty);
    }

    function setFreezingMultiplier(
        uint256 _freezingMultiplier
    ) external onlyOwner {
        freezingMultiplier = _freezingMultiplier;
    }

    receive() external payable {
        require(msg.sender != tx.origin, "Do not send ETH directly");
    }

    uint256[50] private __gap;
}
