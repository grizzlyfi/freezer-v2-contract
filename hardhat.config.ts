import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
import '@openzeppelin/hardhat-defender';
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bsc: {
      url: process.env.BSC_URL || "",
      accounts:
        process.env.BSC_PRIVATE_KEY !== undefined ? [process.env.BSC_PRIVATE_KEY] : [],
    },
    fork: {
      url: process.env.FORK_URL || "",
    },
    hardhat: {
      forking: {
        url: process.env.BSC_FORK_URL !== undefined ? process.env.BSC_FORK_URL : "",
        blockNumber: 26213400
      },
      throwOnCallFailures: true,
      throwOnTransactionFailures: true,
    },
    bscTest: {
      url: process.env.BSC_TESTNET_URL || "",
      accounts:
        process.env.BSC_TESTNET_PRIVATE_KEY !== undefined ? [process.env.BSC_TESTNET_PRIVATE_KEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts:
        process.env.BSC_TESTNET_PRIVATE_KEY !== undefined ? [process.env.BSC_TESTNET_PRIVATE_KEY] : [],
    }
  },
  defender: {
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET,
  }
};

export default config;
