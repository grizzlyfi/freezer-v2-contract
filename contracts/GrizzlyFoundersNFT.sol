// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract GrizzlyFoundersNFT is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    ERC1155SupplyUpgradeable
{
    uint256 public constant SILVER = 1;
    uint256 public constant GOLD = 2;
    uint256 public constant PLATIN = 3;
    uint256 public constant BLACK = 4;

    string public name;
    string public symbol;

    function initialize(
        string memory _uri,
        string memory _name,
        string memory _symbol
    ) public initializer {
        __ERC1155_init(_uri);
        __Ownable_init();
        __ERC1155Supply_init();
        name = _name;
        symbol = _symbol;
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyOwner {
        _mint(account, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function mintBatchUsers(
        address[] memory to,
        uint256[] memory ids,
        bytes memory data
    ) public onlyOwner {
        require(to.length == ids.length, "Not equal length");
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], ids[i], 1, data);
        }
    }

    // The following functions are overrides required by Solidity.
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    uint256[50] private __gap;
}
