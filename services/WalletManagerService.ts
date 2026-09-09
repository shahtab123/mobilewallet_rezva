import 'react-native-get-random-values';
import { ethers } from 'ethers';
import { BaseService, ServiceError, WalletData } from './base/BaseService';
import AuthenticationService from './AuthenticationService';
import StorageService from './StorageService';
import BlockchainService from './BlockchainService';

export interface WalletCreationOptions {
  entropy?: string;
  mnemonic?: string;
  privateKey?: string;
}

export interface TransactionOptions {
  to: string;
  amount: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface Erc20TransactionOptions {
  tokenContract: string;
  to: string;
  amount: string;
  decimals?: number;
  gasLimit?: string;
}

export class WalletManagerService extends BaseService {
  private wallet: ethers.Wallet | null = null;
  private readonly PRIVATE_KEY_PATTERN = /^0x[a-fA-F0-9]{64}$/;

  async initialize(): Promise<void> {
    try {
      // Initialize all dependency services in order
      if (!AuthenticationService.getInitializationStatus()) {
        await AuthenticationService.initialize();
      }
      if (!StorageService.getInitializationStatus()) {
        await StorageService.initialize();
      }
      if (!BlockchainService.getInitializationStatus()) {
        // Base Sepolia first — Rezva Android test default
        await BlockchainService.initialize('baseSepolia');
      }

      // Do not auto-load or auto-create a wallet here.
      // UI chooses: unlock existing / create new / restore.
      this.isInitialized = true;
    } catch (error) {
      await this.handleError(error, 'Wallet manager initialization');
    }
  }

  async hasStoredWallet(): Promise<boolean> {
    this.validateInitialized();
    return StorageService.hasPrivateKey();
  }

  async createWallet(options: WalletCreationOptions = {}): Promise<WalletData> {
    this.validateInitialized();

    try {
      let newWallet: ethers.Wallet;

      if (options.privateKey) {
        newWallet = await this.createFromPrivateKey(options.privateKey);
      } else if (options.mnemonic) {
        newWallet = await this.createFromMnemonic(options.mnemonic);
      } else {
        newWallet = await this.generateRandomWallet(options.entropy);
      }

      // Connect to blockchain provider
      const provider = BlockchainService.getProvider();
      if (provider) {
        newWallet = newWallet.connect(provider);
      }

      // Store wallet securely
      await StorageService.storePrivateKey(newWallet.privateKey);
      
      this.wallet = newWallet;
      
      return await this.getWalletData();
    } catch (error) {
      await this.handleError(error, 'Wallet creation');
    }
  }

  async restoreWallet(privateKey: string): Promise<WalletData> {
    this.validateInitialized();

    try {
      if (!this.isValidPrivateKey(privateKey)) {
        throw new ServiceError('Invalid private key format', 'INVALID_KEY', 'WalletManager');
      }

      const restoredWallet = await this.createFromPrivateKey(privateKey);
      
      // Connect to blockchain provider
      const provider = BlockchainService.getProvider();
      if (provider) {
        this.wallet = restoredWallet.connect(provider);
      } else {
        this.wallet = restoredWallet;
      }

      // Store new wallet securely (replaces existing)
      await StorageService.storePrivateKey(privateKey);
      
      return await this.getWalletData();
    } catch (error) {
      await this.handleError(error, 'Wallet restoration');
    }
  }

  async exportPrivateKey(): Promise<string> {
    this.validateInitialized();

    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }

    try {
      // Require authentication before export
      await AuthenticationService.requireAuthentication('Authenticate to export your private key');
      
      return this.wallet.privateKey;
    } catch (error) {
      await this.handleError(error, 'Private key export');
    }
  }

  async sendTransaction(options: TransactionOptions): Promise<string> {
    this.validateInitialized();

    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }

    try {
      await AuthenticationService.requireAuthentication(
        'Authenticate to send this transaction'
      );

      const tx = await this.wallet.sendTransaction({
        to: options.to,
        value: ethers.parseEther(options.amount),
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined,
        gasPrice: options.gasPrice ? BigInt(options.gasPrice) : undefined,
      });

      return tx.hash;
    } catch (error) {
      await this.handleError(error, 'Transaction sending');
    }
  }

  /**
   * Switch the wallet's connected provider to a supported network by chain ID
   * (from resolve `network_identifier`, e.g. eip155:84532).
   */
  async ensureNetwork(chainId: number): Promise<string> {
    this.validateInitialized();
    const match = BlockchainService.findNetworkByChainId(chainId);
    if (!match) {
      throw new ServiceError(
        `Network chain ID ${chainId} is not enabled in this wallet.`,
        'NETWORK_UNSUPPORTED',
        'WalletManager'
      );
    }
    return this.switchNetworkByKey(match.key);
  }

  async switchNetworkByKey(networkKey: string): Promise<string> {
    this.validateInitialized();
    const networks = BlockchainService.getSupportedNetworks();
    if (!networks[networkKey]) {
      throw new ServiceError(
        `Network ${networkKey} is not supported`,
        'NETWORK_UNSUPPORTED',
        'WalletManager'
      );
    }
    const current = BlockchainService.getCurrentNetwork();
    const currentKey = BlockchainService.getCurrentNetworkKey();
    if (!current || currentKey !== networkKey) {
      await BlockchainService.switchNetwork(networkKey);
      if (this.wallet) {
        const provider = BlockchainService.getProvider();
        if (provider) {
          this.wallet = this.wallet.connect(provider);
        }
      }
    }
    return networkKey;
  }

  /**
   * Send an ERC-20 transfer using the resolved token_contract + destination.
   * Uses the wallet's existing ethers signing/broadcast path (no mocks).
   */
  async sendErc20Transaction(options: Erc20TransactionOptions): Promise<string> {
    this.validateInitialized();

    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }

    if (!ethers.isAddress(options.tokenContract) || !ethers.isAddress(options.to)) {
      throw new ServiceError(
        'Invalid token contract or destination address',
        'INVALID_ADDRESS',
        'WalletManager'
      );
    }

    try {
      await AuthenticationService.requireAuthentication(
        'Authenticate to send this token transfer'
      );

      const decimals =
        options.decimals ??
        (await BlockchainService.getErc20Decimals(options.tokenContract));
      const amount = ethers.parseUnits(options.amount, decimals);
      const iface = BlockchainService.getErc20Interface();
      const data = iface.encodeFunctionData('transfer', [options.to, amount]);

      const tx = await this.wallet.sendTransaction({
        to: options.tokenContract,
        data,
        value: 0n,
        gasLimit: options.gasLimit ? BigInt(options.gasLimit) : undefined,
      });

      return tx.hash;
    } catch (error) {
      await this.handleError(error, 'ERC-20 transaction sending');
    }
  }

  async getErc20Balance(
    tokenContract: string,
    decimals?: number
  ): Promise<{ balance: string; decimals: number; symbol: string }> {
    this.validateInitialized();
    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }
    return BlockchainService.getErc20Balance(
      tokenContract,
      this.wallet.address,
      decimals
    );
  }

  async getBalance(): Promise<string> {
    this.validateInitialized();

    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }

    try {
      return await BlockchainService.getBalance(this.wallet.address);
    } catch (error) {
      await this.handleError(error, 'Balance retrieval');
    }
  }

  async getWalletData(): Promise<WalletData> {
    this.validateInitialized();

    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }

    try {
      let balance = '0';
      let usdcBalance = '0';
      try {
        balance = await this.getBalance();
      } catch {
        balance = '0';
      }
      try {
        const { getUsdcForChain } = await import('../config/tokens');
        const net = BlockchainService.getCurrentNetwork();
        const usdc = getUsdcForChain(net?.chainId);
        if (usdc) {
          const tok = await this.getErc20Balance(usdc.address, usdc.decimals);
          usdcBalance = tok.balance;
        }
      } catch {
        usdcBalance = '0';
      }

      return {
        address: this.wallet.address,
        privateKey: this.wallet.privateKey,
        balance,
        usdcBalance,
      };
    } catch (error) {
      await this.handleError(error, 'Getting wallet data');
    }
  }

  async getUsdcBalance(): Promise<string> {
    this.validateInitialized();
    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }
    const { getUsdcForChain } = await import('../config/tokens');
    const net = BlockchainService.getCurrentNetwork();
    const usdc = getUsdcForChain(net?.chainId);
    if (!usdc) return '0';
    const tok = await this.getErc20Balance(usdc.address, usdc.decimals);
    return tok.balance;
  }

  async authenticateAndGetWallet(): Promise<WalletData | null> {
    this.validateInitialized();

    try {
      const success = await AuthenticationService.authenticate({
        promptMessage: 'Authenticate to access your wallet',
      });

      if (!success) {
        return null;
      }

      if (!this.wallet) {
        await this.loadExistingWallet();
      }

      if (!this.wallet) {
        return null;
      }

      return await this.getWalletData();
    } catch (error) {
      await this.handleError(error, 'Wallet authentication');
    }
  }

  async unlockStoredWallet(): Promise<WalletData> {
    this.validateInitialized();
    const ok = await AuthenticationService.authenticate({
      promptMessage: 'Unlock your wallet',
    });
    if (!ok) {
      throw new ServiceError(
        'Authentication cancelled',
        'AUTH_CANCELLED',
        'WalletManager'
      );
    }
    await this.loadExistingWallet();
    if (!this.wallet) {
      throw new ServiceError('No wallet found', 'NO_WALLET', 'WalletManager');
    }
    return this.getWalletData();
  }

  isWalletLoaded(): boolean {
    return this.wallet !== null;
  }

  getAddress(): string {
    if (!this.wallet) {
      throw new ServiceError('No wallet loaded', 'NO_WALLET', 'WalletManager');
    }
    return this.wallet.address;
  }

  async getTransactionHistory(address: string): Promise<{ transactions: import('./BlockchainService').ProcessedTransaction[]; nextPageToken?: string }> {
    this.validateInitialized();
    
    try {
      return await BlockchainService.getTransactionHistory(address);
    } catch (error) {
      await this.handleError(error, 'Getting transaction history');
      return { transactions: [] };
    }
  }

  // Private helper methods
  private async loadExistingWallet(): Promise<void> {
    try {
      const storedPrivateKey = await StorageService.getPrivateKey();
      
      if (storedPrivateKey) {
        const restoredWallet = new ethers.Wallet(storedPrivateKey);
        const provider = BlockchainService.getProvider();
        
        this.wallet = provider ? restoredWallet.connect(provider) : restoredWallet;
      }
    } catch (error) {
      // Wallet doesn't exist or can't be loaded - this is acceptable
      console.warn('No existing wallet found or failed to load');
    }
  }

  private async generateRandomWallet(entropy?: string): Promise<ethers.Wallet> {
    try {
      return ethers.Wallet.createRandom(entropy ? { entropy } : undefined);
    } catch (error) {
      throw new ServiceError('Failed to generate random wallet', 'GENERATION_ERROR', 'WalletManager');
    }
  }

  private async createFromPrivateKey(privateKey: string): Promise<ethers.Wallet> {
    try {
      return new ethers.Wallet(privateKey);
    } catch (error) {
      throw new ServiceError('Invalid private key', 'INVALID_KEY', 'WalletManager');
    }
  }

  private async createFromMnemonic(mnemonic: string): Promise<ethers.Wallet> {
    try {
      return ethers.Wallet.fromPhrase(mnemonic);
    } catch (error) {
      throw new ServiceError('Invalid mnemonic phrase', 'INVALID_MNEMONIC', 'WalletManager');
    }
  }

  private isValidPrivateKey(privateKey: string): boolean {
    return this.PRIVATE_KEY_PATTERN.test(privateKey);
  }
}

export default new WalletManagerService();