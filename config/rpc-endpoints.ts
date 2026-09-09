// RPC Endpoints Configuration
import { API_KEYS } from './api-keys';

const ankrKey = API_KEYS.ANKR_API_KEY?.trim();

export const RPC_ENDPOINTS = {
  POLYGON_MAINNET: ankrKey
    ? `https://rpc.ankr.com/polygon/${ankrKey}`
    : 'https://polygon-bor.publicnode.com',
  POLYGON_FALLBACKS: [
    'https://polygon-bor.publicnode.com',
    'https://1rpc.io/matic',
    'https://polygon.drpc.org',
  ],
  ANKR_MULTICHAIN: ankrKey
    ? `https://rpc.ankr.com/multichain/${ankrKey}`
    : '',
  /** Public Base Sepolia RPCs */
  BASE_SEPOLIA: 'https://sepolia.base.org',
  BASE_SEPOLIA_FALLBACKS: [
    'https://sepolia.base.org',
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.gateway.tenderly.co',
    'https://1rpc.io/base-sepolia',
  ],
  BASE_MAINNET: 'https://mainnet.base.org',
  BASE_MAINNET_FALLBACKS: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://1rpc.io/base',
    'https://base.drpc.org',
  ],
};
