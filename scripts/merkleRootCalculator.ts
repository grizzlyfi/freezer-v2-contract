import { ethers, upgrades } from "hardhat";
const { MerkleTree } = require('merkletreejs')
const keccak256 = require("keccak256");


let accounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
];


async function main() {

    const leafNodes = accounts.map((address) => {
        return keccak256(
            Buffer.concat([
                Buffer.from(address.replace("0x", ""), "hex"),
            ])
        )
    })

    const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });

    console.log("---------");
    console.log("Merke Tree");
    console.log("---------");
    console.log(merkleTree.toString());
    console.log("---------");
    console.log("Merkle Root: " + merkleTree.getHexRoot());

    console.log("Proof 1: " + merkleTree.getHexProof(leafNodes[0]));
    console.log("Proof 2: " + merkleTree.getHexProof(leafNodes[1]));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
