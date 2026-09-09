import 'react-native-get-random-values';
import { ethers } from 'ethers';
import { BaseService, BlockchainError } from './base/BaseService';
import { RPC_ENDPOINTS } from '../config/rpc-endpoints';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  /** Native gas token */
  symbol: string;
  explorer?: string;
  /** 'mainnet' | 'testnet' for UI grouping */
  env: 'mainnet' | 'testnet';
  /** Primary payment token shown in the wallet (USDC). */
  paymentSymbol: string;
}

export interface TransactionParams {
  to: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface Erc20TransferParams {
  tokenContract: string;
  to: string;
  /** Human-readable token amount (e.g. "1.5") */
  amount: string;
  decimals?: number;
  gasLimit?: string;
}

/** Minimal ERC-20 ABI for balance/decimals/transfer. */
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface TransactionResult {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  blockNumber?: number;
}

export interface AnkrTransaction {
  blockHash: string;
  blockNumber: string;
  blockchain: string;
  cumulativeGasUsed: string;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  hash: string;
  input: string;
  nonce: string;
  r: string;
  s: string;
  status: string;
  timestamp: string;
  to: string;
  transactionIndex: string;
  type: string;
  v: string;
  value: string;
}

export interface AnkrTransactionResponse {
  id: number;
  jsonrpc: string;
  result: {
    transactions: AnkrTransaction[];
    nextPageToken?: string;
  };
}

export interface ProcessedTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: 'success' | 'failed';
  type: 'sent' | 'received';
  gasUsed: string;
  gasPrice: string;
  blockNumber: number;
}

export class BlockchainService extends BaseService {
  private provider: ethers.JsonRpcProvider | null = null;
  private currentNetwork: NetworkConfig | null = null;
  
  // Supported EVM networks keyed for wallet switching (not merchants/assets).
  private readonly NETWORKS: Record<string, NetworkConfig> = {
    baseSepolia: {
      name: 'Base Sepolia',
      chainId: 84532,
      rpcUrl: RPC_ENDPOINTS.BASE_SEPOLIA,
      symbol: 'ETH',
      paymentSymbol: 'USDC',
      explorer: 'https://sepolia.basescan.org',
      env: 'testnet',
    },
    base: {
      name: 'Base',
      chainId: 8453,
      rpcUrl: RPC_ENDPOINTS.BASE_MAINNET,
      symbol: 'ETH',
      paymentSymbol: 'USDC',
      explorer: 'https://basescan.org',
      env: 'mainnet',
    },
    polygon: {
      name: 'Polygon',
      chainId: 137,
      rpcUrl: RPC_ENDPOINTS.POLYGON_MAINNET,
      symbol: 'POL',
      paymentSymbol: 'USDC',
      explorer: 'https://polygonscan.com',
      env: 'mainnet',
    },
  };

  private rpcFallbacks(networkKey: string): string[] {
    if (networkKey === 'baseSepolia') {
      return [
        RPC_ENDPOINTS.BASE_SEPOLIA,
        ...RPC_ENDPOINTS.BASE_SEPOLIA_FALLBACKS,
      ];
    }
    if (networkKey === 'base') {
      return [
        RPC_ENDPOINTS.BASE_MAINNET,
        ...RPC_ENDPOINTS.BASE_MAINNET_FALLBACKS,
      ];
    }
    if (networkKey === 'polygon') {
      return [
        RPC_ENDPOINTS.POLYGON_MAINNET,
        ...RPC_ENDPOINTS.POLYGON_FALLBACKS,
      ];
    }
    return [this.NETWORKS[networkKey]?.rpcUrl].filter(Boolean) as string[];
  }

  async initialize(networkKey: string = 'baseSepolia'): Promise<void> {
    try {
      const network = this.NETWORKS[networkKey];
      if (!network) {
        throw new BlockchainError(`Network ${networkKey} not supported`);
      }

      await this.switchNetwork(networkKey);
      this.isInitialized = true;
    } catch (error) {
      await this.handleError(error, 'Blockchain service initialization');
    }
  }

  /**
   * Attach a provider for the network. Tries multiple public RPCs.
   * Still marks the network current even if the probe fails (offline-tolerant),
   * so the wallet UI can open without blocking on RPC.
   */
  async switchNetwork(networkKey: string): Promise<void> {
    const network = this.NETWORKS[networkKey];
    if (!network) {
      throw new BlockchainError(`Network ${networkKey} not supported`);
    }

    const urls = [...new Set(this.rpcFallbacks(networkKey))];
    let lastError: unknown = null;

    for (const rpcUrl of urls) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl, network.chainId, {
          staticNetwork: true,
        });
        provider.pollingInterval = 12000;
        // Soft probe with timeout
        await Promise.race([
          provider.getBlockNumber(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC timeout')), 8000)
          ),
        ]);
        this.provider = provider;
        this.currentNetwork = { ...network, rpcUrl };
        return;
      } catch (error) {
        lastError = error;
        console.warn(`RPC failed for ${network.name} via ${rpcUrl}:`, error);
      }
    }

    // Last resort: keep a provider so signing can still be attempted later.
    const fallbackUrl = urls[0] || network.rpcUrl;
    this.provider = new ethers.JsonRpcProvider(fallbackUrl, network.chainId, {
      staticNetwork: true,
    });
    this.provider.pollingInterval = 12000;
    this.currentNetwork = { ...network, rpcUrl: fallbackUrl };
    console.warn(
      `Using ${network.name} without confirmed RPC connectivity:`,
      lastError
    );
  }

  findNetworkByChainId(chainId: number): { key: string; network: NetworkConfig } | null {
    for (const [key, network] of Object.entries(this.NETWORKS)) {
      if (network.chainId === chainId) {
        return { key, network };
      }
    }
    return null;
  }

  getNetworkKeyByChainId(chainId: number): string | null {
    return this.findNetworkByChainId(chainId)?.key ?? null;
  }

  getCurrentNetworkKey(): string | null {
    const current = this.currentNetwork;
    if (!current) return null;
    return this.getNetworkKeyByChainId(current.chainId);
  }

  listNetworks(): Array<NetworkConfig & { key: string }> {
    return Object.entries(this.NETWORKS).map(([key, network]) => ({
      key,
      ...network,
    }));
  }

  async getBalance(address: string): Promise<string> {
    this.validateInitialized();
    
    if (!this.provider) {
      return '0';
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.warn('Failed to get balance:', error);
      return '0';
    }
  }

  async getErc20Balance(
    tokenContract: string,
    owner: string,
    decimalsHint?: number
  ): Promise<{ balance: string; decimals: number; symbol: string }> {
    this.validateInitialized();
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }
    try {
      const contract = new ethers.Contract(tokenContract, ERC20_ABI, this.provider);
      const [raw, decimals, symbol] = await Promise.all([
        contract.balanceOf(owner),
        decimalsHint != null
          ? Promise.resolve(decimalsHint)
          : contract.decimals().catch(() => 18),
        contract.symbol().catch(() => 'TOKEN'),
      ]);
      const dec = Number(decimals);
      return {
        balance: ethers.formatUnits(raw, dec),
        decimals: dec,
        symbol: String(symbol),
      };
    } catch (error) {
      await this.handleError(
        new BlockchainError(
          `Failed to get ERC-20 balance for ${tokenContract}`
        ),
        'Getting ERC-20 balance'
      );
    }
  }

  async getErc20Decimals(tokenContract: string): Promise<number> {
    this.validateInitialized();
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }
    try {
      const contract = new ethers.Contract(tokenContract, ERC20_ABI, this.provider);
      return Number(await contract.decimals());
    } catch {
      return 18;
    }
  }

  getErc20Interface(): ethers.Interface {
    return new ethers.Interface(ERC20_ABI);
  }

  async estimateGas(params: TransactionParams): Promise<string> {
    this.validateInitialized();
    
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }

    try {
      const gasEstimate = await this.provider.estimateGas({
        to: params.to,
        value: ethers.parseEther(params.value)
      });
      
      return gasEstimate.toString();
    } catch (error) {
      await this.handleError(
        new BlockchainError('Failed to estimate gas'), 
        'Gas estimation'
      );
    }
  }

  async getGasPrice(): Promise<string> {
    this.validateInitialized();
    
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }

    try {
      const gasPrice = await this.provider.getFeeData();
      return gasPrice.gasPrice?.toString() || '0';
    } catch (error) {
      await this.handleError(
        new BlockchainError('Failed to get gas price'), 
        'Getting gas price'
      );
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    this.validateInitialized();
    
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }

    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      await this.handleError(
        new BlockchainError(`Failed to get transaction receipt: ${txHash}`), 
        'Getting transaction receipt'
      );
    }
  }

  async waitForTransaction(txHash: string, confirmations: number = 1): Promise<TransactionResult> {
    this.validateInitialized();
    
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }

    try {
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      
      if (!receipt) {
        throw new BlockchainError('Transaction receipt not found');
      }

      return {
        hash: receipt.hash,
        from: receipt.from,
        to: receipt.to || '',
        value: receipt.value?.toString() || '0',
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      await this.handleError(
        new BlockchainError(`Failed to wait for transaction: ${txHash}`), 
        'Waiting for transaction'
      );
    }
  }

  getCurrentNetwork(): NetworkConfig | null {
    return this.currentNetwork;
  }

  getSupportedNetworks(): Record<string, NetworkConfig> {
    return { ...this.NETWORKS };
  }

  getProvider(): ethers.JsonRpcProvider | null {
    this.validateInitialized();
    return this.provider;
  }

  async isValidAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  async getBlockNumber(): Promise<number> {
    this.validateInitialized();
    
    if (!this.provider) {
      throw new BlockchainError('Provider not initialized');
    }

    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      await this.handleError(
        new BlockchainError('Failed to get block number'), 
        'Getting block number'
      );
    }
  }

  async getTransactionHistory(
    address: string, 
    pageSize: number = 20,
    pageToken?: string
  ): Promise<{ transactions: ProcessedTransaction[]; nextPageToken?: string }> {
    this.validateInitialized();

    if (!RPC_ENDPOINTS.ANKR_MULTICHAIN) {
      return { transactions: [] };
    }

    try {
      const requestBody = {
        id: 1,
        jsonrpc: '2.0',
        method: 'ankr_getTransactionsByAddress',
        params: {
          address,
          blockchain: 'polygon',
          pageSize,
          descOrder: true,
          includeLogs: false,
          ...(pageToken && { pageToken })
        }
      };

      console.log('Making Ankr API request:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(RPC_ENDPOINTS.ANKR_MULTICHAIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        throw new BlockchainError(`HTTP error! status: ${response.status}, body: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      
      if (data.error) {
        throw new BlockchainError(`Ankr API error: ${data.error.message || 'Unknown error'}`);
      }
      
      if (!data.result) {
        console.log('No result in response, returning empty transactions');
        return { transactions: [] };
      }

      if (!data.result.transactions) {
        console.log('No transactions in result, returning empty transactions');
        return { transactions: [] };
      }

      console.log('Found transactions:', data.result.transactions.length);

      const processedTransactions = data.result.transactions.map((tx: AnkrTransaction) => {
        const isReceived = tx.to.toLowerCase() === address.toLowerCase();
        const valueInEther = ethers.formatEther(tx.value || '0');
        
        return {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: valueInEther,
          timestamp: parseInt(tx.timestamp) * 1000, // Convert to milliseconds
          status: tx.status === '1' ? 'success' : 'failed' as 'success' | 'failed',
          type: isReceived ? 'received' : 'sent' as 'sent' | 'received',
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          blockNumber: parseInt(tx.blockNumber, 16) // Convert hex to decimal
        } as ProcessedTransaction;
      });

      return {
        transactions: processedTransactions,
        nextPageToken: data.result.nextPageToken
      };
    } catch (error) {
      console.error('Transaction history error:', error);
      throw new BlockchainError(`Failed to get transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new BlockchainService();