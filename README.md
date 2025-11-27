#  Real Estate Escrow System

> **Decentralized escrow platform for secure property transactions on EVM-compatible blockchains**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-6.x-7A98FB)](https://docs.ethers.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Network](https://img.shields.io/badge/Testnet-Sepolia-blue)](https://sepolia.etherscan.io/)
[![Status](https://img.shields.io/badge/Status-MVP-orange)]()

---

##  Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [Fee Structure](#-fee-structure)
- [Participant Flows](#-participant-flows)
  - [Buyer Flow](#-buyer-flow)
  - [Seller Flow](#-seller-flow)
  - [Notary Flow](#-notary-flow)
  - [Agent Flow](#-agent-flow)
- [Technical Stack](#-technical-stack)
- [Smart Contract Architecture](#-smart-contract-architecture)
- [Security Audit](#-security-audit)
- [Deployment](#-deployment)
- [Local Development](#-local-development)
- [Testing Program](#-testing-program)
- [Roadmap](#-roadmap)
- [Contact](#-contact)

---

##  Overview

Real Estate Escrow System is a **trustless, decentralized escrow platform** designed for secure transactions of **any type of movable and immovable property**:

-  Real estate (apartments, houses, land)
-  Vehicles (cars, motorcycles, boats)
-  High-value assets (art, collectibles)
-  Any property requiring secure third-party verification

The platform eliminates the need for traditional intermediaries by leveraging smart contracts to hold funds securely until all parties fulfill their obligations. A licensed notary verifies the transaction off-chain and triggers the on-chain settlement.

### Why Blockchain Escrow?

| Traditional Escrow | Blockchain Escrow |
|-------------------|-------------------|
| High fees (2-5%) | Minimal gas fees |
| Days to settle | Minutes to settle |
| Trust in intermediary | Trustless smart contracts |
| Limited transparency | Full on-chain transparency |
| Geographic restrictions | Global accessibility |

---

## Key Features

- ** Trustless Escrow** — Funds are locked in smart contracts, not controlled by any single party
- ** Multi-Party Support** — Buyer, Seller, Notary, and optional Agent roles
- ** Flexible Fee System** — Configurable agent and notary fees (0-20%)
- ** Deadline Protection** — Automatic refund capability after deadline expiration
- ** IPFS Integration** — Property documents stored on decentralized storage
- ** Multi-Chain Ready** — Deployable on any EVM-compatible blockchain
- ** Modern UI** — React-based interface with dark/light theme support
- ** Full Transparency** — All transactions verifiable on-chain

---

##  How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          ESCROW LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. DEPLOY          2. DEPOSIT           3. VERIFY          4. SETTLE   │
│  ─────────          ──────────           ─────────          ──────────  │
│                                                                          │
│  Admin creates      Buyer deposits       Notary verifies    Funds are   │
│  escrow contract    full amount          off-chain deal     distributed │
│  with all terms     (price + fees)       and approves       automatically│
│                                                                          │
│  ┌─────────┐       ┌─────────┐          ┌─────────┐        ┌─────────┐  │
│  │ Factory │ ───▶  │ Escrow  │ ───▶     │ Notary  │ ───▶   │ Parties │  │
│  │ Deploy  │       │ Contract│          │ Decision│        │ Receive │  │
│  └─────────┘       └─────────┘          └─────────┘        └─────────┘  │
│                                                                          │
│                         OR (if cancelled/expired)                        │
│                                                                          │
│                     ┌─────────────────────────────┐                      │
│                     │   Full Refund to Buyer      │                      │
│                     └─────────────────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

##  Fee Structure

The system supports a flexible, transparent fee structure:

### Fee Types

| Fee Type | Description | Range | Recipient |
|----------|-------------|-------|-----------|
| **Deploy Fee** | Fixed fee for creating new escrow | Configurable | Factory Owner |
| **Agent Fee** | Commission for real estate agent | 0-20% | Agent |
| **Notary Fee** | Commission for notary services | 0-20% | Notary |

### Fee Calculation Example

```
Property Price:     1.000 ETH
Agent Fee (2%):     0.020 ETH
Notary Fee (1%):    0.010 ETH
─────────────────────────────
Total Deposit:      1.030 ETH

On Approval:
  → Seller receives:  1.000 ETH
  → Agent receives:   0.020 ETH
  → Notary receives:  0.010 ETH
```

> **Note:** Combined agent + notary fees cannot exceed 20% (2000 basis points)

---

##  Participant Flows

### Buyer Flow

```
┌────────────────────────────────────────────────────────────┐
│                      BUYER JOURNEY                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Connect Wallet                                          │
│     └─▶ Connect MetaMask to Sepolia network                │
│                                                             │
│  2. View Contract Details                                   │
│     └─▶ Review price, fees, property documents (IPFS)      │
│     └─▶ Verify all parties' addresses                      │
│                                                             │
│  3. Make Deposit                                            │
│     └─▶ Enter notary act number                            │
│     └─▶ Deposit: Price + Agent Fee + Notary Fee            │
│     └─▶ Funds locked in smart contract                     │
│                                                             │
│  4. Wait for Notary Decision                                │
│     └─▶ Notary approves → Funds distributed                │
│     └─▶ Notary cancels → Full refund                       │
│                                                             │
│  5. Deadline Protection                                     │
│     └─▶ If deadline expires without decision               │
│     └─▶ Buyer can claim full refund                        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Buyer Actions:**
- `deposit(notaryActNumber)` — Lock funds in escrow
- `refundAfterDeadline()` — Claim refund if deadline passed

---

### Seller Flow

```
┌────────────────────────────────────────────────────────────┐
│                      SELLER JOURNEY                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Provide Information                                     │
│     └─▶ Property description and documents                 │
│     └─▶ Upload documents to IPFS                           │
│     └─▶ Agree on price and terms                           │
│                                                             │
│  2. Contract Creation                                       │
│     └─▶ Admin/Agent creates escrow with seller's address   │
│     └─▶ Seller verifies contract terms                     │
│                                                             │
│  3. Wait for Deposit                                        │
│     └─▶ Monitor contract status                            │
│     └─▶ Buyer deposits funds                               │
│                                                             │
│  4. Complete Off-Chain Transfer                             │
│     └─▶ Sign property transfer documents                   │
│     └─▶ Notary verifies and records transfer               │
│                                                             │
│  5. Receive Payment                                         │
│     └─▶ Notary approves on-chain                           │
│     └─▶ Automatically receive property price               │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Seller Role:**
- Passive participant in smart contract
- Receives funds automatically upon notary approval
- No direct contract interactions required

---

### Notary Flow

```
┌────────────────────────────────────────────────────────────┐
│                      NOTARY JOURNEY                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Review Contract                                         │
│     └─▶ Verify all parties and terms                       │
│     └─▶ Check property documents on IPFS                   │
│                                                             │
│  2. Monitor Deposit                                         │
│     └─▶ Wait for buyer's deposit                           │
│     └─▶ Verify deposit amount matches requirements         │
│                                                             │
│  3. Off-Chain Verification                                  │
│     └─▶ Verify property ownership                          │
│     └─▶ Check legal requirements                           │
│     └─▶ Witness document signing                           │
│     └─▶ Record notary act number                           │
│                                                             │
│  4. On-Chain Decision                                       │
│                                                             │
│     ┌─────────────────┐    ┌─────────────────┐             │
│     │  APPROVE SALE   │    │  CANCEL SALE    │             │
│     ├─────────────────┤    ├─────────────────┤             │
│     │ Confirm notary  │    │ Issue detected  │             │
│     │ act number      │    │ or fraud found  │             │
│     │                 │    │                 │             │
│     │ ▼               │    │ ▼               │             │
│     │ Seller: Price   │    │ Buyer: Full     │             │
│     │ Agent: Fee      │    │ refund of all   │             │
│     │ Notary: Fee     │    │ deposited funds │             │
│     └─────────────────┘    └─────────────────┘             │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Notary Actions:**
- `approveSale(notaryActNumber)` — Approve and distribute funds
- `cancelSale()` — Cancel and refund buyer

---

### Agent Flow

```
┌────────────────────────────────────────────────────────────┐
│                      AGENT JOURNEY                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Facilitate Deal                                         │
│     └─▶ Connect buyer and seller                           │
│     └─▶ Negotiate terms and price                          │
│     └─▶ Arrange property viewings                          │
│                                                             │
│  2. Prepare Documentation                                   │
│     └─▶ Gather property documents                          │
│     └─▶ Upload to IPFS                                     │
│     └─▶ Coordinate with notary                             │
│                                                             │
│  3. Contract Creation (if Admin)                            │
│     └─▶ Deploy escrow contract                             │
│     └─▶ Set agreed agent fee percentage                    │
│                                                             │
│  4. Monitor Progress                                        │
│     └─▶ Track deposit status                               │
│     └─▶ Coordinate off-chain processes                     │
│                                                             │
│  5. Receive Commission                                      │
│     └─▶ Automatic payment upon notary approval             │
│     └─▶ Fee calculated from property price                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Agent Role:**
- Optional participant (address can be zero if no agent)
- Receives commission automatically upon approval
- May have Admin role for contract deployment

---

## 🛠 Technical Stack

### Smart Contracts

| Technology | Version | Purpose |
|------------|---------|---------|
| Solidity | 0.8.20 | Smart contract language |
| OpenZeppelin | 4.9.x | Security standards & utilities |
| Hardhat | 2.x | Development & testing framework |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| Ethers.js | 6.x | Ethereum interaction |
| MetaMask | - | Wallet connection |

### Infrastructure

| Service | Purpose |
|---------|---------|
| IPFS | Decentralized document storage |
| Sepolia | Ethereum testnet deployment |
| Etherscan | Contract verification |

---

##  Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTRACT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RealEstateFactory.sol                   │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  • Deploys new escrow contracts (Clone pattern)     │    │
│  │  • Manages admin roles (Owner, Admins)              │    │
│  │  • Collects deploy fees                             │    │
│  │  • Tracks all deployed contracts                    │    │
│  │  • Pause/unpause functionality                      │    │
│  │                                                      │    │
│  │  Inherits: AccessControlEnumerable, ReentrancyGuard │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│                         │ creates clones                     │
│                         ▼                                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              RealEstateDeal.sol                      │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  • Holds escrowed funds                             │    │
│  │  • Manages deal lifecycle                           │    │
│  │  • Distributes funds on approval                    │    │
│  │  • Handles refunds on cancellation                  │    │
│  │  • Deadline-based automatic refunds                 │    │
│  │                                                      │    │
│  │  Inherits: ReentrancyGuard                          │    │
│  │                                                      │    │
│  │  Key Structs:                                        │    │
│  │  └─ DealParams (initialization parameters)          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Contract Functions

#### RealEstateFactory

| Function | Access | Description |
|----------|--------|-------------|
| `deployRealEstateContract()` | Admin | Create new escrow |
| `setDeployFee()` | Owner | Update deploy fee |
| `withdrawFees()` | Owner | Withdraw collected fees |
| `addAdmin()` / `removeAdmin()` | Owner | Manage admins |
| `pauseFactory()` | Owner | Emergency pause |

#### RealEstateDeal

| Function | Access | Description |
|----------|--------|-------------|
| `deposit()` | Buyer | Lock funds in escrow |
| `approveSale()` | Notary | Approve and distribute |
| `cancelSale()` | Notary | Cancel and refund |
| `refundAfterDeadline()` | Buyer | Claim refund after deadline |

---

##  Security Audit

### Slither Static Analysis

All contracts have been analyzed using [Slither](https://github.com/crytic/slither), a Solidity static analysis framework.

#### Audit Results Summary

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 High | 0 |  None found |
| 🟠 Medium | 0 |  None found |
| 🟡 Low | 2 |  Acceptable (by design) |
| 🔵 Informational | 5 |  Reviewed |

#### Detailed Findings

<details>
<summary><b>Low Severity (Acceptable)</b></summary>

**1. Missing zero-check on templateContract in constructor**
- **Status:** By Design
- **Reason:** Template can be set later via `setTemplateContract()`

**2. Timestamp comparisons for deadlines**
- **Status:** Acceptable
- **Reason:** ±15 second variance is negligible for day-based deadlines

</details>

<details>
<summary><b>Informational (Reviewed)</b></summary>

- Low-level calls for ETH transfers — Required, with proper success checks
- OpenZeppelin library warnings — External code, maintained by OZ team
- Naming convention suggestions — Cosmetic only

</details>

### Security Features

-  **ReentrancyGuard** on all external functions with transfers
-  **CEI Pattern** (Checks-Effects-Interactions) throughout
-  **Access Control** with role-based permissions
-  **SafeERC20** patterns for future token support
-  **Immutable fee parameters** after contract initialization
-  **Maximum fee cap** (20%) to prevent abuse

---

## Deployment

### Current Testnet Deployment (Sepolia)

| Contract | Address |
|----------|---------|
| RealEstateFactory | `[FACTORY_ADDRESS]` |
| RealEstateDeal (Template) | `[TEMPLATE_ADDRESS]` |

> Replace with actual addresses after deployment

### Verified on Etherscan

All contracts are verified and source code is publicly available on [Sepolia Etherscan](https://sepolia.etherscan.io/).

---

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask browser extension

### Installation

```bash
# Clone repository
git clone https://github.com/[username]/real-estate-escrow.git
cd real-estate-escrow

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy-factory.js --network sepolia
```

### Environment Variables

```env
# Blockchain
INFURA_API_KEY=your_infura_key
USER1_PRIVATE_KEY=your_deployer_private_key

# Verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

---

##  Testing Program

###  We're Looking for Testers!

This is an **MVP (Minimum Viable Product)** deployed on Sepolia testnet. We're actively seeking testers to help improve the platform.

### What We Offer

| Benefit | Details |
|---------|---------|
|  **Private Sepolia Faucet** | 0.5 ETH per day for testing |
|  **Direct Developer Access** | Feedback goes straight to the developer |
|  **Recognition** | Active testers credited in project |

### How to Participate

1. **Visit** the live demo at `[DEMO_URL]`
2. **Test** various scenarios (buyer, seller, notary flows)
3. **Document** any issues, bugs, or suggestions
4. **Submit** feedback via the contact form

### What We're Looking For

-  Bug reports with reproduction steps
-  UX/UI improvement suggestions
-  Security concerns or edge cases
-  Mobile responsiveness issues
-  Performance observations

---

## 🗺 Roadmap

### Phase 1: MVP 
- [x] Core smart contracts
- [x] Factory pattern deployment
- [x] Fee system (agent + notary)
- [x] React frontend
- [x] Sepolia testnet deployment
- [x] Security audit (Slither)

### Phase 2: Beta (In Progress)
- [ ] Comprehensive test suite
- [ ] Multi-language support
- [ ] Mobile-responsive improvements
- [ ] Additional testnet deployments
- [ ] Community testing program

### Phase 3: Production
- [ ] Professional security audit
- [ ] Mainnet deployment
- [ ] Multi-chain support (Polygon, BSC)
- [ ] ERC20 token payments
- [ ] Advanced dispute resolution

### Phase 4: Scale
- [ ] DAO governance
- [ ] Insurance integration
- [ ] API for third-party integration
- [ ] White-label solutions

---

##  Contact

### Developer

**Slavcho Ivanov**

-  Website: [me.slavy.space](https://me.slavy.space)
-  Contact: Use the contact form on my website

### Feedback & Support

For bug reports, feature requests, or testing program inquiries, please use the **contact form** on my personal website. All feedback is reviewed and appreciated.

---

##  License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built for the decentralized future**

⭐ Star this repo if you find it useful!

</div>
