// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGhny is IERC20 {
    // Function to mint new GHNY tokens. Caller needs MINTER_ROLE
    function claimTokens(uint256 amount) external;

    function grantRole(bytes32 role, address account) external;

    function MINTER_ROLE() external view returns (bytes32);
}
