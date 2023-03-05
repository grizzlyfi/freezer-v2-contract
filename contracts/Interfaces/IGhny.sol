// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGhny is IERC20 {
    function claimTokens(uint256 amount) external;

    function grantRole(bytes32 role, address account) external;

    function MINTER_ROLE() external view returns (bytes32);
}
