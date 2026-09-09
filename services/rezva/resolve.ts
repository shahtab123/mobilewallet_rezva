import { resolveIdentifier } from './client';
import { getRezvaRuntimeConfig } from './config';
import { classifySendInput } from './parseInput';
import { mapPaymentOptions } from './mapDestination';
import { evaluateSafety } from './safety';
import { looksLikeProviderName } from './inferType';
import { RezvaError, serializeRezvaError } from './types';
import type { ClassifiedSendInput, RezvaResolveResult } from './types';
import type { ChainLookup } from './mapDestination';

export type ResolveSendInputDeps = {
  fetch?: typeof fetch;
  getConfig?: typeof getRezvaRuntimeConfig;
  findChainById?: (chainId: number) => ChainLookup | null | undefined;
};

function forceProviderNameType(
  classification: Extract<ClassifiedSendInput, { kind: 'identifier' }>
): Extract<ClassifiedSendInput, { kind: 'identifier' }> {
  if (looksLikeProviderName(classification.value)) {
    return { ...classification, type: 'provider_name' };
  }
  return classification;
}

export async function resolveSendInput(
  raw: string,
  deps: ResolveSendInputDeps = {}
): Promise<RezvaResolveResult> {
  let classification = classifySendInput(raw);

  if (classification.kind !== 'identifier') {
    return {
      classification,
      response: null,
      mappedOptions: [],
      safety: null,
      error: null,
    };
  }

  classification = forceProviderNameType(classification);

  const config = await (deps.getConfig || getRezvaRuntimeConfig)();
  const resolverUrl = classification.resolverUrl || config.apiBaseUrl;

  if (!config.apiKey) {
    return {
      classification,
      response: null,
      mappedOptions: [],
      safety: null,
      error: serializeRezvaError(
        new RezvaError(
          'MISSING_API_KEY',
          'A Rezva API key is required to resolve identifiers.'
        )
      ),
    };
  }

  if (!resolverUrl) {
    return {
      classification,
      response: null,
      mappedOptions: [],
      safety: null,
      error: serializeRezvaError(
        new RezvaError(
          'MISSING_RESOLVER_URL',
          'No resolver URL is configured. Scan a payment QR or set the resolver base URL.'
        )
      ),
    };
  }

  const mapResponse = (response: import('./types').RezvaResolveResponse) => {
    const mappedOptions = deps.findChainById
      ? mapPaymentOptions(response.payment_options, deps.findChainById)
      : response.payment_options.map((option) => ({
          ...option,
          chainId: null,
          networkKey: null,
          networkSupported: false,
          isErc20: Boolean(option.token_contract),
        }));
    return {
      classification,
      response,
      mappedOptions,
      safety: evaluateSafety(response),
      error: null,
    } satisfies RezvaResolveResult;
  };

  try {
    const response = await resolveIdentifier(
      {
        type: classification.type,
        value: classification.value,
        resolverUrl,
        apiKey: config.apiKey,
      },
      deps.fetch
    );
    return mapResponse(response);
  } catch (error) {
    // If a dotted name was mis-typed as custom/etc, retry as provider_name.
    // Live API: shahtab.rabby exists only under type=provider_name.
    if (
      error instanceof RezvaError &&
      error.code === 'IDENTIFIER_NOT_FOUND' &&
      classification.type !== 'provider_name' &&
      looksLikeProviderName(classification.value)
    ) {
      try {
        classification = {
          ...classification,
          type: 'provider_name',
        };
        const response = await resolveIdentifier(
          {
            type: 'provider_name',
            value: classification.value,
            resolverUrl,
            apiKey: config.apiKey,
          },
          deps.fetch
        );
        return mapResponse(response);
      } catch (retryError) {
        error = retryError;
      }
    }

    const rezvaError =
      error instanceof RezvaError
        ? error
        : new RezvaError(
            'RESOLVER_ERROR',
            error instanceof Error ? error.message : 'Resolver request failed.'
          );

    if (rezvaError.code === 'IDENTIFIER_NOT_FOUND') {
      return {
        classification,
        response: null,
        mappedOptions: [],
        safety: null,
        error: serializeRezvaError(
          new RezvaError(
            'IDENTIFIER_NOT_FOUND',
            `No payment destination found for ${classification.type}:${classification.value}.`
          )
        ),
      };
    }

    return {
      classification,
      response: null,
      mappedOptions: [],
      safety: null,
      error: serializeRezvaError(rezvaError),
    };
  }
}
