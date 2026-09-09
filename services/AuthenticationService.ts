import * as LocalAuthentication from 'expo-local-authentication';
import { BaseService, AuthenticationError } from './base/BaseService';

export interface BiometricInfo {
  isAvailable: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export interface AuthenticationOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
  requireBiometrics?: boolean;
}

export class AuthenticationService extends BaseService {
  private biometricInfo: BiometricInfo | null = null;

  async initialize(): Promise<void> {
    try {
      this.biometricInfo = await this.getBiometricInfo();
      this.isInitialized = true;
    } catch (error) {
      await this.handleError(error, 'Authentication service initialization');
    }
  }

  async authenticate(options: AuthenticationOptions = {}): Promise<boolean> {
    this.validateInitialized();

    const {
      promptMessage = 'Authenticate to access your wallet',
      fallbackLabel = 'Use Passcode',
      disableDeviceFallback = false,
      requireBiometrics = false
    } = options;

    try {
      // Check if biometrics are required but not available
      if (requireBiometrics && !this.biometricInfo?.isAvailable) {
        throw new AuthenticationError('Biometric authentication required but not available');
      }

      // If biometrics are not available and not required, return true
      if (!this.biometricInfo?.isAvailable && !requireBiometrics) {
        console.warn('Biometric authentication not available, skipping authentication');
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel,
        disableDeviceFallback,
      });

      return result.success;
    } catch (error) {
      await this.handleError(error, 'Authentication');
    }
  }

  async getBiometricInfo(): Promise<BiometricInfo> {
    try {
      const [isAvailable, isEnrolled, supportedTypes] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync()
      ]);

      return {
        isAvailable,
        isEnrolled,
        supportedTypes
      };
    } catch (error) {
      await this.handleError(error, 'Getting biometric info');
    }
  }

  isBiometricsAvailable(): boolean {
    return this.biometricInfo?.isAvailable && this.biometricInfo?.isEnrolled || false;
  }

  getSupportedAuthTypes(): LocalAuthentication.AuthenticationType[] {
    return this.biometricInfo?.supportedTypes || [];
  }

  async requireAuthentication(message: string = 'Authentication required'): Promise<void> {
    const success = await this.authenticate({ 
      promptMessage: message,
      requireBiometrics: false 
    });
    
    if (!success) {
      throw new AuthenticationError('Authentication failed or was cancelled');
    }
  }
}

export default new AuthenticationService();