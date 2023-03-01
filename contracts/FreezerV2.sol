// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./FreezerBase.sol";

contract FreezerV2 is FreezerBase {
    using SafeERC20 for IERC20;
    struct participantData {
        uint256 deposited;
        uint256 honeyRewardMask;
        uint256 bnbRewardMask;
    }

    uint256 honeyRoundMask;
    uint256 bnbRoundMask;

    uint256 totalFreezedAmount;

    function freeze(uint256 amount, address referral) external {}

    function unfreeze() external {}

    function _claimAllStakingRewards() internal {
        uint256 totalLpRewards = StakingPool.lpBalanceOf(address(this));
        uint256 additionalHoney = StakingPool.getPendingHoneyRewards();
        (uint256 claimedAdditionalHoney, uint256 claimedBnb) = StakingPool
            .claimLpTokens(totalLpRewards, additionalHoney, address(this));
        if (claimedAdditionalHoney > 0) {
            _approveToken(
                address(GhnyToken),
                address(StakingPool),
                claimedAdditionalHoney
            );
            StakingPool.stake(claimedAdditionalHoney);
            _rewardHoney(claimedAdditionalHoney);
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
