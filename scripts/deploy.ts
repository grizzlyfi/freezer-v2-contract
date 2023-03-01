import { ethers } from "hardhat";

async function main() {
  const Freezer = await ethers.getContractFactory("FreezerV2");
  const FreezerInstance = await Freezer.deploy();
  console.log("Freezer Deployed at: " + FreezerInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
