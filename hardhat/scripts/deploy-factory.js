/**
 * @title Real Estate System Deployment Script
 * @description Full deployment with Etherscan verification
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-factory.js --network sepolia
 */

const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const CONFIG = {
  DEFAULT_DEPLOY_FEE: ethers.parseEther("0"),
  TEMPLATE_GAS_LIMIT: 3500000,
  FACTORY_GAS_LIMIT: 5500000,
  VERIFICATION_DELAY_MS: 30000,
  VERIFICATION_RETRIES: 3,
  VERIFIABLE_NETWORKS: ["mainnet", "sepolia", "goerli", "polygon", "polygonMumbai", "bsc", "bscTestnet"],
  PRODUCTION_NETWORKS: ["mainnet", "polygon", "bsc"]
};

function getNetworkCurrency(networkName) {
  const currencies = {
    mainnet: "ETH", sepolia: "ETH", goerli: "ETH",
    polygon: "MATIC", polygonMumbai: "MATIC",
    bsc: "BNB", bscTestnet: "BNB",
    hardhat: "ETH", localhost: "ETH"
  };
  return currencies[networkName] || "ETH";
}

function getExplorerUrl(networkName, address) {
  const explorers = {
    mainnet: `https://etherscan.io/address/${address}`,
    sepolia: `https://sepolia.etherscan.io/address/${address}`,
    goerli: `https://goerli.etherscan.io/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`,
    polygonMumbai: `https://mumbai.polygonscan.com/address/${address}`,
    bsc: `https://bscscan.com/address/${address}`,
    bscTestnet: `https://testnet.bscscan.com/address/${address}`
  };
  return explorers[networkName] || null;
}

function promptUser(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once("data", (data) => resolve(data.toString().trim()));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyContract(address, constructorArgs, contractName, retries = CONFIG.VERIFICATION_RETRIES) {
  if (!CONFIG.VERIFIABLE_NETWORKS.includes(network.name)) {
    console.log(`   Verification not supported on ${network.name}`);
    return false;
  }
  
  console.log(`   Waiting ${CONFIG.VERIFICATION_DELAY_MS / 1000}s for indexing...`);
  await sleep(CONFIG.VERIFICATION_DELAY_MS);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   Verification attempt ${attempt}/${retries}...`);
      
      await run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });
      
      console.log(`   ${contractName} verified!`);
      return true;
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ${contractName} already verified!`);
        return true;
      }
      
      if (attempt === retries) {
        console.log(`   Verification failed: ${error.message}`);
        return false;
      }
      
      console.log(`   Attempt ${attempt} failed, retrying...`);
      await sleep(10000);
    }
  }
  return false;
}

async function main() {
  const networkName = network.name;
  const currency = getNetworkCurrency(networkName);
  
  console.log("\n" + "=".repeat(70));
  console.log("REAL ESTATE ESCROW SYSTEM - DEPLOYMENT");
  console.log("=".repeat(70));
  console.log(`Network: ${networkName.toUpperCase()}`);
  console.log(`Currency: ${currency}\n`);
  
  if (CONFIG.PRODUCTION_NETWORKS.includes(networkName)) {
    console.log("WARNING: PRODUCTION NETWORK!");
    const confirm = await promptUser("Continue? (yes/no): ");
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("Cancelled.");
      return;
    }
  }
  
  const [deployer] = await ethers.getSigners();
  const initialBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(initialBalance)} ${currency}\n`);
  
  const deployedDir = path.join(__dirname, "../deployed");
  if (!fs.existsSync(deployedDir)) {
    fs.mkdirSync(deployedDir, { recursive: true });
  }
  
  // Get owner
  const ownerChoice = await promptUser("Use deployer as owner? (yes/no): ");
  let factoryOwner = deployer.address;
  if (ownerChoice.toLowerCase() !== "yes" && ownerChoice.toLowerCase() !== "y") {
    factoryOwner = await promptUser("Enter owner address: ");
    if (!ethers.isAddress(factoryOwner)) {
      console.log("Invalid address!");
      return;
    }
  }
  console.log(`Factory Owner: ${factoryOwner}\n`);
  
  // Get deploy fee
  const feeChoice = await promptUser(`Set deploy fee? Default: ${ethers.formatEther(CONFIG.DEFAULT_DEPLOY_FEE)} ${currency} (yes/no): `);
  let deployFee = CONFIG.DEFAULT_DEPLOY_FEE;
  if (feeChoice.toLowerCase() === "yes" || feeChoice.toLowerCase() === "y") {
    const feeInput = await promptUser(`Enter fee in ${currency}: `);
    try {
      deployFee = ethers.parseEther(feeInput);
    } catch (e) {
      console.log("Invalid fee, using default.");
    }
  }
  console.log(`Deploy Fee: ${ethers.formatEther(deployFee)} ${currency}\n`);
  
  const startConfirm = await promptUser("Start deployment? (yes/no): ");
  if (startConfirm.toLowerCase() !== "yes" && startConfirm.toLowerCase() !== "y") {
    console.log("Cancelled.");
    return;
  }
  
  // Deploy Template
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: DEPLOYING TEMPLATE");
  console.log("=".repeat(60));
  
  let templateContract, templateAddress;
  try {
    const RealEstateDeal = await ethers.getContractFactory("RealEstateDeal");
    templateContract = await RealEstateDeal.deploy({ gasLimit: CONFIG.TEMPLATE_GAS_LIMIT });
    
    await templateContract.waitForDeployment();
    templateAddress = await templateContract.getAddress();
    
    const tx = templateContract.deploymentTransaction();
    const receipt = await tx?.wait();
    
    console.log(`Template: ${templateAddress}`);
    console.log(`Tx: ${tx?.hash}`);
    console.log(`Gas: ${receipt?.gasUsed?.toString()}\n`);
    
  } catch (error) {
    console.error("Template deployment failed:", error.message);
    return;
  }
  
  // Deploy Factory
  console.log("=".repeat(60));
  console.log("STEP 2: DEPLOYING FACTORY");
  console.log("=".repeat(60));
  
  let factoryContract, factoryAddress;
  try {
    const RealEstateFactory = await ethers.getContractFactory("RealEstateFactory");
    factoryContract = await RealEstateFactory.deploy(
      factoryOwner, templateAddress, deployFee,
      { gasLimit: CONFIG.FACTORY_GAS_LIMIT }
    );
    
    await factoryContract.waitForDeployment();
    factoryAddress = await factoryContract.getAddress();
    
    const tx = factoryContract.deploymentTransaction();
    const receipt = await tx?.wait();
    
    console.log(`Factory: ${factoryAddress}`);
    console.log(`Tx: ${tx?.hash}`);
    console.log(`Gas: ${receipt?.gasUsed?.toString()}\n`);
    
  } catch (error) {
    console.error("Factory deployment failed:", error.message);
    return;
  }
  
  // Verify connection
  console.log("=".repeat(60));
  console.log("STEP 3: VERIFYING CONNECTION");
  console.log("=".repeat(60));
  
  try {
    const setTemplate = await factoryContract.templateContract();
    const setFee = await factoryContract.deployFee();
    
    console.log(`Template connected: ${setTemplate === templateAddress ? "YES" : "NO"}`);
    console.log(`Deploy fee set: ${ethers.formatEther(setFee)} ${currency}\n`);
  } catch (error) {
    console.log(`Verification error: ${error.message}\n`);
  }
  
  // Test system
  console.log("=".repeat(60));
  console.log("STEP 4: TESTING SYSTEM");
  console.log("=".repeat(60));
  
  try {
    const stats = await factoryContract.getFactoryStats();
    console.log(`Total contracts: ${stats.totalContracts}`);
    console.log(`Factory paused: ${stats.isPaused}`);
    console.log(`Collected fees: ${ethers.formatEther(stats.collectedFees)} ${currency}`);
    
    const isOwner = await factoryContract.isOwner(deployer.address);
    console.log(`Deployer is owner: ${isOwner}\n`);
  } catch (error) {
    console.log(`Test error: ${error.message}\n`);
  }
  
  // Etherscan verification
  console.log("=".repeat(60));
  console.log("STEP 5: ETHERSCAN VERIFICATION");
  console.log("=".repeat(60));
  
  let templateVerified = false;
  let factoryVerified = false;
  
  if (CONFIG.VERIFIABLE_NETWORKS.includes(networkName)) {
    const verifyChoice = await promptUser("Verify on Etherscan? (yes/no): ");
    
    if (verifyChoice.toLowerCase() === "yes" || verifyChoice.toLowerCase() === "y") {
      console.log("\nVerifying Template...");
      templateVerified = await verifyContract(templateAddress, [], "RealEstateDeal");
      
      console.log("\nVerifying Factory...");
      factoryVerified = await verifyContract(
        factoryAddress,
        [factoryOwner, templateAddress, deployFee],
        "RealEstateFactory"
      );
    }
  } else {
    console.log(`Verification not supported on ${networkName}\n`);
  }
  
  // Save data
  console.log("=".repeat(60));
  console.log("STEP 6: SAVING DATA");
  console.log("=".repeat(60));
  
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const totalCost = initialBalance - finalBalance;
  const networkInfo = await ethers.provider.getNetwork();
  
  const deploymentData = {
    version: "2.0.0-struct",
    network: networkName,
    chainId: networkInfo.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    totalCost: ethers.formatEther(totalCost) + " " + currency,
    
    template: {
      address: templateAddress,
      tx: templateContract.deploymentTransaction()?.hash,
      explorer: getExplorerUrl(networkName, templateAddress),
      verified: templateVerified
    },
    
    factory: {
      address: factoryAddress,
      owner: factoryOwner,
      template: templateAddress,
      deployFee: ethers.formatEther(deployFee) + " " + currency,
      tx: factoryContract.deploymentTransaction()?.hash,
      explorer: getExplorerUrl(networkName, factoryAddress),
      verified: factoryVerified
    },
    
    verification: {
      template: { address: templateAddress, args: [] },
      factory: { address: factoryAddress, args: [factoryOwner, templateAddress, deployFee.toString()] }
    }
  };
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `deployment_${networkName}_${timestamp}.json`;
  fs.writeFileSync(path.join(deployedDir, filename), JSON.stringify(deploymentData, null, 2));
  fs.writeFileSync(path.join(deployedDir, `latest_${networkName}.json`), JSON.stringify(deploymentData, null, 2));
  
  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log(`
Template: ${templateAddress}
Factory:  ${factoryAddress}
Owner:    ${factoryOwner}
Fee:      ${ethers.formatEther(deployFee)} ${currency}
Cost:     ${ethers.formatEther(totalCost)} ${currency}

Template verified: ${templateVerified ? "YES" : "NO"}
Factory verified:  ${factoryVerified ? "YES" : "NO"}
`);

  if (!templateVerified || !factoryVerified) {
    console.log(`Manual verification:
  npx hardhat verify --network ${networkName} ${templateAddress}
  npx hardhat verify --network ${networkName} ${factoryAddress} "${factoryOwner}" "${templateAddress}" "${deployFee.toString()}"
`);
  }

  console.log(`Frontend config:
  FACTORY: '${factoryAddress}'
  TEMPLATE: '${templateAddress}'
`);
  
  console.log("=".repeat(70) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
