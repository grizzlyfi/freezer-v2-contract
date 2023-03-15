// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "./FreezerBase.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title FreezerV2
 * @dev This contract allows users to freeze GHNY tokens into the honey pot and earn rewards based on their level.
 */
contract FreezerV2 is Initializable, FreezerBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @dev Struct to store participant data.
     */
    struct ParticipantData {
        uint256 deposited; // Total deposited amount of GHNY tokens by the participant
        uint256 honeyRewardMask; // Mask of the participant's share of the honey rewards
        uint256 startTime; // Time when the participant made the first deposit or upgraded a level
        uint256 level; // Level of the participant, determined by the amount of deposited GHNY tokens
    }

    /**
     * @dev Struct to store referral view data.
     */
    struct ReferralData {
        address depositor; // The depositor who used the underlying referral
        uint256 depositAmount; // The deposited amount of the depositor
        uint256 reward; // The reward for the underlying referral for this deposit
        uint256 timestamp; // The timestamp of the deposit
    }

    event Freezed(
        address indexed _from,
        address indexed _for,
        uint256 _amount,
        address _referral
    );
    event Unfreezed(address indexed _for, uint256 _amount);
    event ReferralPaidOut(
        address indexed _from,
        address indexed _referral,
        uint256 _freezeAmount,
        uint256 _referralAmount
    );
    event RewardsClaimed(uint256 _stakingRewards, uint256 _freezerBonus);
    event LevelTriggeredUp(
        address indexed _for,
        uint256 _levelBefore,
        uint256 _levelAfter
    );

    /**
     * @dev Honey round mask.
     */
    uint256 public honeyRoundMask;

    /**
     * @dev Total amount of tokens that are currently frozen.
     */
    uint256 public totalFreezedAmount;

    /**
     * @dev Mapping to store participant data by their addresses.
     */
    mapping(address => ParticipantData) public participantData;
    /**
     * @dev Mapping to store referral rewards by their addresses.
     */
    mapping(address => uint256) public referralRewards;
    /**
     * @dev Mapping to store referral data view by their addresses.
     */
    mapping(address => ReferralData[]) referralData;
    /**
     * @dev Referrals for depositors
     */
    mapping(address => address) public referrals;

    /**
     * @dev Initializes the contract. Uses upgradeable transparent proxy
     */
    function initialize() external initializer {
        __FreezerBase_init();
    }

    /**
     * @dev Allows users to freeze their GHNY tokens and start staking in the staking pool
     * @param _amount The amount of tokens to be frozen.
     * @param _referral The address of the user who referred the current user. Can be zero address if no referral is defined
     */
    function freeze(
        address _for,
        uint256 _amount,
        address _referral
    ) external nonReentrant stopInEmergency {
        require(_amount > 0, "No amount provided");
        require(_for != _referral, "Referral and for must be different");
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
        _updateParticipantDataDeposit(_for);

        _approveToken(address(GhnyToken), address(StakingPool), _amount);
        StakingPool.stake(_amount);

        uint256 _depositedBefore = participantData[_for].deposited;

        participantData[_for].deposited += _amount;
        totalFreezedAmount += _amount;

        uint256 _level = _getUpdatedParticipantLevel(
            participantData[_for].deposited
        );

        if (_depositedBefore == 0) {
            participantData[_for].startTime = block.timestamp;
        } else {
            uint256 _currentLevel = participantData[_for].level;
            if (_level > _currentLevel) {
                participantData[_for].startTime = block.timestamp;
            }
        }

        participantData[_for].level = _level;

        if (referrals[msg.sender] == address(0) && _depositedBefore == 0) {
            referrals[msg.sender] = _referral;
        }

        _payOutReferral(_for, referrals[msg.sender], _amount);

        emit Freezed(msg.sender, _for, _amount, referrals[msg.sender]);
    }

    /**
     * @dev Allows users to unfreeze their tokens after freezing period is over.
     */
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

        emit Unfreezed(msg.sender, _currentBalance);
    }

    /**
     * @dev Updates the level of the participant if they can increase their level by depositing more tokens.
     * A depositor can increase their level if their updated level is higher than their current level.
     * If the level is updated, the start time of the participant is set to the current time.
     */
    function triggerLevelUp() external stopInEmergency nonReentrant {
        _claimAllStakingRewards();
        _updateParticipantDataDeposit(msg.sender);
        uint256 _deposited = balanceOf(msg.sender);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(_deposited);
        uint256 _currentLevel = participantData[msg.sender].level;
        if (_updatedLevel > _currentLevel) {
            participantData[msg.sender].startTime = block.timestamp;
        }
        participantData[msg.sender].level = _updatedLevel;

        emit LevelTriggeredUp(msg.sender, _currentLevel, _updatedLevel);
    }

    /**
     * @dev Checks if a depositor can increase their level by depositing more tokens.
     * A depositor can increase their level if their updated level is higher than their current level.
     * @param _depositor The address of the depositor to check.
     * @return A boolean indicating whether the depositor can increase their level.
     */
    function canIncreaseLevel(address _depositor) public view returns (bool) {
        uint256 _currentLevel = participantData[_depositor].level;
        uint256 _deposited = balanceOf(_depositor);
        uint256 _updatedLevel = _getUpdatedParticipantLevel(_deposited);
        return _updatedLevel > _currentLevel;
    }

    /**
     * @dev Gets the updated balance of a user
     * @param user The address of the depositor to check.
     * @return The current balance
     */
    function balanceOf(address user) public view returns (uint256) {
        ParticipantData memory participant = participantData[user];
        return
            participant.deposited +
            ((honeyRoundMask - participant.honeyRewardMask) *
                participant.deposited) /
            DECIMAL_OFFSET;
    }

    /**
     * @dev Gets all the referral depositors
     * @param _referral The referral address for which to get the deposit data
     * @return Array of Referral data containing who, how much were the rewards and the timestamp
     */
    function referralDataArray(
        address _referral
    ) external view returns (ReferralData[] memory) {
        return referralData[_referral];
    }

    function getReferralPercentage(
        address _referral
    ) public view returns (uint256) {
        uint256 _percentage = 0;
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
        return _percentage;
    }

    /**
     * @notice Allows users to claim referral rewards that they have earned. Users can only claim rewards if they have referred other users to the platform, and those referred users have completed successful freezings. The amount of rewards that users can claim is a percentage of the freezed amount by their referred users.
     * @dev This function mints the GHNY referral rewards and sends them to the user. It also updates the referral rewards balance of the user to 0.
     */
    function claimReferralRewards() external stopInEmergency nonReentrant {
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

    /**
     * @dev Manual autocompounding of the GHNY earnings
     */
    function compound() external nonReentrant stopInEmergency {
        _claimAllStakingRewards();
    }

    /**
     * @dev Calculates the referral rewards and stores them such that the referral can go to claim it
     * @param _referral The referral address
     * @param _frozenAmount The amount a user has frozen using this referral address
     */
    function _payOutReferral(
        address _depositor,
        address _referral,
        uint256 _frozenAmount
    ) internal {
        if (_referral == address(0)) return;
        uint256 _percentage = getReferralPercentage(_referral);
        uint256 _referralReward = (_frozenAmount * _percentage) / 100;
        referralRewards[_referral] += _referralReward;
        referralData[_referral].push(
            ReferralData({
                depositor: _depositor,
                depositAmount: _frozenAmount,
                reward: _referralReward,
                timestamp: block.timestamp
            })
        );

        emit ReferralPaidOut(
            _depositor,
            _referral,
            _frozenAmount,
            _referralReward
        );
    }

    /**
     * @dev Gets the updated participant level using the deposited amount of GHNY
     * @param _deposited The frozen amount of a user
     * @return The level for the input
     */
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

    /**
     * @dev Claim staking rewards, add a freezer bonus of 70% and adds it to the staking pool again. After reward the users. The Staking pool returns also a small amount of BNB (from GHNY-BNB lp tokens) which is not tracked.
     */
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
            uint256 _freezerBonus = (claimedAdditionalHoney *
                freezingMultiplier) / 100;

            GhnyToken.claimTokens(_freezerBonus);

            _approveToken(
                address(GhnyToken),
                address(StakingPool),
                claimedAdditionalHoney + _freezerBonus
            );
            StakingPool.stake(claimedAdditionalHoney + _freezerBonus);
            _rewardHoney(claimedAdditionalHoney + _freezerBonus);

            emit RewardsClaimed(claimedAdditionalHoney, _freezerBonus);
        }
    }

    /**
     * @dev Rewards the users, by increasing the honeyRoundMask
     * @param _amount The amount to be rewarded in GHNY tokens
     */
    function _rewardHoney(uint256 _amount) internal {
        require(totalFreezedAmount > 0, "total freezed amount is 0");
        honeyRoundMask += (DECIMAL_OFFSET * _amount) / totalFreezedAmount;
    }

    /**
     * @dev Updated the Participant data deposit. It gets the balance using the rewards and adds them to the deposit variable, also updates the total freezed amount by the autocompounded rewards
     * @param _depositor The depositor for which it will be updated
     */
    function _updateParticipantDataDeposit(address _depositor) internal {
        uint256 _newBalance = balanceOf(_depositor);
        totalFreezedAmount =
            totalFreezedAmount +
            _newBalance -
            participantData[_depositor].deposited;
        participantData[_depositor].deposited = _newBalance;
        participantData[_depositor].honeyRewardMask = honeyRoundMask;
    }

    uint256[49] private __gap;
}
