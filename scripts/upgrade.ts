import { defender, ethers, upgrades } from "hardhat";

const freezerAddress = "0x770d42578a1B941de7Aef0B057cb8F437f0E3E69";

async function main() {
    const Freezer = await ethers.getContractFactory("FreezerV2");
    console.log(`Upgrading Freezer at ${freezerAddress}...`);
    const proposal = await defender.proposeUpgrade(freezerAddress, Freezer);
    console.log("Upgrade proposal created at:", proposal.url);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
