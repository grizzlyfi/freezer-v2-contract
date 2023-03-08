import { ethers, network, upgrades } from "hardhat";

const multisig = "0x981B04CBDCEE0C510D331fAdc7D6836a77085030";
const stakingPoolAddress = "0x6F42895f37291ec45f0A307b155229b923Ff83F1";
const ghnyAddress = "0xa045E37a0D1dd3A45fefb8803D22457abc0A728a";

async function main() {
    const Freezer = await ethers.getContractFactory("FreezerV2");
    const ProxyInstance = await upgrades.deployProxy(Freezer, []);
    const FreezerInstance = Freezer.attach(ProxyInstance.address);

    console.log("Freezer Deployed at: " + FreezerInstance.address);

    const GhnyToken = await ethers.getContractAt("IGhny", ghnyAddress);

    const multisigSigner = await ethers.getSigner(multisig);
    await GhnyToken.connect(multisigSigner).grantRole(await GhnyToken.MINTER_ROLE(), FreezerInstance.address);
    await GhnyToken.connect(multisigSigner).grantRole(await GhnyToken.MINTER_ROLE(), stakingPoolAddress);

    console.log("All roles granted!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
