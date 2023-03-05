// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./FreezerBase.sol";

contract FreezerV2 is FreezerBase {
    using SafeERC20 for IERC20;
    struct ParticipantData {
        uint256 deposited;
        uint256 honeyRewardMask;
        uint256 bnbRewardMask;
        uint256 level;
    }

    uint256 honeyRoundMask;
    uint256 bnbRoundMask;

    uint256 totalFreezedAmount;

    mapping(address => ParticipantData) participantData;

    function freeze(uint256 amount, address referral) external {
        require(amount > 0, "No amount provided");
        // get amount of tokens
        _transferToken(address(GhnyToken), address(this), amount);

        _claimAllStakingRewards();

        _approveToken(address(GhnyToken), address(StakingPool), amount);
        StakingPool.stake(amount);

        uint256 currentBalance = balanceOf(msg.sender);
        participantData[msg.sender].deposited = currentBalance + amount;
        participantData[msg.sender].honeyRewardMask = honeyRoundMask;

        _setParticipantLevel(msg.sender, participantData[msg.sender].deposited);
    }

    function unfreeze() external {}

    function triggerLevelUp() external {}

    function balanceOf(address user) public view returns (uint256) {
        ParticipantData memory participant = participantData[user];
        return
            participant.deposited +
            ((honeyRoundMask - participant.honeyRewardMask) *
                participant.deposited) /
            DECIMAL_OFFSET;
    }

    function _setParticipantLevel(address user, uint256 deposited) internal {
        uint256 _level;
        if (deposited == 0) {
            _level = 0;
        } else if (deposited < 10) {
            _level = 1;
        } else if (deposited < 100) {
            _level = 2;
        } else if (deposited < 1000) {
            _level = 3;
        } else if (deposited < 10000) {
            _level = 4;
        } else {
            _level = 5;
        }
        participantData[user].level = _level;
    }

    function _claimAllStakingRewards() internal {
        if (totalFreezedAmount == 0) return;
        uint256 totalLpRewards = StakingPool.lpBalanceOf(address(this));
        uint256 additionalHoney = StakingPool.getPendingHoneyRewards();
        if (totalLpRewards == 0 && additionalHoney == 0) return;
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
