import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { GrizzlyFoundersNFT } from "../typechain-types";

let FoundersNFTInstance: GrizzlyFoundersNFT;

let Signer1: SignerWithAddress;
let Signer2: SignerWithAddress;
let Signer3: SignerWithAddress;

describe("Founders NFT", function () {
    beforeEach(async function () {

        [Signer1, Signer2, Signer3] = await ethers.getSigners();

        const FoundersNFT = await ethers.getContractFactory("GrizzlyFoundersNFT");
        const FoundersNFTProxy = await upgrades.deployProxy(FoundersNFT, [
            "https://game.example/api/item/{id}.json",
            "Grizzly Founders Cards",
            "GFC"
        ]);
        FoundersNFTInstance = FoundersNFT.attach(FoundersNFTProxy.address);
    });

    it("Corresponding names match ids", async function () {
        expect(await FoundersNFTInstance.SILVER()).to.equal(1);
        expect(await FoundersNFTInstance.GOLD()).to.equal(2);
        expect(await FoundersNFTInstance.PLATIN()).to.equal(3);
        expect(await FoundersNFTInstance.BLACK()).to.equal(4);
    });

    it("Can mint NFT for user", async function () {
        await FoundersNFTInstance.mint(Signer2.address, await FoundersNFTInstance.SILVER(), 1, "0x");

        const balanceOf = await FoundersNFTInstance.balanceOf(Signer2.address, 1);
        const totalSupply = await FoundersNFTInstance.totalSupply(1);

        expect(balanceOf).to.equal(1);
        expect(totalSupply).to.equal(1);
    });

    it("Can batch mint NFT for user", async function () {
        await FoundersNFTInstance.mintBatchUsers([Signer2.address, Signer3.address], [await FoundersNFTInstance.SILVER(), await FoundersNFTInstance.GOLD()], "0x");

        const balanceOf21 = await FoundersNFTInstance.balanceOf(Signer2.address, 1);
        const balanceOf22 = await FoundersNFTInstance.balanceOf(Signer2.address, 2);
        const totalSupply1 = await FoundersNFTInstance.totalSupply(1);

        const balanceOf31 = await FoundersNFTInstance.balanceOf(Signer3.address, 1);
        const balanceOf32 = await FoundersNFTInstance.balanceOf(Signer3.address, 2);
        const totalSupply2 = await FoundersNFTInstance.totalSupply(2);

        expect(balanceOf21).to.equal(1);
        expect(balanceOf22).to.equal(0);
        expect(totalSupply1).to.equal(1);
        expect(balanceOf31).to.equal(0);
        expect(balanceOf32).to.equal(1);
        expect(totalSupply2).to.equal(1);
    });


});