// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

interface IStakingPool {
    function balanceOf(address from) external view returns (uint256);

    function lpBalanceOf(address from) external view returns (uint256);

    function getPendingHoneyRewards() external view returns (uint256);

    function stake(uint256 amount) external;

    function unstake(uint256 amount) external;

    function claimLpTokens(
        uint256 lpRewards,
        uint256 honeyRewards,
        address to
    ) external returns (uint256 additionalGhny, uint256 additionalBnb);

    function setHoneyMintingRewards(
        uint256 _blockRewardPhase1End,
        uint256 _blockRewardPhase2Start,
        uint256 _blockRewardPhase1Amount,
        uint256 _blockRewardPhase2Amount
    ) external;
}
