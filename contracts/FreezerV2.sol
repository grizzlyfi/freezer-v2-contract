// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./FreezerBase.sol";

contract FreezerV2 is FreezerBase {
    using SafeERC20 for IERC20;
    struct ParticipantData {
        uint256 deposited;
        uint256 honeyRewardMask;
        uint256 startTime;
        uint256 level;
    }

    uint256 honeyRoundMask;

    uint256 totalFreezedAmount;

    mapping(address => ParticipantData) public participantData;
    mapping(address => uint256) public referralRewards;

    function freeze(uint256 _amount, address _referral) external {
        require(_amount > 0, "No amount provided");
        // get amount of tokens
        IERC20(address(GhnyToken)).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        _claimAllStakingRewards();
        _updateParticipantDataDeposit(msg.sender);

        _approveToken(address(GhnyToken), address(StakingPool), _amount);
        StakingPool.stake(_amount);

        participantData[msg.sender].deposited += _amount;
        participantData[msg.sender].startTime = block.timestamp;

        uint256 _level = _getUpdatedParticipantLevel(
            msg.sender,
            participantData[msg.sender].deposited
        );

        participantData[msg.sender].level = _level;
        _payOutReferral(_referral, _amount);
    }

    function unfreeze() external {
        ParticipantData memory _participant = participantData[msg.sender];
        require(_participant.deposited > 0, "No deposit found");
        require(
            _participant.startTime + FREEZING_TIME < block.timestamp,
            "Freezing period not over"
        );
        _claimAllStakingRewards();

        uint256 _currentBalance = balanceOf(msg.sender);
        participantData[msg.sender].deposited = 0;
        participantData[msg.sender].honeyRewardMask = 0;
        participantData[msg.sender].startTime = 0;
        participantData[msg.sender].level = 0;

        _transferToken(address(GhnyToken), msg.sender, _currentBalance);
    }

    function triggerLevelUp() external {
        _updateParticipantDataDeposit(msg.sender);
        uint256 _deposited = balanceOf(msg.sender);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(
            msg.sender,
            _deposited
        );
        participantData[msg.sender].level = _updatedLevel;
    }

    function canIncreaseLevel(address _depositor) public view returns (bool) {
        uint256 _currentLevel = participantData[_depositor].level;
        uint256 _deposited = balanceOf(_depositor);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(
            _depositor,
            _deposited
        );
        return _updatedLevel > _currentLevel;
    }

    function balanceOf(address user) public view returns (uint256) {
        ParticipantData memory participant = participantData[user];
        return
            participant.deposited +
            ((honeyRoundMask - participant.honeyRewardMask) *
                participant.deposited) /
            DECIMAL_OFFSET;
    }

    function _payOutReferral(address _referral, uint256 _frozenAmount)
        internal
    {
        // todo change to participant percentage
        uint256 _referralReward = _frozenAmount / 100;
        GhnyToken.claimTokens(_referralReward);
        referralRewards[_referral] += _referralReward;
    }

    function _getUpdatedParticipantLevel(address _depositor, uint256 _deposited)
        internal
        pure
        returns (uint256)
    {
        uint256 _level;
        if (_deposited == 0) {
            _level = 0;
        } else if (_deposited < 10) {
            _level = 1;
        } else if (_deposited < 100) {
            _level = 2;
        } else if (_deposited < 1000) {
            _level = 3;
        } else if (_deposited < 10000) {
            _level = 4;
        } else {
            _level = 5;
        }
        return _level;
    }

    function _claimAllStakingRewards() internal {
        if (totalFreezedAmount == 0) return;
        uint256 totalLpRewards = StakingPool.lpBalanceOf(address(this));
        uint256 additionalHoney = StakingPool.getPendingHoneyRewards();
        if (totalLpRewards == 0 && additionalHoney == 0) return;
        (uint256 claimedAdditionalHoney, ) = StakingPool.claimLpTokens(
            totalLpRewards,
            additionalHoney,
            address(this)
        );
        if (claimedAdditionalHoney > 0) {
            uint256 _freezerBonus = (claimedAdditionalHoney * 7) / 10;

            GhnyToken.claimTokens(_freezerBonus);

            _approveToken(
                address(GhnyToken),
                address(StakingPool),
                claimedAdditionalHoney + _freezerBonus
            );
            StakingPool.stake(claimedAdditionalHoney + _freezerBonus);
            _rewardHoney(claimedAdditionalHoney + _freezerBonus);
        }
    }

    function _rewardHoney(uint256 _amount) internal {
        require(totalFreezedAmount > 0, "total freezed amount is 0");
        honeyRoundMask += (DECIMAL_OFFSET * _amount) / totalFreezedAmount;
    }

    function _updateParticipantDataDeposit(address _depositor) internal {
        uint256 _newBalance = balanceOf(_depositor);
        participantData[_depositor].deposited = _newBalance;
        participantData[_depositor].honeyRewardMask = honeyRoundMask;
    }
}
