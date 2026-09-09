# Rezva Android Wallet (Expo)

Open-source React Native / Expo wallet with **Rezva** identifier resolution.

Official site: [https://rezva.xyz](https://rezva.xyz)

Production API: `https://universal-payment-api.sabrishahtab.workers.dev`

See the root [README.md](./README.md) for install and test identifiers (`shahtab.rabby`, `test@test.com`, Bangla QR).

## Config

- `config/rezva-keys.ts` (gitignored) — Provider/Free key + optional `REZVA_API_BASE_URL`
- Defaults: `__DEV__` → `http://127.0.0.1:8787`, release → production Worker
- Override in Send → Resolver settings anytime

Do not hardcode merchants or `token_contract` — use resolve response only.
