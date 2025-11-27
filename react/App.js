import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, CONTRACTS, FACTORY_ABI, DEAL_ABI } from './hardhat-config';

// =================== COLOR SCHEME ===================
const COLORS = {
  dark: {
    primary: '#2c3e50',
    secondary: '#34495e',
    accent: '#e74c3c',
    bg: '#1a1a2e',
    surface: '#16213e',
    text: '#ecf0f1',
    textSecondary: '#95a5a6',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    border: '#34495e',
    info: '#3498db'
  },
  light: {
    primary: '#34495e',
    secondary: '#7f8c8d',
    accent: '#e74c3c',
    bg: '#ecf0f1',
    surface: '#ffffff',
    text: '#2c3e50',
    textSecondary: '#7f8c8d',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    border: '#bdc3c7',
    info: '#3498db'
  }
};

// =================== TRANSACTION STATUS COMPONENT ===================
function TransactionStatus({ status, txHash, colors }) {
  if (!status) return null;

  const getStatusInfo = () => {
    switch (status) {
      case 'pending':
        return { 
          text: 'Waiting for wallet confirmation...', 
          color: colors.warning,
          icon: '◐'
        };
      case 'processing':
        return { 
          text: 'Transaction submitted. Waiting for blockchain confirmation...', 
          color: colors.info,
          icon: '◑'
        };
      case 'success':
        return { 
          text: 'Transaction confirmed!', 
          color: colors.success,
          icon: '✓'
        };
      case 'failed':
        return { 
          text: 'Transaction failed', 
          color: colors.error,
          icon: '✗'
        };
      default:
        return null;
    }
  };

  const info = getStatusInfo();
  if (!info) return null;

  return (
    <div style={{
      padding: '12px 16px',
      backgroundColor: info.color + '15',
      border: `1px solid ${info.color}`,
      borderRadius: '8px',
      marginTop: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: status === 'pending' || status === 'processing' ? 'pulse 1.5s infinite' : 'none'
    }}>
      <span style={{ 
        fontSize: '20px', 
        color: info.color,
        animation: status === 'pending' || status === 'processing' ? 'spin 1s linear infinite' : 'none'
      }}>
        {info.icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ color: info.color, fontWeight: 'bold', fontSize: '14px' }}>
          {info.text}
        </div>
        {txHash && (
          <a 
            href={`${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              color: colors.accent, 
              fontSize: '12px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '4px'
            }}
          >
            View on Explorer →
          </a>
        )}
      </div>
    </div>
  );
}

// =================== TOOLTIP COMPONENT ===================
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          marginBottom: '8px',
          maxWidth: '300px',
          textAlign: 'center'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid rgba(0,0,0,0.9)'
          }} />
        </div>
      )}
    </div>
  );
}

// =================== MAIN APP COMPONENT ===================
export default function App() {
  const [theme, setTheme] = useState('dark');
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [factoryContract, setFactoryContract] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const colors = COLORS[theme];

  // =================== WEB3 CONNECTION ===================
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!window.ethereum) {
        throw new Error('MetaMask is not installed!');
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();

      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
                chainName: NETWORK_CONFIG.chainName,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: [NETWORK_CONFIG.blockExplorer],
                nativeCurrency: NETWORK_CONFIG.nativeCurrency
              }]
            });
          } else {
            throw switchError;
          }
        }
      }

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);

      const factory = new ethers.Contract(CONTRACTS.FACTORY, FACTORY_ABI, web3Signer);
      setFactoryContract(factory);

      const isOwner = await factory.isOwner(accounts[0]);
      const isAdmin = await factory.isAdmin(accounts[0]);
      
      if (isOwner) {
        setUserRole('owner');
      } else if (isAdmin) {
        setUserRole('admin');
      } else {
        setUserRole('user');
      }

      setSuccess('Wallet connected successfully!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // =================== DISCONNECT WALLET ===================
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setFactoryContract(null);
    setUserRole(null);
    setStats(null);
    setContracts([]);
    setActiveTab('dashboard');
    setSuccess('Wallet disconnected');
    setTimeout(() => setSuccess(null), 3000);
  };

  // =================== LOAD FACTORY STATS ===================
  const loadStats = useCallback(async () => {
    if (!factoryContract || !provider) return;
    
    try {
      const factoryStats = await factoryContract.getFactoryStats();
      const total = Number(factoryStats.totalContracts);
      
      // Get factory balance for collected fees
      const factoryBalance = await provider.getBalance(CONTRACTS.FACTORY);
      
      // Calculate real TVL and count statuses
      let realTVL = 0n;
      let activeCount = 0;
      let completedCount = 0;
      
      for (let i = 0; i < total; i++) {
        try {
          const contractData = await factoryContract.getContract(i);
          const dealContract = new ethers.Contract(contractData.contractAddress, DEAL_ABI, provider);
          const status = await dealContract.getContractStatus();
          const isFinalized = status[1];
          
          if (isFinalized) {
            completedCount++;
          } else {
            activeCount++;
            // Only count TVL from non-finalized contracts
            const balance = await provider.getBalance(contractData.contractAddress);
            realTVL += balance;
          }
        } catch (e) {
          console.error(`Error checking contract ${i}:`, e);
        }
      }

      setStats({
        totalContracts: total,
        activeContracts: activeCount,
        completedContracts: completedCount,
        totalValueLocked: ethers.formatEther(realTVL),
        deployFee: ethers.formatEther(factoryStats.deployFee),
        deployFeeWei: factoryStats.deployFee,
        collectedFees: ethers.formatEther(factoryBalance),
        collectedFeesWei: factoryBalance,
        isPaused: factoryStats.isPaused,
        admins: factoryStats.allAdmins
      });
    } catch (err) {
      console.error('Stats loading error:', err);
    }
  }, [factoryContract, provider]);

  // =================== LOAD CONTRACTS ===================
  const loadContracts = useCallback(async () => {
    if (!factoryContract || !provider) return;
    
    try {
      setLoading(true);
      const totalContracts = await factoryContract.totalContracts();
      
      if (Number(totalContracts) === 0) {
        setContracts([]);
        return;
      }

      const limit = Math.min(20, Number(totalContracts));
      const latestContracts = await factoryContract.getLatestContracts(limit);
      
      const contractsWithStatus = await Promise.all(
        latestContracts.map(async (c) => {
          let isFinalized = false;
          let isDeposited = false;
          
          try {
            const dealContract = new ethers.Contract(c.contractAddress, DEAL_ABI, provider);
            const status = await dealContract.getContractStatus();
            isDeposited = status[0];
            isFinalized = status[1];
          } catch (e) {
            console.error('Error getting deal status:', e);
          }
          
          return {
            address: c.contractAddress,
            deployer: c.deployer,
            name: c.contractName,
            description: c.propertyDescription,
            price: ethers.formatEther(c.price),
            priceWei: c.price,
            buyer: c.buyer,
            seller: c.seller,
            notary: c.notary,
            agent: c.agent,
            agentFeeBP: Number(c.agentFeeBasisPoints),
            notaryFeeBP: Number(c.notaryFeeBasisPoints),
            deployedAt: new Date(Number(c.deployedAt) * 1000),
            isActive: !isFinalized,
            isDeposited: isDeposited,
            isFinalized: isFinalized,
            deadlineDays: Number(c.deadlineDays),
            pdfCid: c.propertyPDFCid
          };
        })
      );
      
      setContracts(contractsWithStatus);

    } catch (err) {
      console.error('Contracts loading error:', err);
      setError('Error loading contracts');
    } finally {
      setLoading(false);
    }
  }, [factoryContract, provider]);

  // =================== EFFECTS ===================
  useEffect(() => {
    if (factoryContract && provider) {
      loadStats();
      loadContracts();
    }
  }, [factoryContract, provider, loadStats, loadContracts]);

  useEffect(() => {
    if (!factoryContract || !provider) return;
    const interval = setInterval(() => {
      loadStats();
      loadContracts();
    }, 10000);
    return () => clearInterval(interval);
  }, [factoryContract, provider, loadStats, loadContracts]);

  // =================== RENDER ===================
  return (
    <div style={styles.app(colors)}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      
      <Header 
        theme={theme}
        setTheme={setTheme}
        account={account}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        userRole={userRole}
        colors={colors}
      />

      <div style={styles.container}>
        {error && <Alert type="error" message={error} onClose={() => setError(null)} colors={colors} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} colors={colors} />}

        {!account ? (
          <WelcomeScreen connectWallet={connectWallet} loading={loading} colors={colors} />
        ) : (
          <>
            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} colors={colors} />

            {activeTab === 'dashboard' && (
              <Dashboard stats={stats} colors={colors} />
            )}

            {activeTab === 'deploy' && (userRole === 'owner' || userRole === 'admin') && (
              <DeployContract 
                factoryContract={factoryContract}
                stats={stats}
                setError={setError}
                setSuccess={setSuccess}
                loadContracts={loadContracts}
                loadStats={loadStats}
                colors={colors}
              />
            )}

            {activeTab === 'contracts' && (
              <ContractsList 
                contracts={contracts}
                account={account}
                signer={signer}
                setError={setError}
                setSuccess={setSuccess}
                loadContracts={loadContracts}
                loadStats={loadStats}
                colors={colors}
              />
            )}

            {activeTab === 'settings' && userRole === 'owner' && (
              <AdminSettings 
                factoryContract={factoryContract}
                stats={stats}
                account={account}
                setError={setError}
                setSuccess={setSuccess}
                loadStats={loadStats}
                colors={colors}
              />
            )}
          </>
        )}
      </div>

      <Footer colors={colors} />
    </div>
  );
}

// =================== HEADER COMPONENT ===================
function Header({ theme, setTheme, account, connectWallet, disconnectWallet, userRole, colors }) {
  return (
    <header style={styles.header(colors)}>
      <div style={styles.headerContent}>
        <div style={styles.logo}>
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Escrow System</span>
        </div>

        <div style={styles.headerRight}>
          {userRole && (
            <div style={styles.roleBadge(colors, userRole)}>
              {userRole === 'owner' ? 'Owner' : userRole === 'admin' ? 'Admin' : 'User'}
            </div>
          )}

          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={styles.themeToggle(colors)}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '○' : '●'}
          </button>

          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={styles.accountBadge(colors)}>
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              <button 
                onClick={disconnectWallet} 
                style={styles.disconnectButton(colors)}
                title="Disconnect wallet"
              >
                ✕
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} style={styles.connectButton(colors)}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

// =================== ALERT COMPONENT ===================
function Alert({ type, message, onClose, colors }) {
  const bgColor = type === 'error' ? colors.error : colors.success;
  return (
    <div style={{...styles.alert(colors), backgroundColor: bgColor}}>
      <span>{message}</span>
      <button onClick={onClose} style={styles.alertClose}>✕</button>
    </div>
  );
}

// =================== WELCOME SCREEN ===================
function WelcomeScreen({ connectWallet, loading, colors }) {
  return (
    <div style={styles.welcome(colors)}>
      <h2 style={{ marginBottom: '20px', fontSize: '28px' }}>Escrow System</h2>
      <p style={{ color: colors.textSecondary, marginBottom: '40px', fontSize: '16px' }}>
        Secure escrow for real estate, vehicles, and valuable assets
      </p>
      <button 
        onClick={connectWallet} 
        disabled={loading}
        style={styles.welcomeButton(colors, loading)}
      >
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}

// =================== TABS COMPONENT ===================
function Tabs({ activeTab, setActiveTab, userRole, colors }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', roles: ['owner', 'admin', 'user'] },
    { id: 'deploy', label: 'New Deal', roles: ['owner', 'admin'] },
    { id: 'contracts', label: 'All Deals', roles: ['owner', 'admin', 'user'] },
    { id: 'settings', label: 'Settings', roles: ['owner'] }
  ];

  return (
    <div style={styles.tabs(colors)}>
      {tabs.filter(tab => tab.roles.includes(userRole)).map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={styles.tab(colors, activeTab === tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// =================== DASHBOARD COMPONENT ===================
function Dashboard({ stats, colors }) {
  if (!stats) {
    return <div style={styles.loading(colors)}>Loading stats...</div>;
  }

  return (
    <div style={styles.dashboard}>
      <h2 style={{ marginBottom: '30px', color: colors.text }}>Dashboard</h2>
      
      <div style={styles.statsGrid}>
        <StatCard title="Total Deals" value={stats.totalContracts} colors={colors} />
        <StatCard title="Active Deals" value={stats.activeContracts} colors={colors} />
        <StatCard title="Completed" value={stats.completedContracts} colors={colors} />
        <StatCard title="Total Value Locked" value={`${parseFloat(stats.totalValueLocked).toFixed(4)} ETH`} colors={colors} />
      </div>

      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Fee Information</h3>
        <div style={styles.statusItem(colors)}>
          <span>Deploy Fee:</span>
          <span style={{ fontWeight: 'bold' }}>{stats.deployFee} ETH</span>
        </div>
        <div style={styles.statusItem(colors)}>
          <span>Collected Fees:</span>
          <span style={{ fontWeight: 'bold', color: colors.success }}>
            {parseFloat(stats.collectedFees).toFixed(4)} ETH
          </span>
        </div>
      </div>

      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>System Status</h3>
        <div style={styles.statusItem(colors)}>
          <span>Factory Status:</span>
          <span style={{ color: stats.isPaused ? colors.error : colors.success }}>
            {stats.isPaused ? 'Paused' : 'Active'}
          </span>
        </div>
        <div style={styles.statusItem(colors)}>
          <span>Admins Count:</span>
          <span>{stats.admins.length}</span>
        </div>
      </div>
    </div>
  );
}

// =================== STAT CARD ===================
function StatCard({ title, value, colors }) {
  return (
    <div style={styles.statCard(colors)}>
      <div style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.text }}>{value}</div>
    </div>
  );
}

// =================== DEPLOY CONTRACT COMPONENT ===================
function DeployContract({ factoryContract, stats, setError, setSuccess, loadContracts, loadStats, colors }) {
  const [formData, setFormData] = useState({
    buyer: '',
    seller: '',
    notary: '',
    agent: '',
    price: '',
    agentFeePercent: '0',
    notaryFeePercent: '0',
    dealDescription: '',
    documentPDFCid: '',
    notarialActNumber: '',
    contractName: '',
    deadlineDays: '30'
  });
  
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const priceWei = formData.price ? ethers.parseEther(formData.price) : 0n;
  const agentBP = Math.floor(parseFloat(formData.agentFeePercent || '0') * 100);
  const notaryBP = Math.floor(parseFloat(formData.notaryFeePercent || '0') * 100);
  
  const agentFeeWei = priceWei > 0n ? (priceWei * BigInt(agentBP)) / 10000n : 0n;
  const notaryFeeWei = priceWei > 0n ? (priceWei * BigInt(notaryBP)) / 10000n : 0n;
  const totalDepositWei = priceWei + agentFeeWei + notaryFeeWei;

  const handleDeploy = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setTxStatus('pending');
      setTxHash(null);

      if (agentBP + notaryBP > 2000) {
        throw new Error('Combined fees cannot exceed 20%');
      }

      if (agentBP > 0 && !formData.agent) {
        throw new Error('Agent address is required when agent fee > 0');
      }

      // Combine description with notarial act number
      const fullDescription = formData.notarialActNumber 
        ? `${formData.dealDescription} [NA#: ${formData.notarialActNumber}]`
        : formData.dealDescription;

      const deployParams = {
        buyer: formData.buyer,
        seller: formData.seller,
        notary: formData.notary,
        agent: formData.agent || ethers.ZeroAddress,
        price: ethers.parseEther(formData.price),
        agentFeeBasisPoints: agentBP,
        notaryFeeBasisPoints: notaryBP,
        propertyDescription: fullDescription,
        propertyPDFCid: formData.documentPDFCid,
        contractName: formData.contractName,
        deadlineDays: parseInt(formData.deadlineDays)
      };

      const deployFee = stats?.deployFeeWei || 0n;

      const tx = await factoryContract.deployRealEstateContract(
        deployParams,
        { 
          value: deployFee,
          gasLimit: 3000000 
        }
      );

      setTxStatus('processing');
      setTxHash(tx.hash);

      await tx.wait();

      setTxStatus('success');
      setSuccess('Deal contract deployed successfully!');
      
      setFormData({
        buyer: '',
        seller: '',
        notary: '',
        agent: '',
        price: '',
        agentFeePercent: '0',
        notaryFeePercent: '0',
        dealDescription: '',
        documentPDFCid: '',
        notarialActNumber: '',
        contractName: '',
        deadlineDays: '30'
      });

      await loadContracts();
      await loadStats();

      setTimeout(() => {
        setTxStatus(null);
        setTxHash(null);
      }, 5000);

    } catch (err) {
      console.error('Deploy error:', err);
      setTxStatus('failed');
      setError(`Deploy error: ${err.message}`);
      setTimeout(() => setTxStatus(null), 5000);
    }
  };

  const isSubmitting = txStatus === 'pending' || txStatus === 'processing';

  return (
    <div style={styles.deployForm(colors)}>
      <h2 style={{ marginBottom: '30px' }}>Create New Escrow Deal</h2>
      
      {stats && parseFloat(stats.deployFee) > 0 && (
        <div style={{
          padding: '15px',
          backgroundColor: colors.warning + '20',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `1px solid ${colors.warning}`
        }}>
          <strong>Deploy Fee:</strong> {stats.deployFee} ETH will be charged
        </div>
      )}
      
      <form onSubmit={handleDeploy}>
        <div style={styles.formGrid}>
          <FormField
            label="Buyer Address"
            value={formData.buyer}
            onChange={(e) => setFormData({...formData, buyer: e.target.value})}
            placeholder="0x... (wallet address of the buyer)"
            tooltip="The Ethereum address of the buyer who will deposit funds"
            required
            colors={colors}
          />
          
          <FormField
            label="Seller Address"
            value={formData.seller}
            onChange={(e) => setFormData({...formData, seller: e.target.value})}
            placeholder="0x... (wallet address of the seller)"
            tooltip="The Ethereum address that will receive payment upon deal completion"
            required
            colors={colors}
          />
          
          <FormField
            label="Notary Address"
            value={formData.notary}
            onChange={(e) => setFormData({...formData, notary: e.target.value})}
            placeholder="0x... (wallet address of the notary)"
            tooltip="The Ethereum address of the notary who will verify and approve the deal"
            required
            colors={colors}
          />
          
          <FormField
            label="Agent Address"
            value={formData.agent}
            onChange={(e) => setFormData({...formData, agent: e.target.value})}
            placeholder="0x... (optional, leave empty if no agent)"
            tooltip="Optional: The agent/broker address who will receive commission"
            colors={colors}
          />
          
          <FormField
            label="Deal Price (ETH)"
            type="number"
            step="0.001"
            value={formData.price}
            onChange={(e) => setFormData({...formData, price: e.target.value})}
            placeholder="1.5 (price in ETH)"
            tooltip="The total price of the deal in ETH"
            required
            colors={colors}
          />
          
          <FormField
            label="Agent Fee (%)"
            type="number"
            step="0.1"
            min="0"
            max="20"
            value={formData.agentFeePercent}
            onChange={(e) => setFormData({...formData, agentFeePercent: e.target.value})}
            placeholder="2.0 (percentage, e.g. 2 = 2%)"
            tooltip="Agent commission as percentage of deal price (0-20%)"
            colors={colors}
          />
          
          <FormField
            label="Notary Fee (%)"
            type="number"
            step="0.1"
            min="0"
            max="20"
            value={formData.notaryFeePercent}
            onChange={(e) => setFormData({...formData, notaryFeePercent: e.target.value})}
            placeholder="1.0 (percentage, e.g. 1 = 1%)"
            tooltip="Notary fee as percentage of deal price (0-20%)"
            colors={colors}
          />
          
          <FormField
            label="Deadline (Days)"
            type="number"
            value={formData.deadlineDays}
            onChange={(e) => setFormData({...formData, deadlineDays: e.target.value})}
            placeholder="30 (number of days)"
            tooltip="Days until deadline. After this period, buyer can request refund"
            required
            colors={colors}
          />
          
          <FormField
            label="Deal Name"
            value={formData.contractName}
            onChange={(e) => setFormData({...formData, contractName: e.target.value})}
            placeholder="e.g. Sofia Apartment Sale #123"
            tooltip="A short, descriptive name for this deal"
            required
            colors={colors}
            fullWidth
          />
          
          <FormField
            label="Deal Description"
            value={formData.dealDescription}
            onChange={(e) => setFormData({...formData, dealDescription: e.target.value})}
            placeholder="Detailed description of the asset being sold..."
            tooltip="Describe the asset: property address, vehicle details, artwork info, etc."
            required
            textarea
            colors={colors}
            fullWidth
          />
          
          <FormField
            label="Document CID (IPFS)"
            value={formData.documentPDFCid}
            onChange={(e) => setFormData({...formData, documentPDFCid: e.target.value})}
            placeholder="QmXxxx... (IPFS hash of the document)"
            tooltip="IPFS Content ID of the deal document (contract, deed, etc.)"
            required
            colors={colors}
            fullWidth
          />
          
          <FormField
            label="Notarial Act Number"
            value={formData.notarialActNumber}
            onChange={(e) => setFormData({...formData, notarialActNumber: e.target.value})}
            placeholder="e.g. 12345/2024 (notarial act reference)"
            tooltip="The official notarial act number for this transaction"
            required
            colors={colors}
            fullWidth
          />
        </div>

        {formData.price && (
          <div style={{
            padding: '20px',
            backgroundColor: colors.bg,
            borderRadius: '8px',
            marginBottom: '20px',
            border: `1px solid ${colors.border}`
          }}>
            <h4 style={{ marginBottom: '15px', color: colors.text }}>Fee Preview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div>
                <span style={{ color: colors.textSecondary }}>Deal Price:</span>
                <span style={{ float: 'right', fontWeight: 'bold' }}>{formData.price} ETH</span>
              </div>
              <div>
                <span style={{ color: colors.textSecondary }}>Agent Fee ({formData.agentFeePercent}%):</span>
                <span style={{ float: 'right' }}>{ethers.formatEther(agentFeeWei)} ETH</span>
              </div>
              <div>
                <span style={{ color: colors.textSecondary }}>Notary Fee ({formData.notaryFeePercent}%):</span>
                <span style={{ float: 'right' }}>{ethers.formatEther(notaryFeeWei)} ETH</span>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${colors.border}`, paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ color: colors.text, fontWeight: 'bold' }}>Total Buyer Deposit:</span>
                <span style={{ float: 'right', fontWeight: 'bold', color: colors.accent, fontSize: '18px' }}>
                  {ethers.formatEther(totalDepositWei)} ETH
                </span>
              </div>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{
            ...styles.submitButton(colors),
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Processing...' : `Deploy Deal ${stats && parseFloat(stats.deployFee) > 0 ? `(+ ${stats.deployFee} ETH fee)` : ''}`}
        </button>

        <TransactionStatus status={txStatus} txHash={txHash} colors={colors} />
      </form>
    </div>
  );
}

// =================== FORM FIELD ===================
function FormField({ label, value, onChange, type = 'text', placeholder, required, textarea, fullWidth, step, min, max, colors, tooltip }) {
  const inputStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const labelContent = (
    <span>
      {label} {required && <span style={{ color: colors.error }}>*</span>}
    </span>
  );

  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: colors.text, fontSize: '14px' }}>
        {tooltip ? (
          <Tooltip text={tooltip}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }}>
              {labelContent}
              <span style={{ 
                fontSize: '12px', 
                color: colors.textSecondary,
                border: `1px solid ${colors.textSecondary}`,
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>?</span>
            </span>
          </Tooltip>
        ) : labelContent}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          rows={4}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          step={step}
          min={min}
          max={max}
          style={inputStyle}
        />
      )}
    </div>
  );
}

// =================== CONTRACTS LIST COMPONENT ===================
function ContractsList({ contracts, account, signer, setError, setSuccess, loadContracts, loadStats, colors }) {
  const [selectedContract, setSelectedContract] = useState(null);

  if (contracts.length === 0) {
    return (
      <div style={styles.emptyState(colors)}>
        <h3>No deals yet</h3>
        <p style={{ color: colors.textSecondary, marginTop: '10px' }}>Create your first escrow deal from the "New Deal" tab</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ marginBottom: '30px', color: colors.text }}>All Deals</h2>
      
      <div style={styles.contractsGrid}>
        {contracts.map((contract, index) => (
          <ContractCard
            key={index}
            contract={contract}
            account={account}
            colors={colors}
            onClick={() => setSelectedContract(contract)}
          />
        ))}
      </div>

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          account={account}
          signer={signer}
          setError={setError}
          setSuccess={setSuccess}
          loadContracts={loadContracts}
          loadStats={loadStats}
          colors={colors}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
}

// =================== CONTRACT CARD ===================
function ContractCard({ contract, account, onClick, colors }) {
  const isParticipant = 
    contract.buyer.toLowerCase() === account.toLowerCase() ||
    contract.seller.toLowerCase() === account.toLowerCase() ||
    contract.notary.toLowerCase() === account.toLowerCase() ||
    (contract.agent && contract.agent !== ethers.ZeroAddress && contract.agent.toLowerCase() === account.toLowerCase());

  const totalFeePercent = (contract.agentFeeBP + contract.notaryFeeBP) / 100;

  const getStatusLabel = () => {
    if (contract.isFinalized) return { text: 'Completed', color: colors.textSecondary };
    if (contract.isDeposited) return { text: 'Funded', color: colors.warning };
    return { text: 'Awaiting Deposit', color: colors.success };
  };

  const status = getStatusLabel();

  return (
    <div 
      onClick={onClick}
      style={{
        ...styles.contractCard(colors),
        border: isParticipant ? `2px solid ${colors.accent}` : `1px solid ${colors.border}`,
        cursor: 'pointer'
      }}
    >
      <div style={styles.contractCardHeader}>
        <h3 style={{ fontSize: '16px', marginBottom: '5px', color: colors.text }}>
          {contract.name}
        </h3>
        <span style={{
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: status.color,
          color: '#fff'
        }}>
          {status.text}
        </span>
      </div>

      <p style={{ 
        fontSize: '13px', 
        color: colors.textSecondary, 
        marginBottom: '15px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {contract.description}
      </p>

      <div style={styles.contractInfo(colors)}>
        <div style={styles.infoRow}>
          <span>Price:</span>
          <span style={{ fontWeight: 'bold' }}>{contract.price} ETH</span>
        </div>
        {totalFeePercent > 0 && (
          <div style={styles.infoRow}>
            <span>Fees:</span>
            <span>{totalFeePercent}%</span>
          </div>
        )}
        <div style={styles.infoRow}>
          <span>Deadline:</span>
          <span>{contract.deadlineDays} days</span>
        </div>
        <div style={styles.infoRow}>
          <span>Created:</span>
          <span>{contract.deployedAt.toLocaleDateString()}</span>
        </div>
      </div>

      {isParticipant && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          backgroundColor: colors.accent + '20',
          borderRadius: '6px',
          fontSize: '12px',
          color: colors.accent,
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          You are a participant
        </div>
      )}
    </div>
  );
}

// =================== CONTRACT DETAILS MODAL ===================
function ContractDetailsModal({ contract, account, signer, setError, setSuccess, loadContracts, loadStats, colors, onClose }) {
  const [contractStatus, setContractStatus] = useState(null);
  const [feeInfo, setFeeInfo] = useState(null);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [notaryActNumber, setNotaryActNumber] = useState('');
  const [showDepositSuccess, setShowDepositSuccess] = useState(false);

  const dealContract = new ethers.Contract(contract.address, DEAL_ABI, signer);

  useEffect(() => {
    loadContractStatus();
    const interval = setInterval(loadContractStatus, 5000);
    return () => clearInterval(interval);
  }, [contract.address]);

  const loadContractStatus = async () => {
    try {
      const status = await dealContract.getContractStatus();
      const fees = await dealContract.getFeeInfo();
      const actNumber = await dealContract.notaryActNumber();
      
      setContractStatus({
        isDeposited: status[0],
        isFinalized: status[1],
        timeRemaining: Number(status[2]),
        contractBalance: ethers.formatEther(status[3]),
        deadlineTimestamp: Number(status[4]),
        notaryActNumber: actNumber
      });

      setFeeInfo({
        agentFeeBP: Number(fees[0]),
        notaryFeeBP: Number(fees[1]),
        agentFeeAmount: ethers.formatEther(fees[2]),
        notaryFeeAmount: ethers.formatEther(fees[3]),
        totalDepositRequired: ethers.formatEther(fees[4]),
        totalDepositRequiredWei: fees[4],
        agent: fees[5]
      });
    } catch (err) {
      console.error('Status loading error:', err);
    }
  };

  const isBuyer = contract.buyer.toLowerCase() === account.toLowerCase();
  const isSeller = contract.seller.toLowerCase() === account.toLowerCase();
  const isNotary = contract.notary.toLowerCase() === account.toLowerCase();
  const isAgent = contract.agent && contract.agent !== ethers.ZeroAddress && contract.agent.toLowerCase() === account.toLowerCase();

  const resetTxStatus = () => {
    setTimeout(() => {
      setTxStatus(null);
      setTxHash(null);
    }, 5000);
  };

  const handleDeposit = async () => {
    if (!notaryActNumber.trim()) {
      setError('Please enter notarial act number!');
      return;
    }

    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);

      const tx = await dealContract.deposit(notaryActNumber, { 
        value: feeInfo.totalDepositRequiredWei,
        gasLimit: 300000 
      });

      setTxStatus('processing');
      setTxHash(tx.hash);

      await tx.wait();

      setTxStatus('success');
      setShowDepositSuccess(true);
      await loadContractStatus();
      await loadContracts();
      await loadStats();
      setNotaryActNumber('');
      resetTxStatus();

    } catch (err) {
      console.error('Deposit error:', err);
      setTxStatus('failed');
      setError(`Deposit error: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleRefund = async () => {
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);

      const tx = await dealContract.refundAfterDeadline({ gasLimit: 300000 });
      
      setTxStatus('processing');
      setTxHash(tx.hash);

      await tx.wait();

      setTxStatus('success');
      setSuccess('Refund completed successfully!');
      await loadContractStatus();
      await loadContracts();
      await loadStats();
      resetTxStatus();

    } catch (err) {
      console.error('Refund error:', err);
      setTxStatus('failed');
      setError(`Refund error: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleApproveSale = async () => {
    if (!notaryActNumber.trim()) {
      setError('Please enter notarial act number!');
      return;
    }

    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);

      const tx = await dealContract.approveSale(notaryActNumber, { gasLimit: 300000 });
      
      setTxStatus('processing');
      setTxHash(tx.hash);

      await tx.wait();

      setTxStatus('success');
      setSuccess('Sale approved! Funds distributed.');
      await loadContractStatus();
      await loadContracts();
      await loadStats();
      setNotaryActNumber('');
      resetTxStatus();

    } catch (err) {
      console.error('Approve error:', err);
      setTxStatus('failed');
      setError(`Approve error: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleCancelSale = async () => {
    if (!window.confirm('Are you sure you want to cancel? All funds will be returned to buyer.')) {
      return;
    }

    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);

      const tx = await dealContract.cancelSale({ gasLimit: 300000 });
      
      setTxStatus('processing');
      setTxHash(tx.hash);

      await tx.wait();

      setTxStatus('success');
      setSuccess('Deal cancelled! Funds returned to buyer.');
      await loadContractStatus();
      await loadContracts();
      await loadStats();
      resetTxStatus();

    } catch (err) {
      console.error('Cancel error:', err);
      setTxStatus('failed');
      setError(`Cancel error: ${err.message}`);
      resetTxStatus();
    }
  };

  const isSubmitting = txStatus === 'pending' || txStatus === 'processing';

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal(colors)} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader(colors)}>
          <h2>{contract.name}</h2>
          <button onClick={onClose} style={styles.modalClose(colors)}>✕</button>
        </div>

        <div style={styles.modalBody}>
          {/* Deposit Success Message */}
          {showDepositSuccess && contractStatus?.isDeposited && !contractStatus?.isFinalized && (
            <div style={{
              padding: '20px',
              backgroundColor: colors.success + '20',
              borderRadius: '10px',
              border: `1px solid ${colors.success}`,
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: colors.success, marginBottom: '10px' }}>Deposit Complete!</h3>
              <p style={{ color: colors.text }}>
                Funds have been securely deposited. Waiting for notary approval.
              </p>
            </div>
          )}

          <div style={styles.section(colors)}>
            <h3 style={{ marginBottom: '15px' }}>Deal Information</h3>
            <div style={styles.infoGrid}>
              <InfoItem label="Contract Address" value={contract.address} mono colors={colors} />
              <InfoItem label="Deal Price" value={`${contract.price} ETH`} colors={colors} />
              <InfoItem label="Deadline" value={`${contract.deadlineDays} days`} colors={colors} />
              <InfoItem label="Status" value={contractStatus?.isFinalized ? 'Completed' : 'Active'} colors={colors} />
            </div>
          </div>

          {feeInfo && (feeInfo.agentFeeBP > 0 || feeInfo.notaryFeeBP > 0) && (
            <div style={styles.section(colors)}>
              <h3 style={{ marginBottom: '15px' }}>Fee Distribution</h3>
              <div style={styles.infoGrid}>
                <InfoItem label="Agent Fee" value={`${feeInfo.agentFeeBP / 100}% (${feeInfo.agentFeeAmount} ETH)`} colors={colors} />
                <InfoItem label="Notary Fee" value={`${feeInfo.notaryFeeBP / 100}% (${feeInfo.notaryFeeAmount} ETH)`} colors={colors} />
                <InfoItem 
                  label="Total Deposit Required" 
                  value={`${feeInfo.totalDepositRequired} ETH`} 
                  colors={colors} 
                  highlight 
                />
              </div>
            </div>
          )}

          <div style={styles.section(colors)}>
            <h3 style={{ marginBottom: '15px' }}>Parties</h3>
            <div style={styles.infoGrid}>
              <InfoItem label="Buyer" value={contract.buyer} highlight={isBuyer} mono colors={colors} />
              <InfoItem label="Seller" value={contract.seller} highlight={isSeller} mono colors={colors} />
              <InfoItem label="Notary" value={contract.notary} highlight={isNotary} mono colors={colors} />
              {contract.agent && contract.agent !== ethers.ZeroAddress && (
                <InfoItem label="Agent" value={contract.agent} highlight={isAgent} mono colors={colors} />
              )}
            </div>
          </div>

          <div style={styles.section(colors)}>
            <h3 style={{ marginBottom: '15px' }}>Deal Details</h3>
            <p style={{ color: colors.text, marginBottom: '10px' }}>{contract.description}</p>
            <a 
              href={`https://ipfs.io/ipfs/${contract.pdfCid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link(colors)}
            >
              View Document (IPFS) →
            </a>
          </div>

          {contractStatus && (
            <div style={styles.section(colors)}>
              <h3 style={{ marginBottom: '15px' }}>Current Status</h3>
              <div style={styles.statusGrid}>
                <StatusItem label="Funded" value={contractStatus.isDeposited ? 'Yes' : 'No'} colors={colors} />
                <StatusItem label="Completed" value={contractStatus.isFinalized ? 'Yes' : 'No'} colors={colors} />
                <StatusItem label="Balance" value={`${contractStatus.contractBalance} ETH`} colors={colors} />
                {contractStatus.isDeposited && !contractStatus.isFinalized && (
                  <StatusItem 
                    label="Time Remaining" 
                    value={<CountdownTimer seconds={contractStatus.timeRemaining} colors={colors} />}
                    colors={colors} 
                  />
                )}
                {contractStatus.notaryActNumber && (
                  <StatusItem label="Notarial Act №" value={contractStatus.notaryActNumber} colors={colors} />
                )}
              </div>
            </div>
          )}

          {contractStatus && !contractStatus.isFinalized && (
            <div style={styles.section(colors)}>
              <h3 style={{ marginBottom: '15px' }}>Actions</h3>

              {isBuyer && !contractStatus.isDeposited && feeInfo && (
                <div style={styles.actionSection(colors)}>
                  <h4 style={{ marginBottom: '10px', color: colors.text }}>Make Deposit</h4>
                  <div style={{
                    padding: '10px',
                    backgroundColor: colors.warning + '20',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    fontSize: '14px'
                  }}>
                    <strong>Total to deposit:</strong> {feeInfo.totalDepositRequired} ETH
                    <br />
                    <small style={{ color: colors.textSecondary }}>
                      (Price: {contract.price} ETH + Agent: {feeInfo.agentFeeAmount} ETH + Notary: {feeInfo.notaryFeeAmount} ETH)
                    </small>
                  </div>
                  <input
                    type="text"
                    value={notaryActNumber}
                    onChange={(e) => setNotaryActNumber(e.target.value)}
                    placeholder="Enter notarial act number (e.g. 12345/2024)"
                    style={styles.input(colors)}
                    disabled={isSubmitting}
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={isSubmitting}
                    style={{
                      ...styles.actionButton(colors, 'success'),
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmitting ? 'Processing...' : `Deposit ${feeInfo.totalDepositRequired} ETH`}
                  </button>
                  <TransactionStatus status={txStatus} txHash={txHash} colors={colors} />
                </div>
              )}

              {isBuyer && contractStatus.isDeposited && contractStatus.timeRemaining === 0 && (
                <div style={styles.actionSection(colors)}>
                  <h4 style={{ marginBottom: '10px', color: colors.warning }}>
                    Deadline expired - you can request a refund
                  </h4>
                  <button
                    onClick={handleRefund}
                    disabled={isSubmitting}
                    style={{
                      ...styles.actionButton(colors, 'warning'),
                      opacity: isSubmitting ? 0.7 : 1,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isSubmitting ? 'Processing...' : 'Request Refund'}
                  </button>
                  <TransactionStatus status={txStatus} txHash={txHash} colors={colors} />
                </div>
              )}

              {isNotary && contractStatus.isDeposited && (
                <div style={styles.actionSection(colors)}>
                  <h4 style={{ marginBottom: '10px', color: colors.text }}>Notary Actions</h4>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: colors.text }}>
                      Confirm notarial act number:
                    </label>
                    <input
                      type="text"
                      value={notaryActNumber}
                      onChange={(e) => setNotaryActNumber(e.target.value)}
                      placeholder={`Enter: ${contractStatus.notaryActNumber}`}
                      style={styles.input(colors)}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div style={{
                    padding: '10px',
                    backgroundColor: colors.bg,
                    borderRadius: '6px',
                    marginBottom: '15px',
                    fontSize: '13px'
                  }}>
                    <strong>On Approve:</strong>
                    <br />• Seller receives: {contract.price} ETH
                    {feeInfo && parseFloat(feeInfo.agentFeeAmount) > 0 && (
                      <><br />• Agent receives: {feeInfo.agentFeeAmount} ETH</>
                    )}
                    {feeInfo && parseFloat(feeInfo.notaryFeeAmount) > 0 && (
                      <><br />• Notary receives: {feeInfo.notaryFeeAmount} ETH</>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleApproveSale}
                      disabled={isSubmitting}
                      style={{
                        ...styles.actionButton(colors, 'success'), 
                        flex: 1,
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSubmitting ? '...' : 'Approve Sale'}
                    </button>
                    <button
                      onClick={handleCancelSale}
                      disabled={isSubmitting}
                      style={{
                        ...styles.actionButton(colors, 'error'), 
                        flex: 1,
                        opacity: isSubmitting ? 0.7 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isSubmitting ? '...' : 'Cancel Deal'}
                    </button>
                  </div>
                  <TransactionStatus status={txStatus} txHash={txHash} colors={colors} />
                </div>
              )}

              {isSeller && (
                <div style={styles.actionSection(colors)}>
                  <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    As seller, you are waiting for notary approval to receive payment
                  </p>
                </div>
              )}

              {isAgent && (
                <div style={styles.actionSection(colors)}>
                  <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    As agent, you will receive {feeInfo?.agentFeeAmount} ETH commission upon sale approval
                  </p>
                </div>
              )}

              {!isBuyer && !isSeller && !isNotary && !isAgent && (
                <div style={styles.actionSection(colors)}>
                  <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    You are not a participant in this deal (View Only)
                  </p>
                </div>
              )}
            </div>
          )}

          {contractStatus && contractStatus.isFinalized && (
            <div style={{
              ...styles.section(colors),
              backgroundColor: colors.success + '20',
              textAlign: 'center'
            }}>
              <h3 style={{ color: colors.success }}>Deal Completed</h3>
              <p style={{ color: colors.text, marginTop: '10px' }}>
                This deal has been successfully finalized
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =================== COUNTDOWN TIMER ===================
function CountdownTimer({ seconds, colors }) {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    setTimeLeft(seconds);
    if (seconds > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [seconds]);

  if (timeLeft === 0) {
    return <span style={{ color: colors.error }}>Expired!</span>;
  }

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;

  return (
    <span style={{ color: colors.warning, fontWeight: 'bold' }}>
      {days > 0 && `${days}d `}
      {hours > 0 && `${hours}h `}
      {minutes}m {secs}s
    </span>
  );
}

// =================== INFO ITEM ===================
function InfoItem({ label, value, mono, highlight, colors }) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>{label}</div>
      <div style={{ 
        color: highlight ? colors.accent : colors.text,
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: '14px',
        fontWeight: highlight ? 'bold' : 'normal',
        wordBreak: 'break-all'
      }}>
        {value}
      </div>
    </div>
  );
}

// =================== STATUS ITEM ===================
function StatusItem({ label, value, colors }) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: colors.bg,
      borderRadius: '8px',
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ fontSize: '12px', color: colors.textSecondary, marginBottom: '4px' }}>{label}</div>
      <div style={{ color: colors.text, fontSize: '14px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

// =================== ADMIN SETTINGS COMPONENT ===================
function AdminSettings({ factoryContract, stats, account, setError, setSuccess, loadStats, colors }) {
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [removeAdminAddress, setRemoveAdminAddress] = useState('');
  const [newDeployFee, setNewDeployFee] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);

  const resetTxStatus = () => {
    setTimeout(() => {
      setTxStatus(null);
      setTxHash(null);
    }, 5000);
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (!newAdminAddress.trim()) {
      setError('Please enter admin address');
      return;
    }
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const tx = await factoryContract.addAdmin(newAdminAddress);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess('Admin added successfully!');
      setNewAdminAddress('');
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error adding admin: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleRemoveAdmin = async (e) => {
    e.preventDefault();
    if (!removeAdminAddress.trim()) {
      setError('Please enter admin address to remove');
      return;
    }
    if (!window.confirm(`Remove admin ${removeAdminAddress}?`)) return;
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const tx = await factoryContract.removeAdmin(removeAdminAddress);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess('Admin removed!');
      setRemoveAdminAddress('');
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error removing admin: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleRemoveAdminFromList = async (adminAddress) => {
    if (!window.confirm(`Remove admin ${adminAddress}?`)) return;
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const tx = await factoryContract.removeAdmin(adminAddress);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess('Admin removed!');
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error removing admin: ${err.message}`);
      resetTxStatus();
    }
  };

  const handlePauseFactory = async (pause) => {
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const tx = await factoryContract.pauseFactory(pause);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess(`Factory ${pause ? 'paused' : 'activated'}!`);
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleSetDeployFee = async (e) => {
    e.preventDefault();
    if (!newDeployFee.trim()) {
      setError('Please enter fee value');
      return;
    }
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const feeWei = ethers.parseEther(newDeployFee);
      const tx = await factoryContract.setDeployFee(feeWei);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess('Deploy fee updated!');
      setNewDeployFee('');
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error setting fee: ${err.message}`);
      resetTxStatus();
    }
  };

  const handleWithdrawFees = async (e) => {
    e.preventDefault();
    try {
      setTxStatus('pending');
      setTxHash(null);
      setError(null);
      const recipient = withdrawAddress.trim() || account;
      const tx = await factoryContract.withdrawFees(recipient);
      setTxStatus('processing');
      setTxHash(tx.hash);
      await tx.wait();
      setTxStatus('success');
      setSuccess('Fees withdrawn!');
      setWithdrawAddress('');
      await loadStats();
      resetTxStatus();
    } catch (err) {
      setTxStatus('failed');
      setError(`Error withdrawing: ${err.message}`);
      resetTxStatus();
    }
  };

  const canWithdraw = stats && parseFloat(stats.collectedFees) > 0;
  const isSubmitting = txStatus === 'pending' || txStatus === 'processing';

  return (
    <div>
      <h2 style={{ marginBottom: '30px', color: colors.text }}>Owner Settings</h2>

      {/* Factory Control */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Factory Control</h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: colors.text }}>
            Status: <strong style={{ color: stats?.isPaused ? colors.error : colors.success }}>
              {stats?.isPaused ? 'Paused' : 'Active'}
            </strong>
          </span>
          <button
            onClick={() => handlePauseFactory(!stats?.isPaused)}
            disabled={isSubmitting}
            style={styles.smallButton(colors, stats?.isPaused ? 'success' : 'warning')}
          >
            {stats?.isPaused ? 'Activate' : 'Pause'}
          </button>
        </div>
      </div>

      {/* Deploy Fee Management */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Deploy Fee Management</h3>
        <p style={{ color: colors.textSecondary, marginBottom: '15px' }}>
          Current fee: <strong>{stats?.deployFee || '0'} ETH</strong>
        </p>
        <form onSubmit={handleSetDeployFee}>
          <div style={styles.inputRow}>
            <input
              type="number"
              step="0.0001"
              value={newDeployFee}
              onChange={(e) => setNewDeployFee(e.target.value)}
              placeholder="New fee in ETH (e.g. 0.01)"
              style={styles.inputFlex(colors)}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting} style={styles.smallButton(colors, 'success')}>
              Update
            </button>
          </div>
          <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
            Enter value in ETH. Example: 0.01 = 0.01 ETH per deploy
          </p>
        </form>
      </div>

      {/* Withdraw Fees */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Withdraw Collected Fees</h3>
        <p style={{ color: colors.textSecondary, marginBottom: '15px' }}>
          Available: <strong style={{ color: canWithdraw ? colors.success : colors.textSecondary }}>
            {parseFloat(stats?.collectedFees || '0').toFixed(4)} ETH
          </strong>
        </p>
        <form onSubmit={handleWithdrawFees}>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={withdrawAddress}
              onChange={(e) => setWithdrawAddress(e.target.value)}
              placeholder="Recipient address (empty = your address)"
              style={styles.inputFlex(colors)}
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              disabled={isSubmitting || !canWithdraw} 
              style={styles.smallButton(colors, canWithdraw ? 'success' : 'secondary')}
            >
              Withdraw
            </button>
          </div>
        </form>
      </div>

      {/* Add Admin */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Add New Admin</h3>
        <form onSubmit={handleAddAdmin}>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={newAdminAddress}
              onChange={(e) => setNewAdminAddress(e.target.value)}
              placeholder="0x... (new admin wallet address)"
              style={styles.inputFlex(colors)}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting} style={styles.smallButton(colors, 'success')}>
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Remove Admin */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Remove Admin</h3>
        <form onSubmit={handleRemoveAdmin}>
          <div style={styles.inputRow}>
            <input
              type="text"
              value={removeAdminAddress}
              onChange={(e) => setRemoveAdminAddress(e.target.value)}
              placeholder="0x... (admin address to remove)"
              style={styles.inputFlex(colors)}
              disabled={isSubmitting}
            />
            <button type="submit" disabled={isSubmitting} style={styles.smallButton(colors, 'error')}>
              Remove
            </button>
          </div>
        </form>
      </div>

      {/* Current Admins */}
      <div style={styles.section(colors)}>
        <h3 style={{ marginBottom: '15px' }}>Current Admins ({stats?.admins?.length || 0})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stats?.admins?.map((admin, index) => (
            <div key={index} style={styles.adminItem(colors)}>
              <span style={{ fontFamily: 'monospace', color: colors.text, fontSize: '14px' }}>
                {index === 0 ? '[Owner] ' : '[Admin] '}{admin}
              </span>
              {index !== 0 && (
                <button
                  onClick={() => handleRemoveAdminFromList(admin)}
                  disabled={isSubmitting}
                  style={styles.removeButtonSmall(colors)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <TransactionStatus status={txStatus} txHash={txHash} colors={colors} />
    </div>
  );
}

// =================== FOOTER ===================
function Footer({ colors }) {
  return (
    <footer style={styles.footer(colors)}>
      <p>Escrow System v2.0</p>
      <p style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '5px' }}>
        Factory: {CONTRACTS.FACTORY.slice(0, 10)}... | Network: {NETWORK_CONFIG.chainName}
      </p>
    </footer>
  );
}

// =================== STYLES ===================
const styles = {
  app: (colors) => ({
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }),
  header: (colors) => ({
    backgroundColor: colors.primary,
    padding: '20px 0',
    borderBottom: `1px solid ${colors.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 100
  }),
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: { display: 'flex', alignItems: 'center', fontSize: '18px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  roleBadge: (colors, role) => ({
    padding: '6px 14px',
    borderRadius: '4px',
    backgroundColor: (role === 'owner' ? colors.accent : role === 'admin' ? colors.warning : colors.textSecondary) + '30',
    color: role === 'owner' ? colors.accent : role === 'admin' ? colors.warning : colors.textSecondary,
    fontSize: '13px',
    fontWeight: 'bold'
  }),
  themeToggle: (colors) => ({
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.surface,
    color: colors.text,
    cursor: 'pointer',
    fontSize: '16px'
  }),
  accountBadge: (colors) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    fontFamily: 'monospace',
    fontSize: '13px'
  }),
  disconnectButton: (colors) => ({
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${colors.error}`,
    backgroundColor: 'transparent',
    color: colors.error,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }),
  connectButton: (colors) => ({
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: colors.accent,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }),
  container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' },
  alert: (colors) => ({
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    fontWeight: 'bold'
  }),
  alertClose: { background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer', padding: '0 5px' },
  welcome: (colors) => ({
    textAlign: 'center',
    padding: '80px 20px',
    backgroundColor: colors.surface,
    borderRadius: '12px',
    maxWidth: '500px',
    margin: '0 auto'
  }),
  welcomeButton: (colors, disabled) => ({
    padding: '15px 40px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: disabled ? colors.textSecondary : colors.accent,
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1
  }),
  tabs: (colors) => ({
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    borderBottom: `2px solid ${colors.border}`,
    paddingBottom: '10px',
    flexWrap: 'wrap'
  }),
  tab: (colors, active) => ({
    padding: '10px 20px',
    borderRadius: '6px 6px 0 0',
    border: 'none',
    backgroundColor: active ? colors.accent : 'transparent',
    color: active ? '#fff' : colors.textSecondary,
    fontSize: '14px',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer'
  }),
  dashboard: { display: 'flex', flexDirection: 'column', gap: '30px' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: (colors) => ({
    padding: '25px',
    borderRadius: '10px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    textAlign: 'center'
  }),
  section: (colors) => ({
    padding: '20px',
    borderRadius: '10px',
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    marginBottom: '20px'
  }),
  statusItem: (colors) => ({
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.border}`,
    color: colors.text
  }),
  deployForm: (colors) => ({
    backgroundColor: colors.surface,
    padding: '30px',
    borderRadius: '10px',
    border: `1px solid ${colors.border}`
  }),
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  submitButton: (colors) => ({
    width: '100%',
    padding: '15px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.accent,
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }),
  contractsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  contractCard: (colors) => ({
    padding: '20px',
    borderRadius: '10px',
    backgroundColor: colors.surface
  }),
  contractCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  contractInfo: () => ({ display: 'flex', flexDirection: 'column', gap: '8px' }),
  infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '13px' },
  emptyState: (colors) => ({
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.surface,
    borderRadius: '12px',
    color: colors.text
  }),
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: (colors) => ({
    backgroundColor: colors.surface,
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto'
  }),
  modalHeader: (colors) => ({
    padding: '20px 30px',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary
  }),
  modalClose: (colors) => ({
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: colors.text,
    cursor: 'pointer'
  }),
  modalBody: { padding: '30px' },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px'
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '15px'
  },
  link: (colors) => ({ color: colors.accent, textDecoration: 'none', fontWeight: 'bold' }),
  actionSection: (colors) => ({
    padding: '20px',
    backgroundColor: colors.bg,
    borderRadius: '8px',
    marginTop: '15px'
  }),
  input: (colors) => ({
    width: '100%',
    padding: '12px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    marginBottom: '10px',
    boxSizing: 'border-box'
  }),
  inputFlex: (colors) => ({
    flex: 1,
    padding: '12px',
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    color: colors.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    minWidth: '200px'
  }),
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  actionButton: (colors, type) => ({
    padding: '12px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: type === 'success' ? colors.success : type === 'error' ? colors.error : type === 'warning' ? colors.warning : colors.accent,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%'
  }),
  smallButton: (colors, type) => ({
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: type === 'success' ? colors.success : type === 'error' ? colors.error : type === 'warning' ? colors.warning : type === 'secondary' ? colors.textSecondary : colors.accent,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: type === 'secondary' ? 'not-allowed' : 'pointer',
    opacity: type === 'secondary' ? 0.6 : 1,
    whiteSpace: 'nowrap'
  }),
  adminItem: (colors) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 15px',
    backgroundColor: colors.bg,
    borderRadius: '6px',
    border: `1px solid ${colors.border}`,
    flexWrap: 'wrap',
    gap: '10px'
  }),
  removeButtonSmall: (colors) => ({
    padding: '6px 14px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: colors.error,
    color: '#fff',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }),
  footer: (colors) => ({
    textAlign: 'center',
    padding: '30px 20px',
    marginTop: '60px',
    borderTop: `1px solid ${colors.border}`,
    color: colors.textSecondary
  }),
  loading: (colors) => ({
    textAlign: 'center',
    padding: '40px',
    color: colors.textSecondary,
    fontSize: '16px'
  })
};
