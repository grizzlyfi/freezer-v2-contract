import { ethers, upgrades } from "hardhat";

async function main() {
  const Freezer = await ethers.getContractFactory("FreezerV2");
  const ProxyInstance = await upgrades.deployProxy(Freezer, []);
  const FreezerInstance = Freezer.attach(ProxyInstance.address);

  console.log("Freezer Deployed at: " + FreezerInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
