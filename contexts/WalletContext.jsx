import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WalletManagerService from '../services/WalletManagerService';
import BlockchainService from '../services/BlockchainService';

const NETWORK_PREF_KEY = 'wallet_selected_network';

const WalletContext = createContext(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [hasStoredWallet, setHasStoredWallet] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [networkKey, setNetworkKey] = useState('baseSepolia');
  const [networkName, setNetworkName] = useState('Base Sepolia');
  const [networkSymbol, setNetworkSymbol] = useState('ETH');
  const [paymentSymbol, setPaymentSymbol] = useState('USDC');
  const [networkEnv, setNetworkEnv] = useState('testnet');
  const [networks, setNetworks] = useState([]);

  const syncNetworkLabel = () => {
    const net = BlockchainService.getCurrentNetwork();
    const key = BlockchainService.getCurrentNetworkKey();
    if (net) {
      setNetworkName(net.name);
      setNetworkSymbol(net.symbol);
      setPaymentSymbol(net.paymentSymbol || 'USDC');
      setNetworkEnv(net.env || 'mainnet');
    }
    if (key) setNetworkKey(key);
    setNetworks(BlockchainService.listNetworks());
  };

  const bootstrap = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await WalletManagerService.initialize();
      const saved = await AsyncStorage.getItem(NETWORK_PREF_KEY);
      if (saved && BlockchainService.getSupportedNetworks()[saved]) {
        await WalletManagerService.switchNetworkByKey(saved);
      }
      const exists = await WalletManagerService.hasStoredWallet();
      setHasStoredWallet(exists);
      syncNetworkLabel();
      setIsReady(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to start wallet services'
      );
      setIsReady(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const switchNetwork = async (key) => {
    setError(null);
    try {
      await WalletManagerService.switchNetworkByKey(key);
      await AsyncStorage.setItem(NETWORK_PREF_KEY, key);
      syncNetworkLabel();
      if (isAuthenticated) {
        await refreshBalance();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch network');
      throw err;
    }
  };

  const unlockWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const walletData = await WalletManagerService.unlockStoredWallet();
      setWallet(walletData);
      setIsAuthenticated(true);
      setHasStoredWallet(true);
      syncNetworkLabel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { default: AuthenticationService } = await import(
        '../services/AuthenticationService'
      );
      const passed = await AuthenticationService.authenticate({
        promptMessage: 'Authenticate to create a new wallet',
      });
      if (!passed) {
        setError('Authentication cancelled');
        return;
      }

      const walletData = await WalletManagerService.createWallet();
      setWallet(walletData);
      setIsAuthenticated(true);
      setHasStoredWallet(true);
      syncNetworkLabel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreFromPrivateKey = async (privateKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const walletData = await WalletManagerService.restoreWallet(privateKey);
      setWallet(walletData);
      setIsAuthenticated(true);
      setHasStoredWallet(true);
      syncNetworkLabel();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const sendTransaction = async (to, amount) => {
    if (!isAuthenticated) {
      throw new Error('Wallet not authenticated');
    }
    setError(null);
    try {
      const txHash = await WalletManagerService.sendTransaction({ to, amount });
      await refreshBalance();
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const ensureNetwork = async (chainId) => {
    if (!isAuthenticated) {
      throw new Error('Wallet not authenticated');
    }
    const key = await WalletManagerService.ensureNetwork(chainId);
    await AsyncStorage.setItem(NETWORK_PREF_KEY, key);
    syncNetworkLabel();
    return key;
  };

  const sendErc20Transaction = async ({
    tokenContract,
    to,
    amount,
    decimals,
    chainId,
  }) => {
    if (!isAuthenticated) {
      throw new Error('Wallet not authenticated');
    }
    setError(null);
    try {
      if (chainId != null) {
        await WalletManagerService.ensureNetwork(chainId);
        syncNetworkLabel();
      }
      const txHash = await WalletManagerService.sendErc20Transaction({
        tokenContract,
        to,
        amount,
        decimals,
      });
      await refreshBalance();
      return txHash;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Token transfer failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getErc20Balance = async (tokenContract, decimals) => {
    if (!isAuthenticated) {
      throw new Error('Wallet not authenticated');
    }
    return WalletManagerService.getErc20Balance(tokenContract, decimals);
  };

  const refreshBalance = async () => {
    if (!wallet) return;
    try {
      const balance = await WalletManagerService.getBalance();
      let usdcBalance = '0';
      try {
        usdcBalance = await WalletManagerService.getUsdcBalance();
      } catch {
        usdcBalance = '0';
      }
      setWallet((prev) =>
        prev ? { ...prev, balance, usdcBalance } : null
      );
      syncNetworkLabel();
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  };

  const exportPrivateKey = async () => {
    if (!isAuthenticated) {
      throw new Error('Wallet not authenticated');
    }
    setError(null);
    try {
      return await WalletManagerService.exportPrivateKey();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const loadTransactionHistory = async () => {
    if (!wallet?.address) return;
    setIsLoadingTransactions(true);
    setError(null);
    try {
      const history = await WalletManagerService.getTransactionHistory(
        wallet.address
      );
      setTransactions(history.transactions);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load transactions'
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const value = {
    wallet,
    isReady,
    hasStoredWallet,
    isLoading,
    isAuthenticated,
    error,
    networkKey,
    networkName,
    networkSymbol,
    paymentSymbol,
    networkEnv,
    networks,
    transactions,
    isLoadingTransactions,
    unlockWallet,
    createNewWallet,
    restoreFromPrivateKey,
    switchNetwork,
    sendTransaction,
    sendErc20Transaction,
    ensureNetwork,
    getErc20Balance,
    refreshBalance,
    exportPrivateKey,
    loadTransactionHistory,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};
