// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.17;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract FoundersNFT is
    Initializable,
    ERC721EnumerableUpgradeable,
    OwnableUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;

    string internal _baseUri;

    mapping(address => bool) public minted;

    bytes32 public MERKLE_ROOT;

    function initialize(
        string memory name_,
        string memory symbol_,
        string memory baseUri,
        bytes32 merkleRoot_
    ) external initializer {
        __ERC721_init(name_, symbol_);
        _baseUri = baseUri;
        MERKLE_ROOT = merkleRoot_;
    }

    function mint(bytes32[] calldata merkleProof) external returns (uint256) {
        require(
            !minted[msg.sender] && _verifyClaim(msg.sender, merkleProof),
            "Not eligible to mint"
        );
        minted[msg.sender] = true;

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);

        _tokenIds.increment();
        return newItemId;
    }

    function _verifyClaim(
        address account,
        bytes32[] memory merkleProof
    ) internal view returns (bool) {
        bytes32 node = keccak256(abi.encodePacked(account));
        return MerkleProofUpgradeable.verify(merkleProof, MERKLE_ROOT, node);
    }

    function setBaseUri(string memory baseUri) external onlyOwner {
        _baseUri = baseUri;
    }

    function getBaseUri() external view returns (string memory) {
        return _baseUri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseUri;
    }
}
