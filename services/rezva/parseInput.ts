import { ethers } from 'ethers';
import {
  identifierValueForType,
  inferIdentifierType,
  isLikelyEnsName,
  looksLikeBanglaQr,
  parseExplicitIdentifier,
} from './inferType';
import { parseRezvaQr } from './parseQr';
import type { ClassifiedSendInput } from './types';

export function classifySendInput(raw: string): ClassifiedSendInput {
  const value = (raw ?? '').trim();
  if (!value) {
    return { kind: 'empty' };
  }

  if (looksLikeBanglaQr(value)) {
    return {
      kind: 'identifier',
      type: 'bangla_qr',
      value,
      source: 'typed',
    };
  }

  if (ethers.isAddress(value)) {
    return { kind: 'address', address: ethers.getAddress(value) };
  }

  const qr = parseRezvaQr(value);
  if (qr) {
    return {
      kind: 'identifier',
      type: qr.type,
      value: qr.value,
      resolverUrl: qr.resolver_url,
      source: 'qr',
    };
  }

  if (isLikelyEnsName(value)) {
    return { kind: 'ens', name: value };
  }

  const explicit = parseExplicitIdentifier(value);
  if (explicit) {
    return {
      kind: 'identifier',
      type: explicit.type,
      value: explicit.value,
      source: 'explicit',
    };
  }

  const inferred = inferIdentifierType(value);
  if (inferred) {
    return {
      kind: 'identifier',
      type: inferred,
      value: identifierValueForType(inferred, value),
      source: 'typed',
    };
  }

  return { kind: 'unknown', value };
}

export function isResolvableIdentifier(
  input: ClassifiedSendInput
): input is Extract<ClassifiedSendInput, { kind: 'identifier' }> {
  return input.kind === 'identifier';
}
