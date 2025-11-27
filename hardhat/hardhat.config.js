require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // ДОБАВЕНА КОРЕКЦИЯ: Включване на IR компилатора за разрешаване на "Stack too deep"
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.USER1_PRIVATE_KEY ? [
        process.env.USER1_PRIVATE_KEY,
        process.env.USER2_PRIVATE_KEY,
        process.env.USER3_PRIVATE_KEY,
      ] : [],
      chainId: 11155111,
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: process.env.USER1_PRIVATE_KEY ? [process.env.USER1_PRIVATE_KEY] : [],
      chainId: 137,
    },
    mumbai: {
      url: "https://rpc-mumbai.maticvigil.com/",
      accounts: process.env.USER1_PRIVATE_KEY ? [
        process.env.USER1_PRIVATE_KEY,
        process.env.USER2_PRIVATE_KEY,
        process.env.USER3_PRIVATE_KEY,
      ] : [],
      chainId: 80001,
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org/",
      accounts: process.env.USER1_PRIVATE_KEY ? [process.env.USER1_PRIVATE_KEY] : [],
      chainId: 56,
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: process.env.USER1_PRIVATE_KEY ? [
        process.env.USER1_PRIVATE_KEY,
        process.env.USER2_PRIVATE_KEY,
        process.env.USER3_PRIVATE_KEY,
      ] : [],
      chainId: 97,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: process.env.USER1_PRIVATE_KEY ? [process.env.USER1_PRIVATE_KEY] : [],
      chainId: 1,
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY,
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      bsc: process.env.BSCSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
