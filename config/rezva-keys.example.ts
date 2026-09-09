/**
 * Copy this file to `rezva-keys.ts` (gitignored) for local defaults.
 *
 * OpenAPI bearerAuth accepts an approved Provider API key (`rzva_prov_…`)
 * or a Free API key (`rzva_free_…`). Prefer the Provider key for wallet testing.
 *
 * API base URL (pick one):
 * - Production: https://universal-payment-api.sabrishahtab.workers.dev
 * - Local API on PC: http://127.0.0.1:8787 (emulator) or http://<PC-LAN-IP>:8787 (phone)
 *
 * If left empty, __DEV__ defaults to local and release builds default to production.
 */
export const REZVA_KEYS = {
  REZVA_PROVIDER_API_KEY: '',
  REZVA_FREE_API_KEY: '',
  // Recommended for phone testing against live Rezva:
  REZVA_API_BASE_URL:
    'https://universal-payment-api.sabrishahtab.workers.dev',
};
