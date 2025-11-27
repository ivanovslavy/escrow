// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title RealEstateDeal
 * @author BRSCryptoPaymentProtocol
 * @dev Escrow contract for real estate transactions with automatic fee distribution
 * @notice Manages deposits and transfers for property deals
 * 
 * FEE STRUCTURE:
 * - Agent Fee: Percentage of price, goes to real estate agent
 * - Notary Fee: Percentage of price, goes to notary
 * - Buyer deposits: price + agentFee + notaryFee
 * - On approve: seller receives price, agent receives agentFee, notary receives notaryFee
 * 
 * Fees are in basis points (1% = 100, 0.5% = 50, 10% = 1000)
 * Maximum combined fee: 20% (2000 basis points)
 */
contract RealEstateDeal is ReentrancyGuard {
    // ========== CONSTANTS ==========
    uint256 public constant MAX_FEE_BASIS_POINTS = 2000;
    uint256 public constant BASIS_POINTS_DENOMINATOR = 10000;

    // ========== STRUCTS ==========
    
    struct DealParams {
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

    // ========== STATE VARIABLES ==========
    
    address public buyer;
    address public seller;
    address public notary;
    address public agent;
    
    uint256 public price;
    string public propertyDescription;
    string public propertyPDFCid;
    string public contractName;

    uint256 public agentFeeBasisPoints;
    uint256 public notaryFeeBasisPoints;
    uint256 public agentFeeAmount;
    uint256 public notaryFeeAmount;
    uint256 public totalDepositRequired;

    uint256 public depositTime;
    bool public isDeposited;
    bool public isFinalized;
    string public notaryActNumber;
    bool public initialized;
    uint256 public deadlineDuration;

    // ========== EVENTS ==========
    
    event DealCreated(
        address indexed buyer,
        address indexed seller,
        address indexed notary,
        address agent,
        uint256 price,
        uint256 agentFeeBasisPoints,
        uint256 notaryFeeBasisPoints,
        uint256 totalDepositRequired,
        string contractName
    );

    event DepositMade(
        address indexed buyer, 
        uint256 totalAmount,
        uint256 priceAmount,
        uint256 agentFeeAmount,
        uint256 notaryFeeAmount,
        string notaryActNumber,
        uint256 timestamp
    );
    
    event SaleApproved(
        address indexed notary,
        address indexed seller,
        address indexed agent,
        uint256 sellerAmount,
        uint256 agentAmount,
        uint256 notaryAmount,
        string notaryActNumber,
        uint256 timestamp
    );
    
    event SaleCancelled(
        address indexed notary, 
        address indexed buyer,
        uint256 refundAmount,
        uint256 timestamp
    );
    
    event RefundedAfterDeadline(
        address indexed buyer, 
        uint256 refundAmount,
        uint256 timestamp
    );

    // ========== MODIFIERS ==========
    
    modifier onlyInitialized() {
        require(initialized, "Contract not initialized");
        _;
    }

    modifier onlyOnce() {
        require(!initialized, "Already initialized");
        _;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this");
        _;
    }

    modifier onlyNotary() {
        require(msg.sender == notary, "Only notary can call this");
        _;
    }

    modifier notFinalized() {
        require(!isFinalized, "Sale already finalized");
        _;
    }

    modifier hasDeposit() {
        require(isDeposited, "No deposit made");
        _;
    }

    // ========== CONSTRUCTOR ==========
    
    constructor() {}

    // ========== INITIALIZATION ==========

    function initialize(DealParams calldata params) external onlyOnce {
        _validateParams(params);
        _setParticipants(params);
        _setFeesAndAmounts(params);
        _setPropertyInfo(params);
        
        initialized = true;

        emit DealCreated(
            params.buyer,
            params.seller,
            params.notary,
            params.agent,
            params.price,
            params.agentFeeBasisPoints,
            params.notaryFeeBasisPoints,
            totalDepositRequired,
            params.contractName
        );
    }

    function _validateParams(DealParams calldata params) private pure {
        require(params.buyer != address(0), "Invalid buyer address");
        require(params.seller != address(0), "Invalid seller address");
        require(params.notary != address(0), "Invalid notary address");
        require(params.buyer != params.seller, "Buyer and seller cannot be the same");
        require(params.buyer != params.notary, "Buyer and notary cannot be the same");
        require(params.seller != params.notary, "Seller and notary cannot be the same");
        
        if (params.agentFeeBasisPoints > 0) {
            require(params.agent != address(0), "Agent address required when agent fee > 0");
            require(params.agent != params.buyer, "Agent cannot be buyer");
            require(params.agent != params.seller, "Agent cannot be seller");
            require(params.agent != params.notary, "Agent cannot be notary");
        }
        
        require(params.price > 0, "Price must be greater than 0");
        require(bytes(params.propertyDescription).length > 0, "Property description cannot be empty");
        require(bytes(params.propertyPDFCid).length > 0, "Property PDF CID cannot be empty");
        require(bytes(params.contractName).length > 0, "Contract name cannot be empty");
        require(params.deadlineDays > 0 && params.deadlineDays <= 365, "Deadline must be 1-365 days");
        require(
            params.agentFeeBasisPoints + params.notaryFeeBasisPoints <= MAX_FEE_BASIS_POINTS,
            "Combined fees exceed maximum 20%"
        );
    }

    function _setParticipants(DealParams calldata params) private {
        buyer = params.buyer;
        seller = params.seller;
        notary = params.notary;
        agent = params.agent;
    }

    function _setFeesAndAmounts(DealParams calldata params) private {
        price = params.price;
        agentFeeBasisPoints = params.agentFeeBasisPoints;
        notaryFeeBasisPoints = params.notaryFeeBasisPoints;
        
        agentFeeAmount = (params.price * params.agentFeeBasisPoints) / BASIS_POINTS_DENOMINATOR;
        notaryFeeAmount = (params.price * params.notaryFeeBasisPoints) / BASIS_POINTS_DENOMINATOR;
        totalDepositRequired = params.price + agentFeeAmount + notaryFeeAmount;
    }

    function _setPropertyInfo(DealParams calldata params) private {
        propertyDescription = params.propertyDescription;
        propertyPDFCid = params.propertyPDFCid;
        contractName = params.contractName;
        deadlineDuration = params.deadlineDays * 1 days;
    }

    // ========== BUYER FUNCTIONS ==========

    function deposit(string calldata _notaryActNumber) 
        external 
        payable 
        nonReentrant 
        onlyInitialized 
        onlyBuyer
    {
        require(!isDeposited, "Deposit already made");
        require(msg.value == totalDepositRequired, "Incorrect deposit amount");
        require(bytes(_notaryActNumber).length > 0, "Notary act number cannot be empty");

        isDeposited = true;
        depositTime = block.timestamp;
        notaryActNumber = _notaryActNumber;

        emit DepositMade(
            buyer, 
            msg.value, 
            price,
            agentFeeAmount,
            notaryFeeAmount,
            _notaryActNumber, 
            block.timestamp
        );
    }

    function refundAfterDeadline() 
        external 
        nonReentrant 
        onlyInitialized 
        onlyBuyer
        hasDeposit
        notFinalized
    {
        require(block.timestamp >= depositTime + deadlineDuration, "Deadline not reached yet");

        isFinalized = true;
        uint256 refundAmount = address(this).balance;

        emit RefundedAfterDeadline(msg.sender, refundAmount, block.timestamp);

        (bool success, ) = payable(buyer).call{value: refundAmount}("");
        require(success, "Refund to buyer failed");
    }

    // ========== NOTARY FUNCTIONS ==========

    function approveSale(string calldata _notaryActNumber) 
        external 
        nonReentrant 
        onlyInitialized 
        onlyNotary
        hasDeposit
        notFinalized
    {
        require(block.timestamp <= depositTime + deadlineDuration, "Deadline exceeded");
        require(
            keccak256(bytes(_notaryActNumber)) == keccak256(bytes(notaryActNumber)),
            "Notary act number mismatch"
        );

        isFinalized = true;
        
        uint256 sellerAmount = price;
        uint256 agentAmount = agentFeeAmount;
        uint256 notaryAmount = notaryFeeAmount;

        emit SaleApproved(
            msg.sender, seller, agent,
            sellerAmount, agentAmount, notaryAmount,
            _notaryActNumber, block.timestamp
        );

        (bool sellerSuccess, ) = payable(seller).call{value: sellerAmount}("");
        require(sellerSuccess, "Transfer to seller failed");
        
        if (agentAmount > 0 && agent != address(0)) {
            (bool agentSuccess, ) = payable(agent).call{value: agentAmount}("");
            require(agentSuccess, "Transfer to agent failed");
        }
        
        if (notaryAmount > 0) {
            (bool notarySuccess, ) = payable(notary).call{value: notaryAmount}("");
            require(notarySuccess, "Transfer to notary failed");
        }
    }

    function cancelSale() 
        external 
        nonReentrant 
        onlyInitialized 
        onlyNotary
        hasDeposit
        notFinalized
    {
        isFinalized = true;
        uint256 refundAmount = address(this).balance;

        emit SaleCancelled(msg.sender, buyer, refundAmount, block.timestamp);

        (bool success, ) = payable(buyer).call{value: refundAmount}("");
        require(success, "Refund to buyer failed");
    }

    // ========== VIEW FUNCTIONS ==========

    function getFeeInfo() 
        external 
        view 
        onlyInitialized 
        returns (
            uint256, uint256, uint256, uint256, uint256, address
        ) 
    {
        return (
            agentFeeBasisPoints,
            notaryFeeBasisPoints,
            agentFeeAmount,
            notaryFeeAmount,
            totalDepositRequired,
            agent
        );
    }

    function getContractStatus() 
        external 
        view 
        onlyInitialized 
        returns (bool, bool, uint256, uint256, uint256) 
    {
        uint256 deadline = isDeposited ? depositTime + deadlineDuration : 0;
        uint256 remaining = 0;
        
        if (isDeposited && !isFinalized && block.timestamp < deadline) {
            remaining = deadline - block.timestamp;
        }
        
        return (isDeposited, isFinalized, remaining, address(this).balance, deadline);
    }

    function getPropertyPDFUrl() external view onlyInitialized returns (string memory) {
        return string(abi.encodePacked("https://ipfs.io/ipfs/", propertyPDFCid));
    }

    function getContractInfo() 
        external 
        view 
        onlyInitialized 
        returns (
            string memory, address, address, address, address,
            uint256, uint256, string memory, uint256
        ) 
    {
        return (
            contractName, buyer, seller, notary, agent,
            price, totalDepositRequired, propertyDescription,
            deadlineDuration / 1 days
        );
    }

    function isParticipant(address _address) external view onlyInitialized returns (bool) {
        return _address == buyer || _address == seller || _address == notary || _address == agent;
    }

    function isActive() external view onlyInitialized returns (bool) {
        return isDeposited && !isFinalized;
    }

    function isDeadlineExpired() external view onlyInitialized returns (bool) {
        if (!isDeposited) return false;
        return block.timestamp >= depositTime + deadlineDuration;
    }

    // ========== FALLBACK ==========

    receive() external payable {
        revert("Direct ETH transfers not allowed");
    }

    fallback() external payable {
        revert("Function not found");
    }
}
