const fs = require('fs');
const path = require('path');

function loadRezvaKeys() {
  const filePath = path.join(__dirname, 'config', 'rezva-keys.ts');
  const defaults = {
    REZVA_PROVIDER_API_KEY: '',
    REZVA_FREE_API_KEY: '',
    REZVA_API_BASE_URL:
      'https://universal-payment-api.sabrishahtab.workers.dev',
  };
  try {
    if (!fs.existsSync(filePath)) return defaults;
    const text = fs.readFileSync(filePath, 'utf8');
    const grab = (name) => {
      const re = new RegExp(`${name}\\s*:\\s*['"]([^'"]*)['"]`, 'm');
      const m = text.match(re);
      return m ? m[1] : '';
    };
    return {
      REZVA_PROVIDER_API_KEY: grab('REZVA_PROVIDER_API_KEY'),
      REZVA_FREE_API_KEY: grab('REZVA_FREE_API_KEY'),
      REZVA_API_BASE_URL:
        grab('REZVA_API_BASE_URL') || defaults.REZVA_API_BASE_URL,
    };
  } catch {
    return defaults;
  }
}

const rezva = loadRezvaKeys();

const EXTRA_PLUGINS = [
  'expo-font',
  'expo-image',
  'expo-status-bar',
  'expo-web-browser',
];

function mergePlugins(existing) {
  const list = Array.isArray(existing) ? [...existing] : [];
  const names = new Set(
    list.map((p) => (Array.isArray(p) ? p[0] : p)).filter(Boolean)
  );
  for (const plugin of EXTRA_PLUGINS) {
    if (!names.has(plugin)) list.push(plugin);
  }
  return list;
}

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  name: 'Wallet',
  slug: 'wallet',
  plugins: mergePlugins(config.plugins),
  extra: {
    ...(config.extra || {}),
    rezvaProviderApiKey: rezva.REZVA_PROVIDER_API_KEY,
    rezvaFreeApiKey: rezva.REZVA_FREE_API_KEY,
    rezvaApiBaseUrl: rezva.REZVA_API_BASE_URL,
  },
});
