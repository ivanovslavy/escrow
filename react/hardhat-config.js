// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 11155111,
  chainName: 'Sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  blockExplorer: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18
  }
};

// Contract Addresses - UPDATE AFTER DEPLOYMENT
export const CONTRACTS = {
  FACTORY: '0x4D8eecE1106c7c6e00bAe99C48b6C18790107efc',
  TEMPLATE: '0x77Bc9Ca347816AD48bD993C8c94A574524C2B2A9'
};

// RealEstateFactory ABI (v2 with struct params)
export const FACTORY_ABI = [
  // Deploy function with struct
  "function deployRealEstateContract(tuple(address buyer, address seller, address notary, address agent, uint256 price, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, string propertyDescription, string propertyPDFCid, string contractName, uint256 deadlineDays) params) external payable returns (uint256, address)",
  
  // Fee management
  "function deployFee() external view returns (uint256)",
  "function collectedFees() external view returns (uint256)",
  "function setDeployFee(uint256 _newDeployFee) external",
  "function withdrawFees(address _recipient) external",
  
  // Stats
  "function getFactoryStats() external view returns (tuple(uint256 totalContracts, uint256 activeContracts, uint256 completedContracts, uint256 totalValueLocked, uint256 deployFee, uint256 collectedFees, address[] allAdmins, bool isPaused, address templateContract))",
  
  // Contracts list
  "function getLatestContracts(uint256 _limit) external view returns (tuple(address contractAddress, address deployer, string contractName, string propertyDescription, uint256 price, address buyer, address seller, address notary, address agent, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, uint256 deployedAt, bool isActive, uint256 deadlineDays, string propertyPDFCid)[])",
  "function getContract(uint256 _contractId) external view returns (tuple(address contractAddress, address deployer, string contractName, string propertyDescription, uint256 price, address buyer, address seller, address notary, address agent, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, uint256 deployedAt, bool isActive, uint256 deadlineDays, string propertyPDFCid))",
  "function getActiveContracts(uint256 _offset, uint256 _limit) external view returns (tuple(address contractAddress, address deployer, string contractName, string propertyDescription, uint256 price, address buyer, address seller, address notary, address agent, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, uint256 deployedAt, bool isActive, uint256 deadlineDays, string propertyPDFCid)[], bool, uint256)",
  
  // Admin functions
  "function addAdmin(address _admin) external",
  "function removeAdmin(address _admin) external",
  "function isOwner(address _account) external view returns (bool)",
  "function isAdmin(address _account) external view returns (bool)",
  "function pauseFactory(bool _paused) external",
  "function markContractInactive(uint256 _contractId) external",
  "function getAllAdmins() external view returns (address[])",
  
  // View functions
  "function totalContracts() external view returns (uint256)",
  "function activeContracts() external view returns (uint256)",
  "function templateContract() external view returns (address)",
  "function factoryPaused() external view returns (bool)",
  "function getContractsByDeployer(address _deployer) external view returns (uint256[])",
  "function getContractsByParticipant(address _participant) external view returns (uint256[])",
  
  // Events
  "event ContractDeployed(uint256 indexed contractId, address indexed contractAddress, address indexed deployer, string contractName, uint256 price, uint256 deployFeePaid)",
  "event DeployFeeUpdated(uint256 oldFee, uint256 newFee)",
  "event FeesWithdrawn(address indexed recipient, uint256 amount)"
];

// RealEstateDeal ABI (v2 with struct params)
export const DEAL_ABI = [
  // Initialize with struct
  "function initialize(tuple(address buyer, address seller, address notary, address agent, uint256 price, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, string propertyDescription, string propertyPDFCid, string contractName, uint256 deadlineDays) params) external",
  
  // Contract info
  "function getContractInfo() external view returns (string, address, address, address, address, uint256, uint256, string, uint256)",
  "function getFeeInfo() external view returns (uint256, uint256, uint256, uint256, uint256, address)",
  "function getContractStatus() external view returns (bool, bool, uint256, uint256, uint256)",
  "function getPropertyPDFUrl() external view returns (string)",
  
  // Actions
  "function deposit(string _notaryActNumber) external payable",
  "function approveSale(string _notaryActNumber) external",
  "function cancelSale() external",
  "function refundAfterDeadline() external",
  
  // View functions
  "function isParticipant(address _address) external view returns (bool)",
  "function isActive() external view returns (bool)",
  "function isDeadlineExpired() external view returns (bool)",
  "function buyer() external view returns (address)",
  "function seller() external view returns (address)",
  "function notary() external view returns (address)",
  "function agent() external view returns (address)",
  "function price() external view returns (uint256)",
  "function totalDepositRequired() external view returns (uint256)",
  "function agentFeeAmount() external view returns (uint256)",
  "function notaryFeeAmount() external view returns (uint256)",
  "function agentFeeBasisPoints() external view returns (uint256)",
  "function notaryFeeBasisPoints() external view returns (uint256)",
  "function isDeposited() external view returns (bool)",
  "function isFinalized() external view returns (bool)",
  "function notaryActNumber() external view returns (string)",
  
  // Events
  "event DealCreated(address indexed buyer, address indexed seller, address indexed notary, address agent, uint256 price, uint256 agentFeeBasisPoints, uint256 notaryFeeBasisPoints, uint256 totalDepositRequired, string contractName)",
  "event DepositMade(address indexed buyer, uint256 totalAmount, uint256 priceAmount, uint256 agentFeeAmount, uint256 notaryFeeAmount, string notaryActNumber, uint256 timestamp)",
  "event SaleApproved(address indexed notary, address indexed seller, address indexed agent, uint256 sellerAmount, uint256 agentAmount, uint256 notaryAmount, string notaryActNumber, uint256 timestamp)",
  "event SaleCancelled(address indexed notary, address indexed buyer, uint256 refundAmount, uint256 timestamp)",
  "event RefundedAfterDeadline(address indexed buyer, uint256 refundAmount, uint256 timestamp)"
];

// Fee calculation helpers
export const FEE_HELPERS = {
  MAX_FEE_BP: 2000, // 20%
  DENOMINATOR: 10000,
  
  // Convert percentage to basis points (e.g., 2.5 -> 250)
  percentToBP: (percent) => Math.floor(percent * 100),
  
  // Convert basis points to percentage (e.g., 250 -> 2.5)
  bpToPercent: (bp) => bp / 100,
  
  // Calculate fee amount from price (returns BigInt)
  calcFee: (priceWei, basisPoints) => {
    return (BigInt(priceWei) * BigInt(basisPoints)) / BigInt(10000);
  },
  
  // Calculate total deposit required
  calcTotalDeposit: (priceWei, agentBP, notaryBP) => {
    const price = BigInt(priceWei);
    const agentFee = (price * BigInt(agentBP)) / BigInt(10000);
    const notaryFee = (price * BigInt(notaryBP)) / BigInt(10000);
    return price + agentFee + notaryFee;
  }
};

// Example usage for deploying contract via factory:
/*
const deployParams = {
  buyer: "0x...",
  seller: "0x...",
  notary: "0x...",
  agent: "0x..." or ethers.ZeroAddress if no agent,
  price: ethers.parseEther("1.0"),
  agentFeeBasisPoints: 200,  // 2%
  notaryFeeBasisPoints: 100, // 1%
  propertyDescription: "2-bedroom apartment",
  propertyPDFCid: "QmXxx...",
  contractName: "Sofia Property #123",
  deadlineDays: 30
};

const deployFee = await factory.deployFee();
const tx = await factory.deployRealEstateContract(deployParams, { value: deployFee });
*/
