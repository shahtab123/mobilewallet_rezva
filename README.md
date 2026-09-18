# Mobile Wallet + Rezva (Expo / Android)

Expo React Native wallet with **Rezva** identifier resolution for real USDC payments (Base Sepolia and other networks returned by resolve).

Official site: [https://rezva.xyz](https://rezva.xyz)

## Install

```bash
git clone https://github.com/shahtab123/mobilewallet_rezva.git
cd mobilewallet_rezva
npm install
```

Copy local secrets (gitignored):

```bash
cp config/rezva-keys.example.ts config/rezva-keys.ts
```

Edit `config/rezva-keys.ts`:

```ts
export const REZVA_KEYS = {
  REZVA_PROVIDER_API_KEY: 'rzva_prov_…', // or leave blank and use Free key
  REZVA_FREE_API_KEY: '',
  // Production (recommended for phones):
  REZVA_API_BASE_URL:
    'https://universal-payment-api.sabrishahtab.workers.dev',
  // Local API on your PC (phone must use LAN IP, not 127.0.0.1):
  // REZVA_API_BASE_URL: 'http://192.168.x.x:8787',
};
```

Start Expo:

```bash
npx expo start -c
```

Open with **Expo Go** on Android (SDK must match — this project targets Expo SDK 57).

In **Send → Resolver settings**, confirm the API base URL is:

`https://universal-payment-api.sabrishahtab.workers.dev`

(`__DEV__` defaults to `http://127.0.0.1:8787` if unset — use `rezva-keys.ts` or settings to point at production.)

## How to use

1. Create / unlock wallet on the **Wallet** tab.
2. Fund **Base Sepolia** ETH (gas) + USDC for the resolved token contract.
3. Open **Send** → enter an identifier or tap **Scan QR**.
4. Confirm the resolve panel → **Pay**.

### Identifiers to try

| Input | Type |
| --- | --- |
| `shahtab.rabby` | Provider name |
| `test@test.com` | Email |
| Bangla / EMV QR | Scan the poster or paste full `000201…` text |

Sample Bangla QR poster:

![Bangla QR](./bangla%20qr.png)

### Check USDC deposits

Test destinations resolve to:

`0x7774001cB9a85AF9683246D357884fFe17c0C364`

Base Sepolia explorer:

[https://sepolia.basescan.org/address/0x7774001cB9a85AF9683246D357884fFe17c0C364](https://sepolia.basescan.org/address/0x7774001cB9a85AF9683246D357884fFe17c0C364)

## API base URL (local vs production)

| Mode | Default API |
| --- | --- |
| `__DEV__` (Expo Go / debug) | `http://127.0.0.1:8787` unless overridden in `rezva-keys.ts` / settings |
| Release builds | `https://universal-payment-api.sabrishahtab.workers.dev` |

Override anytime in **Send → Resolver settings**. Local testing still works when your Rezva API is reachable (use PC LAN IP on a physical phone).

Health check:

```bash
curl https://universal-payment-api.sabrishahtab.workers.dev/health
```

## Notes

- No hardcoded merchants — always `POST /v1/resolve`.
- Use `address`, `token_contract`, and `network_identifier` from the resolve response only.
- More detail: [REZVA.md](./REZVA.md)
- Website: [https://rezva.xyz](https://rezva.xyz)
