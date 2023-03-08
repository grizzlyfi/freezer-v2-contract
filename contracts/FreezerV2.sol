// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "./FreezerBase.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract FreezerV2 is Initializable, FreezerBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    struct ParticipantData {
        uint256 deposited;
        uint256 honeyRewardMask;
        uint256 startTime;
        uint256 level;
    }

    uint256 public honeyRoundMask;

    uint256 public totalFreezedAmount;

    mapping(address => ParticipantData) public participantData;
    mapping(address => uint256) public referralRewards;

    function initialize() external initializer {
        __FreezerBase_init();
    }

    function freeze(
        uint256 _amount,
        address _referral
    ) external nonReentrant stopInEmergency {
        require(_amount > 0, "No amount provided");
        require(
            msg.sender != _referral,
            "Referral and msg.sender must be different"
        );
        require(
            IERC20Upgradeable(address(GhnyToken)).allowance(
                msg.sender,
                address(this)
            ) >= _amount,
            "Token is not approved"
        );
        IERC20Upgradeable(address(GhnyToken)).safeTransferFrom(
            msg.sender,
            address(this),
            _amount
        );

        _claimAllStakingRewards();
        _updateParticipantDataDeposit(msg.sender);

        _approveToken(address(GhnyToken), address(StakingPool), _amount);
        StakingPool.stake(_amount);

        uint256 _depositedBefore = participantData[msg.sender].deposited;

        participantData[msg.sender].deposited += _amount;
        totalFreezedAmount += _amount;

        uint256 _level = _getUpdatedParticipantLevel(
            participantData[msg.sender].deposited
        );

        if (_depositedBefore == 0) {
            participantData[msg.sender].startTime = block.timestamp;
        } else {
            uint256 _currentLevel = participantData[msg.sender].level;
            if (_level > _currentLevel) {
                participantData[msg.sender].startTime = block.timestamp;
            }
        }

        participantData[msg.sender].level = _level;
        _payOutReferral(_referral, _amount);
    }

    function unfreeze() external nonReentrant stopInEmergency {
        ParticipantData memory _participant = participantData[msg.sender];
        require(_participant.deposited > 0, "No deposit found");
        require(
            _participant.startTime + FREEZING_TIME < block.timestamp,
            "Freezing period not over"
        );
        _claimAllStakingRewards();
        _updateParticipantDataDeposit(msg.sender);

        uint256 _currentBalance = balanceOf(msg.sender);
        participantData[msg.sender].deposited = 0;
        participantData[msg.sender].honeyRewardMask = 0;
        participantData[msg.sender].startTime = 0;
        participantData[msg.sender].level = 0;
        totalFreezedAmount -= _currentBalance;

        StakingPool.unstake(_currentBalance);

        IERC20Upgradeable(address(GhnyToken)).safeTransfer(
            msg.sender,
            _currentBalance
        );
    }

    function triggerLevelUp() external stopInEmergency {
        _claimAllStakingRewards();
        _updateParticipantDataDeposit(msg.sender);
        uint256 _deposited = balanceOf(msg.sender);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(_deposited);
        uint256 _currentLevel = participantData[msg.sender].level;
        if (_updatedLevel > _currentLevel) {
            participantData[msg.sender].startTime = block.timestamp;
        }
        participantData[msg.sender].level = _updatedLevel;
    }

    function canIncreaseLevel(address _depositor) public view returns (bool) {
        uint256 _currentLevel = participantData[_depositor].level;
        uint256 _deposited = balanceOf(_depositor);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(_deposited);
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

    function claimReferralRewards() external nonReentrant {
        uint256 _rewards = referralRewards[msg.sender];
        if (_rewards > 0) {
            GhnyToken.claimTokens(_rewards);
            IERC20Upgradeable(address(GhnyToken)).safeTransfer(
                msg.sender,
                _rewards
            );
            referralRewards[msg.sender] = 0;
        }
    }

    function compound() external nonReentrant {
        _claimAllStakingRewards();
    }

    function _payOutReferral(
        address _referral,
        uint256 _frozenAmount
    ) internal {
        if (_referral == address(0)) return;
        uint256 _percentage;
        uint256 _referralLevel = participantData[_referral].level;
        if (_referralLevel == 0) {
            _percentage = 1;
        } else if (_referralLevel == 1) {
            _percentage = 2;
        } else if (_referralLevel == 2) {
            _percentage = 5;
        } else if (_referralLevel == 3) {
            _percentage = 7;
        } else if (_referralLevel == 4) {
            _percentage = 10;
        }
        uint256 _referralReward = (_frozenAmount * _percentage) / 100;
        referralRewards[_referral] += _referralReward;
    }

    function _getUpdatedParticipantLevel(
        uint256 _deposited
    ) internal pure returns (uint256) {
        uint256 _level;
        if (_deposited < 10 ether) {
            _level = 0;
        } else if (_deposited < 100 ether) {
            _level = 1;
        } else if (_deposited < 1000 ether) {
            _level = 2;
        } else if (_deposited < 10000 ether) {
            _level = 3;
        } else {
            _level = 4;
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
        totalFreezedAmount =
            totalFreezedAmount +
            _newBalance -
            participantData[_depositor].deposited;
        participantData[_depositor].deposited = _newBalance;
        participantData[_depositor].honeyRewardMask = honeyRoundMask;
    }

    uint256[50] private __gap;
}
