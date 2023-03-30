import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { FoundersNFT } from "../typechain-types";
const { MerkleTree } = require('merkletreejs')
const keccak256 = require("keccak256");

let FoundersNFTInstance: FoundersNFT;
let MerkleTreeInstance: any;
let LeafNodes: any;

let eligibleAccounts = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
];

let Signer1: SignerWithAddress;
let Signer2: SignerWithAddress;
let Signer7NotEligible: SignerWithAddress;

describe("Founders NFT", function () {
    beforeEach(async function () {

        [Signer1, Signer2, , , , , Signer7NotEligible] = await ethers.getSigners();

        LeafNodes = eligibleAccounts.map((address) => {
            return keccak256(
                Buffer.concat([
                    Buffer.from(address.replace("0x", ""), "hex"),
                ])
            )
        })

        MerkleTreeInstance = new MerkleTree(LeafNodes, keccak256, { sortPairs: true });

        const FoundersNFT = await ethers.getContractFactory("FoundersNFT");
        const FoundersNFTProxy = await upgrades.deployProxy(FoundersNFT, [
            "Grizzly Founders NFT",
            "GFNFT",
            "https://example.com/",
            MerkleTreeInstance.getHexRoot()
        ]);
        FoundersNFTInstance = FoundersNFT.attach(FoundersNFTProxy.address);
    });

    it("Check Merkle Root", async function () {
        expect(await FoundersNFTInstance.MERKLE_ROOT()).to.equal(MerkleTreeInstance.getHexRoot());
    });

    it("Check Correct Metadata", async function () {
        expect(await FoundersNFTInstance.name()).to.equal("Grizzly Founders NFT");
        expect(await FoundersNFTInstance.symbol()).to.equal("GFNFT");
        expect(await FoundersNFTInstance.getBaseUri()).to.equal("https://example.com/");
    });

    it("Can mint NFT with eligible user", async function () {
        const proof0 = MerkleTreeInstance.getHexProof(LeafNodes[0])

        await FoundersNFTInstance.connect(Signer1).mint(proof0);

        const balance = await FoundersNFTInstance.balanceOf(Signer1.address);
        const ownerOf = await FoundersNFTInstance.ownerOf(0);
        const tokenURI = await FoundersNFTInstance.tokenURI(0);
        const minted = await FoundersNFTInstance.minted(Signer1.address);
        const tokenOfOwner = await FoundersNFTInstance.tokenOfOwnerByIndex(Signer1.address, 0);

        expect(balance).to.equal(1);
        expect(ownerOf).to.equal(Signer1.address);
        expect(tokenURI).to.equal("https://example.com/0");
        expect(minted).to.be.true;
        expect(tokenOfOwner).to.equal(0);
    });

    it("Can not mint twice", async function () {
        const proof0 = MerkleTreeInstance.getHexProof(LeafNodes[0])

        await FoundersNFTInstance.connect(Signer1).mint(proof0);

        await expect(FoundersNFTInstance.connect(Signer1).mint(proof0)).to.be.revertedWith("Not eligible to mint")
    });

    it("Can not mint for wrong proof", async function () {
        const proof1 = MerkleTreeInstance.getHexProof(LeafNodes[1])

        await expect(FoundersNFTInstance.connect(Signer1).mint(proof1)).to.be.revertedWith("Not eligible to mint")
    });

    it("Can mint for multiple users", async function () {
        const proof0 = MerkleTreeInstance.getHexProof(LeafNodes[0])
        const proof1 = MerkleTreeInstance.getHexProof(LeafNodes[1])

        await FoundersNFTInstance.connect(Signer1).mint(proof0);
        await FoundersNFTInstance.connect(Signer2).mint(proof1);

        const balance = await FoundersNFTInstance.balanceOf(Signer1.address);
        const ownerOf = await FoundersNFTInstance.ownerOf(0);
        const tokenURI = await FoundersNFTInstance.tokenURI(0);
        const minted = await FoundersNFTInstance.minted(Signer1.address);
        const tokenOfOwner = await FoundersNFTInstance.tokenOfOwnerByIndex(Signer1.address, 0);

        const balance2 = await FoundersNFTInstance.balanceOf(Signer2.address);
        const ownerOf2 = await FoundersNFTInstance.ownerOf(1);
        const tokenURI2 = await FoundersNFTInstance.tokenURI(1);
        const minted2 = await FoundersNFTInstance.minted(Signer2.address);
        const tokenOfOwner1 = await FoundersNFTInstance.tokenOfOwnerByIndex(Signer2.address, 0);

        expect(balance).to.equal(1);
        expect(ownerOf).to.equal(Signer1.address);
        expect(tokenURI).to.equal("https://example.com/0");
        expect(minted).to.be.true;
        expect(tokenOfOwner).to.equal(0);

        expect(balance2).to.equal(1);
        expect(ownerOf2).to.equal(Signer2.address);
        expect(tokenURI2).to.equal("https://example.com/1");
        expect(minted2).to.be.true;
        expect(tokenOfOwner1).to.equal(1);
    });
});