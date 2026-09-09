import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { REZVA_KEYS } from '../../config/rezva-keys';
import { defaultRezvaApiBaseUrl } from '../../config/rezva-api';

export type RezvaRuntimeConfig = {
  apiKey: string;
  apiBaseUrl: string;
};

export type RezvaPublicConfig = {
  configured: boolean;
  apiBaseUrl: string;
  keyPrefix: string;
  keyKind: 'provider' | 'free' | 'other' | 'none';
};

const STORAGE_KEY = 'rezvaConfig';

function extraRezva(): {
  providerKey: string;
  freeKey: string;
  apiBaseUrl: string;
} {
  const extra =
    (Constants.expoConfig?.extra as Record<string, string> | undefined) ||
    ((Constants.manifest as { extra?: Record<string, string> } | null)
      ?.extra ??
      {});
  return {
    providerKey: String(extra.rezvaProviderApiKey || '').trim(),
    freeKey: String(extra.rezvaFreeApiKey || '').trim(),
    apiBaseUrl: String(extra.rezvaApiBaseUrl || '').trim(),
  };
}

function readBakedDefaults(): RezvaRuntimeConfig {
  const fromExtra = extraRezva();
  const apiKey = String(
    fromExtra.providerKey ||
      REZVA_KEYS.REZVA_PROVIDER_API_KEY ||
      fromExtra.freeKey ||
      REZVA_KEYS.REZVA_FREE_API_KEY ||
      ''
  ).trim();
  const apiBaseUrl = String(
    fromExtra.apiBaseUrl ||
      REZVA_KEYS.REZVA_API_BASE_URL ||
      defaultRezvaApiBaseUrl()
  ).trim();
  return { apiKey, apiBaseUrl };
}

function keyKind(apiKey: string): RezvaPublicConfig['keyKind'] {
  if (!apiKey) return 'none';
  if (apiKey.startsWith('rzva_prov_')) return 'provider';
  if (apiKey.startsWith('rzva_free_')) return 'free';
  return 'other';
}

function keyPrefix(apiKey: string): string {
  if (!apiKey) return '';
  return apiKey.length <= 12
    ? `${apiKey.slice(0, 4)}…`
    : `${apiKey.slice(0, 12)}…`;
}

function pickPreferredKey(baked: string, stored: string): string {
  const b = baked.trim();
  const s = stored.trim();
  // Explicit Provider key typed in Settings still wins.
  if (s.startsWith('rzva_prov_')) return s;
  // Baked Provider beats blank / Free / other junk left in AsyncStorage.
  if (b.startsWith('rzva_prov_')) return b;
  if (b) return b;
  return s;
}

/**
 * Drop stale Free/blank keys from phone storage whenever a Provider key is baked in.
 */
async function scrubBadStoredKey(baked: RezvaRuntimeConfig): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as Partial<RezvaRuntimeConfig>;
    const storedKey = String(stored.apiKey || '').trim();
    const bakedIsProvider = baked.apiKey.startsWith('rzva_prov_');
    const storedIsFreeOrEmpty =
      !storedKey || storedKey.startsWith('rzva_free_');

    if (bakedIsProvider && storedIsFreeOrEmpty) {
      const next = {
        apiKey: baked.apiKey,
        apiBaseUrl:
          String(stored.apiBaseUrl || '').trim() &&
          !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(
            String(stored.apiBaseUrl || '').trim()
          )
            ? String(stored.apiBaseUrl).trim()
            : baked.apiBaseUrl,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore
  }
}

export async function getRezvaRuntimeConfig(): Promise<RezvaRuntimeConfig> {
  const baked = readBakedDefaults();
  await scrubBadStoredKey(baked);

  let stored: Partial<RezvaRuntimeConfig> = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      stored = JSON.parse(raw) as Partial<RezvaRuntimeConfig>;
    }
  } catch {
    // Fall back to baked defaults.
  }

  const storedUrl = String(stored.apiBaseUrl || '').trim();
  const storedIsLocalOnly =
    !storedUrl ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(storedUrl);

  return {
    apiKey: pickPreferredKey(baked.apiKey, String(stored.apiKey || '')),
    apiBaseUrl: String(
      (storedIsLocalOnly ? baked.apiBaseUrl : storedUrl) ||
        baked.apiBaseUrl ||
        ''
    ).trim(),
  };
}

export async function setRezvaRuntimeConfig(
  next: Partial<RezvaRuntimeConfig>
): Promise<RezvaPublicConfig> {
  const current = await getRezvaRuntimeConfig();
  const nextKey =
    next.apiKey !== undefined ? next.apiKey.trim() : undefined;
  const nextUrl =
    next.apiBaseUrl !== undefined ? next.apiBaseUrl.trim() : undefined;

  // Empty key field means "keep existing" — never wipe a working key by mistake.
  // Also never let a Free key overwrite a baked Provider key unless explicitly typed.
  let apiKey = nextKey ? nextKey : current.apiKey;
  const baked = readBakedDefaults();
  if (
    baked.apiKey.startsWith('rzva_prov_') &&
    apiKey.startsWith('rzva_free_')
  ) {
    apiKey = baked.apiKey;
  }

  const merged: RezvaRuntimeConfig = {
    apiKey,
    apiBaseUrl:
      nextUrl !== undefined && nextUrl !== '' ? nextUrl : current.apiBaseUrl,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return toPublicConfig(merged);
}

export async function clearRezvaStoredConfig(): Promise<RezvaPublicConfig> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return getRezvaPublicConfig();
}

export function toPublicConfig(config: RezvaRuntimeConfig): RezvaPublicConfig {
  return {
    configured: Boolean(config.apiKey),
    apiBaseUrl: config.apiBaseUrl,
    keyPrefix: keyPrefix(config.apiKey),
    keyKind: keyKind(config.apiKey),
  };
}

export async function getRezvaPublicConfig(): Promise<RezvaPublicConfig> {
  return toPublicConfig(await getRezvaRuntimeConfig());
}

/**
 * QR payloads may already include `/v1/resolve`.
 * Configured base URLs should not grow a nested `/v1/v1/resolve`.
 */
export function toResolveEndpoint(resolverUrl: string): string {
  const trimmed = resolverUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/v1\/resolve$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed}/v1/resolve`;
}
