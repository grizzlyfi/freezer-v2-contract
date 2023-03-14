import { ethers } from "hardhat";

async function main() {
    const Registry = await ethers.getContractFactory("ReferralRegistry");
    const RegistryInstance = await Registry.deploy();

    console.log("Registry Deployed at: " + RegistryInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
