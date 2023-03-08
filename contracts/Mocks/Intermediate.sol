// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

contract Intermediate {
    address freezer;

    constructor(address freezerAddress) {
        freezer = freezerAddress;
    }

    function sendEth() external payable {
        (bool sent, bytes memory data) = freezer.call{value: msg.value}("");
        require(sent, "Failed to send Ether");
    }
}
