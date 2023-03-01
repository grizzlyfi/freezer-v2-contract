// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./Interfaces/IStakingPool.sol";

contract FreezerV2 {
    struct participantData {
        uint256 deposited;
        uint256 ghny;
    }

    uint256 constant DECIMAL_OFFSET = 1 ether;

    IStakingPool public StakingPool;
    uint256 honeyRoundMask;
    uint256 bnbRoundMask;
    uint256 totalFreezedAmount;

    function freeze(uint256 amount, address referral) external {}

    function unfreeze() external {}

    function _claimAllStakingRewards() internal {
        uint256 totalStakingIncrease = StakingPool.balanceOf(address(this)) -
            totalFreezedAmount;
        uint256 totalLpRewards = StakingPool.lpBalanceOf(address(this));
        uint256 additionalHoney = StakingPool.getPendingHoneyRewards();

        if (totalStakingIncrease > 0) {
            StakingPool.unstake(totalStakingIncrease);
        }
        (uint256 claimedAdditionalHoney, uint256 claimedBnb) = StakingPool
            .claimLpTokens(totalLpRewards, additionalHoney, address(this));
        if (totalStakingIncrease + claimedAdditionalHoney > 0) {
            _rewardHoney(totalStakingIncrease + claimedAdditionalHoney);
        }
        if (claimedBnb > 0) {
            _rewardBnb(claimedBnb);
        }
    }

    function _rewardHoney(uint256 amount) internal {
        require(totalFreezedAmount > 0, "total freezed amount is 0");
        honeyRoundMask += (DECIMAL_OFFSET * amount) / totalFreezedAmount;
    }

    function _rewardBnb(uint256 amount) internal {
        require(totalFreezedAmount > 0, "total freezed amount is 0");
        bnbRoundMask += (DECIMAL_OFFSET * amount) / totalFreezedAmount;
    }
}
