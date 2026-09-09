import type { MappedPaymentOption, RezvaPaymentOption } from './types';

export type ChainLookup = {
  id: number;
  key: string;
};

const EIP155 = /^eip155:(\d+)$/i;

export function parseEip155ChainId(networkIdentifier?: string): number | null {
  if (!networkIdentifier) return null;
  const match = EIP155.exec(networkIdentifier.trim());
  if (!match) return null;
  const chainId = Number(match[1]);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

export function mapPaymentOption(
  option: RezvaPaymentOption,
  findChainById: (chainId: number) => ChainLookup | null | undefined
): MappedPaymentOption {
  const chainId = parseEip155ChainId(option.network_identifier);
  const chain = chainId ? findChainById(chainId) : null;
  const hasDestination = Boolean(option.address);
  const hasTokenOrNative = Boolean(option.token_contract) || Boolean(chain);
  const networkSupported = Boolean(chain && hasDestination && hasTokenOrNative);
  return {
    ...option,
    chainId,
    networkKey: chain?.key ?? null,
    networkSupported,
    isErc20: Boolean(option.token_contract),
  };
}

export function mapPaymentOptions(
  options: RezvaPaymentOption[],
  findChainById: (chainId: number) => ChainLookup | null | undefined
): MappedPaymentOption[] {
  return options.map((option) => mapPaymentOption(option, findChainById));
}

export function payableMappedOptions(
  options: MappedPaymentOption[]
): MappedPaymentOption[] {
  return options.filter(
    (option) => option.payment_ready && option.networkSupported
  );
}
