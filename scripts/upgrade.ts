import { ethers, upgrades } from "hardhat";

const freezerAddress = "0x14A72E378728552ACCFA1D77d6e977D9C1C36A8D";

async function main() {
    const Freezer = await ethers.getContractFactory("FreezerV2");
    const ProxyInstance = await upgrades.upgradeProxy(freezerAddress, Freezer);
    const FreezerInstance = Freezer.attach(ProxyInstance.address);

    console.log("Freezer upgraded at: " + FreezerInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
