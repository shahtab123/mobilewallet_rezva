/**
 * Known payment tokens per chain (infrastructure — not merchants).
 * Gas is always the network native currency (ETH / POL).
 */
export const NETWORK_USDC: Record<
  number,
  { address: string; symbol: string; decimals: number }
> = {
  // Base Sepolia — Circle USDC
  84532: {
    address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    symbol: 'USDC',
    decimals: 6,
  },
  // Base mainnet — Circle USDC
  8453: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
  },
  // Polygon mainnet — Circle USDC
  137: {
    address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    symbol: 'USDC',
    decimals: 6,
  },
};

export function getUsdcForChain(chainId: number | null | undefined) {
  if (chainId == null) return null;
  return NETWORK_USDC[chainId] || null;
}
