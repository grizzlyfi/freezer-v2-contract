import { ethers, upgrades } from "hardhat";
import { create, globSource } from 'ipfs-http-client';

const name = "Grizzly Founders Cards";
const symbol = "GFC";

const IPFS_HOST = "ipfs.infura.io";
const IPFS_PORT = 5001;
const IPFS_PROTOCOL = "https";

const IPFS_PROJECT = process.env.IPFS_PROJECT;
const IPFS_PASSWORD = process.env.IPFS_PASSWORD;

const auth = 'Basic ' + Buffer.from(IPFS_PROJECT + ':' + IPFS_PASSWORD).toString('base64');

async function main() {
    const metadata = await uploadMetadata();
    await deployNFT(metadata.metadata);
}

async function uploadMetadata(): Promise<any> {

    const ipfsClient = create({
        host: IPFS_HOST, port: IPFS_PORT, protocol: IPFS_PROTOCOL, headers: {
            authorization: auth,
        }
    });

    const metadata = [];

    for await (const file of ipfsClient.addAll(globSource('./metadata/videos', '**/*'))) {
        const metadataPath = "metadata/metadata/" + file.path.split(".")[0] + ".json";

        for await (const image of ipfsClient.addAll(globSource("./metadata/images/" + file.path.split(".")[0] + ".png", "**/*"))) {
            const jsonData = require('../' + metadataPath);
            jsonData.animation_url = "ipfs://" + file.cid.toString();
            jsonData.image = "ipfs://" + image.cid.toString();
            metadata.push({ content: JSON.stringify(jsonData), path: metadataPath });
        }
    }

    let metadataCID = "";

    for await (const file of ipfsClient.addAll(metadata, { wrapWithDirectory: true })) {
        if (file.path == "metadata") {
            metadataCID = file.cid.toString();
        }
    }

    if (metadataCID == "") throw "metadata was never set";

    const metadataURI = "ipfs://" + metadataCID + "/metadata/{id}.json";

    console.log(metadataURI)

    return { metadata: metadataURI };
}

async function deployNFT(metadataURI: string) {
    const FoundersNFT = await ethers.getContractFactory("GrizzlyFoundersNFT");
    const FoundersNFTProxy = await upgrades.deployProxy(FoundersNFT, [
        metadataURI,
        name,
        symbol
    ]);
    const FoundersNFTInstance = FoundersNFT.attach(FoundersNFTProxy.address);

    console.log("NFT deployed at: " + FoundersNFTInstance.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
