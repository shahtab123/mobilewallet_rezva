import { classifySendInput } from '../services/rezva/parseInput.ts';
import { resolveSendInput } from '../services/rezva/resolve.ts';

async function main() {
  const input = 'shahtab.rabby';
  const c = classifySendInput(input);
  console.log('classify', JSON.stringify(c, null, 2));

  const result = await resolveSendInput(input, {
    getConfig: async () => ({
      apiKey: 'rzva_prov_BKW_Wb1wNf_OuSVq11Hx7e1NgwfhDi7L6RFRPwLPoDI',
      apiBaseUrl: 'http://127.0.0.1:8787',
    }),
    findChainById: (id) =>
      id === 84532 ? { id, key: 'baseSepolia' } : null,
  });

  console.log(
    JSON.stringify(
      {
        classification: result.classification,
        error: result.error,
        status: result.response?.status,
        payment_ready: result.response?.payment_ready,
        options: result.response?.payment_options,
        mapped: result.mappedOptions.map((o) => ({
          asset: o.asset,
          address: o.address,
          chainId: o.chainId,
          networkSupported: o.networkSupported,
          token_contract: o.token_contract,
        })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
