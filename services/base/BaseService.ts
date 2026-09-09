// Base abstract service class for common functionality
export abstract class BaseService {
  protected isInitialized: boolean = false;
  
  abstract initialize(): Promise<void>;
  
  protected validateInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.constructor.name} is not initialized`);
    }
  }
  
  public getInitializationStatus(): boolean {
    return this.isInitialized;
  }
  
  protected async handleError(error: any, context: string): Promise<never> {
    console.error(`${this.constructor.name} - ${context}:`, error);
    throw error instanceof Error ? error : new Error(`${context} failed`);
  }
}

// Common interfaces
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WalletData {
  address: string;
  privateKey: string;
  /** Native gas balance (ETH / POL) */
  balance: string;
  /** USDC payment balance */
  usdcBalance: string;
}

// Service error types
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 'AuthenticationService');
  }
}

export class StorageError extends ServiceError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 'StorageService');
  }
}

export class BlockchainError extends ServiceError {
  constructor(message: string) {
    super(message, 'BLOCKCHAIN_ERROR', 'BlockchainService');
  }
}