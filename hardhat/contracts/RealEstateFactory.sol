// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RealEstateFactory
 * @author BRSCryptoPaymentProtocol
 * @dev Factory contract for creating RealEstateDeal contracts with fees
 * 
 * FEE STRUCTURE:
 * - Deploy Fee: Fixed fee when deploying new escrow (paid by deployer, goes to factory owner)
 * - Agent Fee: Percentage of price for real estate agent (set at deploy, immutable after)
 * - Notary Fee: Percentage of price for notary (set at deploy, immutable after)
 */
contract RealEstateFactory is AccessControlEnumerable, ReentrancyGuard {
    // ========== CONSTANTS ==========
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant MAX_FEE_BASIS_POINTS = 2000;
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10000;
    
    // ========== STRUCTS ==========
    
    struct DeployParams {
        address buyer;
        address seller;
        address notary;
        address agent;
        uint256 price;
        uint256 agentFeeBasisPoints;
        uint256 notaryFeeBasisPoints;
        string propertyDescription;
        string propertyPDFCid;
        string contractName;
        uint256 deadlineDays;
    }
    
    struct DeployedContract {
        address contractAddress;
        address deployer;
        string contractName;
        string propertyDescription;
        uint256 price;
        address buyer;
        address seller;
        address notary;
        address agent;
        uint256 agentFeeBasisPoints;
        uint256 notaryFeeBasisPoints;
        uint256 deployedAt;
        bool isActive;
        uint256 deadlineDays;
        string propertyPDFCid;
    }
    
    struct FactoryStats {
        uint256 totalContracts;
        uint256 activeContracts;
        uint256 completedContracts;
        uint256 totalValueLocked;
        uint256 deployFee;
        uint256 collectedFees;
        address[] allAdmins;
        bool isPaused;
        address templateContract;
    }
    
    // ========== STATE VARIABLES ==========
    
    address public templateContract;
    uint256 public deployFee;
    uint256 public collectedFees;
    
    mapping(uint256 => DeployedContract) public deployedContracts;
    mapping(address => uint256[]) public contractsByDeployer;
    mapping(address => uint256[]) public contractsByParticipant;
    uint256 public totalContracts;
    uint256 public activeContracts;
    bool public factoryPaused;
    
    // ========== EVENTS ==========
    
    event ContractDeployed(
        uint256 indexed contractId,
        address indexed contractAddress,
        address indexed deployer,
        string contractName,
        uint256 price,
        uint256 deployFeePaid
    );
    
    event TemplateUpdated(address indexed oldTemplate, address indexed newTemplate);
    event AdminAdded(address indexed admin, address indexed addedBy);
    event AdminRemoved(address indexed admin, address indexed removedBy);
    event FactoryPaused(bool paused);
    event ContractStatusUpdated(uint256 indexed contractId, bool isActive);
    event DeployFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    
    // ========== MODIFIERS ==========
    
    modifier onlyOwnerOrAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(ADMIN_ROLE, msg.sender),
            "Not owner or admin"
        );
        _;
    }
    
    modifier whenNotPaused() {
        require(!factoryPaused, "Factory is paused");
        _;
    }
    
    modifier templateSet() {
        require(templateContract != address(0), "Template not set");
        _;
    }
    
    // ========== CONSTRUCTOR ==========
    
    constructor(address _owner, address _templateContract, uint256 _deployFee) {
        require(_owner != address(0), "Invalid owner address");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        templateContract = _templateContract;
        deployFee = _deployFee;
        
        emit AdminAdded(_owner, address(0));
        if (_templateContract != address(0)) {
            emit TemplateUpdated(address(0), _templateContract);
        }
    }
    
    // ========== TEMPLATE MANAGEMENT ==========
    
    function setTemplateContract(address _templateContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_templateContract != address(0), "Invalid template address");
        require(_templateContract.code.length > 0, "Template must be a contract");
        
        address oldTemplate = templateContract;
        templateContract = _templateContract;
        
        emit TemplateUpdated(oldTemplate, _templateContract);
    }
    
    // ========== FEE MANAGEMENT ==========
    
    function setDeployFee(uint256 _newDeployFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = deployFee;
        deployFee = _newDeployFee;
        emit DeployFeeUpdated(oldFee, _newDeployFee);
    }
    
    function withdrawFees(address _recipient) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(_recipient != address(0), "Invalid recipient");
        require(collectedFees > 0, "No fees to withdraw");
        
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        emit FeesWithdrawn(_recipient, amount);
        
        (bool success, ) = payable(_recipient).call{value: amount}("");
        require(success, "Fee withdrawal failed");
    }
    
    // ========== CONTRACT DEPLOYMENT ==========
    
    function deployRealEstateContract(DeployParams calldata params) 
        external 
        payable
        onlyOwnerOrAdmin 
        whenNotPaused 
        templateSet
        nonReentrant 
        returns (uint256 contractId, address contractAddress) 
    {
        // Validate deploy fee
        require(msg.value >= deployFee, "Insufficient deploy fee");
        
        // Validate params
        _validateDeployParams(params);
        
        // Collect fee and calculate refund
        if (deployFee > 0) {
            collectedFees += deployFee;
        }
        uint256 excess = msg.value - deployFee;
        
        // Assign ID and clone
        contractId = totalContracts;
        totalContracts++;
        contractAddress = _cloneContract(templateContract);
        
        // Store contract data
        _storeContractData(contractId, contractAddress, params);
        
        // Index participants
        _indexParticipants(contractId, params);
        
        activeContracts++;
        
        emit ContractDeployed(
            contractId, 
            contractAddress, 
            msg.sender, 
            params.contractName, 
            params.price, 
            deployFee
        );
        
        // Initialize cloned contract
        _initializeContract(contractAddress, params);
        
        // Refund excess
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Excess refund failed");
        }
        
        return (contractId, contractAddress);
    }
    
    function _validateDeployParams(DeployParams calldata params) private pure {
        require(params.buyer != address(0), "Invalid buyer");
        require(params.seller != address(0), "Invalid seller");
        require(params.notary != address(0), "Invalid notary");
        require(params.buyer != params.seller, "Buyer = seller");
        require(params.buyer != params.notary, "Buyer = notary");
        require(params.seller != params.notary, "Seller = notary");
        
        if (params.agentFeeBasisPoints > 0) {
            require(params.agent != address(0), "Agent required when fee > 0");
        }
        
        require(params.price > 0, "Price must be > 0");
        require(bytes(params.propertyDescription).length > 0, "Empty description");
        require(bytes(params.propertyPDFCid).length > 0, "Empty PDF CID");
        require(bytes(params.contractName).length > 0, "Empty name");
        require(params.deadlineDays > 0, "Deadline must be > 0");
        require(
            params.agentFeeBasisPoints + params.notaryFeeBasisPoints <= MAX_FEE_BASIS_POINTS,
            "Fees exceed 20%"
        );
    }
    
    function _storeContractData(
        uint256 contractId, 
        address contractAddress, 
        DeployParams calldata params
    ) private {
        deployedContracts[contractId] = DeployedContract({
            contractAddress: contractAddress,
            deployer: msg.sender,
            contractName: params.contractName,
            propertyDescription: params.propertyDescription,
            price: params.price,
            buyer: params.buyer,
            seller: params.seller,
            notary: params.notary,
            agent: params.agent,
            agentFeeBasisPoints: params.agentFeeBasisPoints,
            notaryFeeBasisPoints: params.notaryFeeBasisPoints,
            deployedAt: block.timestamp,
            isActive: true,
            deadlineDays: params.deadlineDays,
            propertyPDFCid: params.propertyPDFCid
        });
    }
    
    function _indexParticipants(uint256 contractId, DeployParams calldata params) private {
        contractsByDeployer[msg.sender].push(contractId);
        contractsByParticipant[params.buyer].push(contractId);
        contractsByParticipant[params.seller].push(contractId);
        contractsByParticipant[params.notary].push(contractId);
        if (params.agent != address(0)) {
            contractsByParticipant[params.agent].push(contractId);
        }
    }
    
    function _initializeContract(address contractAddress, DeployParams calldata params) private {
        // Encode the DealParams struct for initialization
        bytes memory initData = abi.encodeWithSignature(
            "initialize((address,address,address,address,uint256,uint256,uint256,string,string,string,uint256))",
            params
        );
        
        (bool success, ) = contractAddress.call(initData);
        require(success, "Initialization failed");
    }
    
    function _cloneContract(address _template) private returns (address clone) {
        bytes32 salt = keccak256(abi.encodePacked(totalContracts, block.timestamp, msg.sender));
        
        bytes memory bytecode = abi.encodePacked(
            hex"3d602d80600a3d3981f3363d3d373d3d3d363d73",
            _template,
            hex"5af43d82803e903d91602b57fd5bf3"
        );
        
        assembly {
            clone := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
        }
        
        require(clone != address(0), "Clone failed");
    }
    
    // ========== ADMIN FUNCTIONS ==========
    
    function addAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_admin != address(0), "Invalid admin");
        require(!hasRole(ADMIN_ROLE, _admin), "Already admin");
        require(!hasRole(DEFAULT_ADMIN_ROLE, _admin), "Cannot add owner as admin");
        
        _grantRole(ADMIN_ROLE, _admin);
        emit AdminAdded(_admin, msg.sender);
    }
    
    function removeAdmin(address _admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(ADMIN_ROLE, _admin), "Not admin");
        
        _revokeRole(ADMIN_ROLE, _admin);
        emit AdminRemoved(_admin, msg.sender);
    }
    
    function pauseFactory(bool _paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        factoryPaused = _paused;
        emit FactoryPaused(_paused);
    }
    
    function markContractInactive(uint256 _contractId) external onlyOwnerOrAdmin {
        require(_contractId < totalContracts, "Contract not exist");
        require(deployedContracts[_contractId].isActive, "Already inactive");
        
        deployedContracts[_contractId].isActive = false;
        activeContracts--;
        
        emit ContractStatusUpdated(_contractId, false);
    }
    
    // ========== VIEW FUNCTIONS ==========
    
    function getFactoryStats() external view returns (FactoryStats memory stats) {
        uint256 adminCount = getRoleMemberCount(ADMIN_ROLE);
        uint256 ownerCount = getRoleMemberCount(DEFAULT_ADMIN_ROLE);
        
        address[] memory admins = new address[](adminCount + ownerCount);
        
        for (uint256 i = 0; i < ownerCount; i++) {
            admins[i] = getRoleMember(DEFAULT_ADMIN_ROLE, i);
        }
        for (uint256 i = 0; i < adminCount; i++) {
            admins[ownerCount + i] = getRoleMember(ADMIN_ROLE, i);
        }
        
        uint256 totalValue = 0;
        for (uint256 i = 0; i < totalContracts; i++) {
            if (deployedContracts[i].isActive) {
                totalValue += deployedContracts[i].contractAddress.balance;
            }
        }
        
        return FactoryStats({
            totalContracts: totalContracts,
            activeContracts: activeContracts,
            completedContracts: totalContracts - activeContracts,
            totalValueLocked: totalValue,
            deployFee: deployFee,
            collectedFees: collectedFees,
            allAdmins: admins,
            isPaused: factoryPaused,
            templateContract: templateContract
        });
    }
    
    function getLatestContracts(uint256 _limit) external view returns (DeployedContract[] memory) {
        require(_limit > 0 && _limit <= 20, "Limit 1-20");
        
        uint256 returnSize = _limit < totalContracts ? _limit : totalContracts;
        DeployedContract[] memory contracts = new DeployedContract[](returnSize);
        
        for (uint256 i = 0; i < returnSize; i++) {
            contracts[i] = deployedContracts[totalContracts - 1 - i];
        }
        
        return contracts;
    }

    function getActiveContracts(uint256 _offset, uint256 _limit) 
        external 
        view 
        returns (DeployedContract[] memory, bool, uint256) 
    {
        require(_limit > 0 && _limit <= 50, "Limit 1-50");
        
        uint256 activeFound = 0;
        for (uint256 i = 0; i < totalContracts; i++) {
            if (deployedContracts[i].isActive) activeFound++;
        }
        
        if (_offset >= activeFound || activeFound == 0) {
            return (new DeployedContract[](0), false, activeFound);
        }
        
        uint256 returnSize = _limit;
        if (_offset + _limit > activeFound) {
            returnSize = activeFound - _offset;
        }
        
        DeployedContract[] memory contracts = new DeployedContract[](returnSize);
        uint256 resultIndex = 0;
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < totalContracts && resultIndex < returnSize; i++) {
            if (deployedContracts[i].isActive) {
                if (currentIndex >= _offset) {
                    contracts[resultIndex] = deployedContracts[i];
                    resultIndex++;
                }
                currentIndex++;
            }
        }
        
        return (contracts, (_offset + returnSize) < activeFound, activeFound);
    }
    
    function getContract(uint256 _contractId) external view returns (DeployedContract memory) {
        require(_contractId < totalContracts, "Contract not exist");
        return deployedContracts[_contractId];
    }
    
    function getContractsByDeployer(address _deployer) external view returns (uint256[] memory) {
        return contractsByDeployer[_deployer];
    }
    
    function getContractsByParticipant(address _participant) external view returns (uint256[] memory) {
        return contractsByParticipant[_participant];
    }
    
    function isAdmin(address _account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, _account);
    }
    
    function isOwner(address _account) external view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _account);
    }
    
    function getAllAdmins() external view returns (address[] memory) {
        uint256 count = getRoleMemberCount(ADMIN_ROLE);
        address[] memory admins = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            admins[i] = getRoleMember(ADMIN_ROLE, i);
        }
        
        return admins;
    }
    
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 withdrawable = address(this).balance - collectedFees;
        require(withdrawable > 0, "No funds");
        
        (bool success, ) = payable(msg.sender).call{value: withdrawable}("");
        require(success, "Withdrawal failed");
    }
    
    receive() external payable {}
}
