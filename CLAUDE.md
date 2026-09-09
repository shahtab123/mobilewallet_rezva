# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React Native cryptocurrency wallet application built with Expo SDK 53+. The wallet allows users to securely store, send, and manage Polygon (POL) tokens using biometric authentication and iOS Keychain integration.

### Key Technologies
- **React Native** with Expo Router for file-based routing
- **Ethers.js v6** for blockchain interactions
- **Expo Secure Store** with biometric authentication for private key storage
- **Polygon network** (Chain ID 137) using Ankr RPC endpoints
- **TypeScript** for type safety
- **Object-oriented service architecture** with inheritance and dependency injection

## Development Commands

### Essential Commands
- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run lint` - Run ESLint for code quality

### Testing and Quality
- `expo lint` - Lint the codebase
- No test framework is currently configured

## Architecture

### Service Layer (OOP Architecture)
The application uses a modular service architecture with inheritance:

- **BaseService** - Abstract base class providing common functionality, error handling, and initialization patterns
- **WalletManagerService** - Core wallet orchestration, coordinates all wallet operations
- **BlockchainService** - Handles all blockchain interactions (balance, gas estimation, transactions)  
- **StorageService** - Secure storage operations with biometric authentication
- **AuthenticationService** - Biometric and device authentication management

Services follow dependency injection pattern with proper initialization order managed by WalletManagerService.

### Context Layer
- **WalletContext** - React Context providing wallet state management and methods to React components

### UI Layer
- **Tab-based navigation** with Home, Send, and Transactions screens
- **Biometric authentication** required for sensitive operations
- **Real-time gas estimation** and transaction validation

## Configuration

### Network Configuration
- **Primary Network**: Polygon mainnet (Chain ID 137)
- **RPC Provider**: Ankr with authenticated endpoints
- **API Keys**: Stored in `config/api-keys.ts` (gitignored)
- **RPC Endpoints**: Defined in `config/rpc-endpoints.ts`

### Security Features
- **Biometric Authentication**: Face ID/Touch ID required for wallet access and private key operations
- **Secure Storage**: Private keys stored in iOS Keychain via expo-secure-store
- **Address Validation**: Real-time Ethereum address validation
- **Transaction Confirmation**: Two-step confirmation process for sends

### Essential Configuration Files
- **babel.config.js**: Requires `unstable_transformImportMeta: true` for Expo SDK 53+ compatibility with valtio
- **app.json**: Contains iOS Face ID permissions and security transport settings for Ankr RPC
- **react-native-get-random-values**: Required polyfill imported in blockchain services

## Development Guidelines

### Service Development
- All services must extend BaseService abstract class
- Services must implement proper initialization with dependency management
- Use service-specific error classes (ServiceError, AuthenticationError, etc.)
- Follow initialization order: Authentication → Storage → Blockchain → WalletManager

### Security Considerations
- Never store API keys in code; use gitignored config files
- All private key operations require biometric authentication
- Validate all user inputs, especially addresses and amounts
- Use secure storage with authentication prompts for sensitive data

### Common Development Patterns
- Services are singletons exported as default instances
- React components use WalletContext for all wallet operations
- Error handling follows service-specific error types with user-friendly messages
- All async operations include proper loading states and error boundaries

### Blockchain Interaction Patterns
- Always validate addresses using ethers.js before transactions
- Include gas estimation with debounced API calls
- Implement transaction confirmation dialogs with formatted addresses
- Refresh wallet balance after successful transactions
- Use POL as native token symbol (not MATIC)

## File Structure Notes

### Critical Dependencies
- **ethers**: v6.x for blockchain operations
- **expo-secure-store**: Secure storage with biometric integration  
- **expo-local-authentication**: Face ID/Touch ID authentication
- **react-native-get-random-values**: Required polyfill for crypto operations

### Generated Files
- **config/api-keys.ts**: Contains Ankr API key, must be gitignored
- **services/**: Object-oriented service layer with inheritance hierarchy
- **contexts/**: React Context for state management
- **app/(tabs)/**: File-based routing with wallet-specific screens