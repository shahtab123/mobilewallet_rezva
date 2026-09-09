/**
 * Configurable Rezva API base URLs.
 * Do not hardcode these inside resolve/client — use defaults + env/keys.
 */
export const REZVA_PRODUCTION_API_BASE_URL =
  'https://universal-payment-api.sabrishahtab.workers.dev';

/** Local/debug API. On a physical phone use your PC LAN IP instead. */
export const REZVA_LOCAL_API_BASE_URL = 'http://127.0.0.1:8787';

/**
 * Default when no baked key / AsyncStorage override is set.
 * - Expo/React Native __DEV__ → local
 * - release builds → production Worker
 */
export function defaultRezvaApiBaseUrl(): string {
  return typeof __DEV__ !== 'undefined' && __DEV__
    ? REZVA_LOCAL_API_BASE_URL
    : REZVA_PRODUCTION_API_BASE_URL;
}
