import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { ReferralRegistry } from "../typechain-types";

let RegistryInstance: ReferralRegistry;

describe("Referral Registry", function () {
    beforeEach(async function () {
        const Registry = await ethers.getContractFactory("ReferralRegistry");
        RegistryInstance = await Registry.deploy();
    });

    it("Can not set empty string for username", async function () {
        await expect(RegistryInstance.register("")).to.be.revertedWith("No empty username");
    });
    it("Can Register normal username", async function () {
        const [signer] = await ethers.getSigners();
        await RegistryInstance.register("Aa");
        expect(await RegistryInstance.addressToUsername(signer.address)).to.equal("Aa");
        expect(await RegistryInstance.usernameToAddress("Aa")).to.equal(signer.address);
    });
    it("Can Register long username", async function () {
        const [signer] = await ethers.getSigners();
        const username = "asseW eda !!! £awe"
        await RegistryInstance.register(username);
        expect(await RegistryInstance.addressToUsername(signer.address)).to.equal(username);
        expect(await RegistryInstance.usernameToAddress(username)).to.equal(signer.address);
    });
    it("Can not Register with same username", async function () {
        const [signer, signer2] = await ethers.getSigners();
        await RegistryInstance.register("Aa");
        await expect(RegistryInstance.connect(signer2).register("Aa")).to.be.revertedWith("Username already taken");
    });

    it("Can not Register with same address", async function () {
        const [signer] = await ethers.getSigners();
        await RegistryInstance.register("Aa");
        await expect(RegistryInstance.register("Some other")).to.be.revertedWith("Username already defined");
    });
});