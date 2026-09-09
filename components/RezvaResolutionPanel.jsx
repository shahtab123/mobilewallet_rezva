import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { GlassCard, Button, Input } from '@/components/ui';
import {
  displaySafetyMessage,
  getRezvaPublicConfig,
  getRezvaRuntimeConfig,
  setRezvaRuntimeConfig,
  clearRezvaStoredConfig,
  toResolveEndpoint,
} from '@/services/rezva';

function formatChainLabel(chain) {
  return String(chain || '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ellipsisAddress(address) {
  if (!address || address.length < 12) return address || '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function identifierDisplayValue(result) {
  const fromResponse = result.response?.identifier;
  return (
    fromResponse?.normalized_value ||
    fromResponse?.value ||
    (result.classification.kind === 'identifier'
      ? result.classification.value
      : '')
  );
}

function resolveTitle(result) {
  const profileName = result.response?.profile?.name?.trim();
  return profileName || identifierDisplayValue(result);
}

function resolveSubtitle(result) {
  const profileName = result.response?.profile?.name?.trim();
  const identifierValue = identifierDisplayValue(result);
  if (profileName && identifierValue && profileName !== identifierValue) {
    return identifierValue;
  }
  return null;
}

export function RezvaResolutionPanel({
  result,
  loading,
  acknowledgedRecentChange,
  onAcknowledgeRecentChange,
  onCancelRecentChange,
  onPay,
  selectedOption,
  onSelectOption,
  amount,
  onAmountChange,
  tokenBalance,
  onConfigSaved,
}) {
  const [publicConfig, setPublicConfig] = useState(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testNote, setTestNote] = useState('');

  const loadConfig = async () => {
    const [pub, runtime] = await Promise.all([
      getRezvaPublicConfig(),
      getRezvaRuntimeConfig(),
    ]);
    setPublicConfig(pub);
    setApiBaseUrlDraft(runtime.apiBaseUrl || '');
    // Never put the real key in the text field — leave blank = keep saved key.
    setApiKeyDraft('');
    if (!pub.configured) setShowConfig(true);
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (
      result?.error?.code === 'RESOLVER_ERROR' ||
      result?.error?.code === 'MISSING_API_KEY' ||
      result?.error?.code === 'MISSING_RESOLVER_URL'
    ) {
      setShowConfig(true);
    }
  }, [result?.error?.code]);

  const safety = result?.safety ?? null;
  const blocked = safety?.action === 'block';
  const needsContinue =
    safety?.action === 'warn-continue' && !acknowledgedRecentChange;
  const safetyLine = displaySafetyMessage(safety);
  const needsKey = result?.error?.code === 'MISSING_API_KEY';
  const needsUrl = result?.error?.code === 'MISSING_RESOLVER_URL';

  const primary = selectedOption || result?.mappedOptions?.[0] || null;
  const title = result?.response ? resolveTitle(result) : null;
  const subtitle = result?.response ? resolveSubtitle(result) : null;

  const acceptsLine =
    primary?.asset && primary?.chain
      ? `Accepts: ${primary.asset} on ${formatChainLabel(primary.chain)}`
      : null;
  const destinationLine = primary?.address
    ? `To: ${ellipsisAddress(primary.address)}`
    : null;

  const fixedAmount = primary?.fixed_amount;
  const canPay =
    result?.response?.payment_ready === true &&
    primary?.payment_ready === true &&
    primary?.networkSupported === true &&
    !blocked &&
    !needsContinue &&
    Boolean(primary?.address) &&
    Boolean(primary?.token_contract || !primary?.isErc20) &&
    Boolean(fixedAmount || amount);

  const errorMessage = useMemo(() => {
    if (!result?.error || needsKey || needsUrl) return null;
    switch (result.error.code) {
      case 'UNAUTHORIZED':
        return 'Authentication failed. Check the API key in resolver settings.';
      case 'IDENTIFIER_NOT_FOUND':
        return (
          result.error.message ||
          'No payment destination found for this ID.'
        );
      case 'IDENTIFIER_INVALID':
        return 'This payment ID is invalid.';
      case 'RATE_LIMITED':
      case 'FREE_API_RATE_LIMITED':
        return `Resolver rate limited. Retry after ${
          result.error.retryAfterSeconds ?? 60
        }s.`;
      default:
        return result.error.message;
    }
  }, [result, needsKey, needsUrl]);

  const saveConfig = async () => {
    setSavingConfig(true);
    setTestNote('');
    try {
      const next = await setRezvaRuntimeConfig({
        // Empty draft keeps the existing key (see setRezvaRuntimeConfig).
        apiKey: apiKeyDraft,
        apiBaseUrl: apiBaseUrlDraft,
      });
      setPublicConfig(next);
      setApiKeyDraft('');
      setShowConfig(false);
      onConfigSaved?.();
    } finally {
      setSavingConfig(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestNote('');
    try {
      const runtime = await getRezvaRuntimeConfig();
      const base = (apiBaseUrlDraft || runtime.apiBaseUrl || '').trim();
      const healthUrl = `${base.replace(/\/+$/, '')}/health`;
      const res = await fetch(healthUrl, { method: 'GET' });
      const text = await res.text();
      setTestNote(
        res.ok
          ? `OK — reached ${healthUrl}`
          : `HTTP ${res.status} from ${healthUrl}: ${text.slice(0, 120)}`
      );
    } catch (err) {
      const base = (apiBaseUrlDraft || '').trim() || '(no URL)';
      setTestNote(
        `Failed to reach ${base}/health — ${
          err instanceof Error ? err.message : 'network error'
        }. API must listen on 0.0.0.0 (not only localhost), same Wi‑Fi as the phone.`
      );
    } finally {
      setTesting(false);
    }
  };

  const resetDefaults = async () => {
    const next = await clearRezvaStoredConfig();
    setPublicConfig(next);
    setApiBaseUrlDraft(next.apiBaseUrl || '');
    setApiKeyDraft('');
    setTestNote('Restored app defaults.');
    onConfigSaved?.();
  };

  if (loading) {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.body}>Looking up payment ID…</Text>
        </View>
      </GlassCard>
    );
  }

  if (!result || result.classification.kind !== 'identifier') {
    return null;
  }

  return (
    <GlassCard style={styles.card}>
      {result.response && !result.error ? (
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {acceptsLine ? <Text style={styles.meta}>{acceptsLine}</Text> : null}
          {destinationLine ? (
            <Text style={styles.meta}>{destinationLine}</Text>
          ) : null}
          {primary && !primary.networkSupported ? (
            <Text style={styles.warn}>
              This network (chain ID {primary.chainId ?? 'unknown'}) is not
              enabled in the wallet.
            </Text>
          ) : null}
          {tokenBalance != null && primary?.asset ? (
            <Text style={styles.meta}>
              Your {primary.asset}: {tokenBalance}
            </Text>
          ) : null}

          {fixedAmount ? (
            <Text style={styles.meta}>
              Amount: {fixedAmount} {primary?.asset}
            </Text>
          ) : (
            <View style={styles.amountBlock}>
              <Text style={styles.label}>
                Amount ({primary?.asset || 'token'})
              </Text>
              <Input
                variant="glass"
                value={amount}
                onChangeText={onAmountChange}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.configInput}
              />
            </View>
          )}
        </View>
      ) : null}

      {(needsKey || needsUrl || showConfig) && (
        <View style={styles.configBlock}>
          <Text style={styles.body}>
            Resolver URL must be reachable from this phone (your PC LAN IP +
            API port). Leave the key blank to keep the saved one.
          </Text>
          {publicConfig?.keyPrefix ? (
            <Text style={styles.foot}>
              Using {publicConfig.keyKind || 'saved'} key:{' '}
              {publicConfig.keyPrefix}
            </Text>
          ) : (
            <Text style={styles.warn}>No API key saved yet.</Text>
          )}
          <Text style={styles.foot}>
            Active resolve URL:{' '}
            {toResolveEndpoint(apiBaseUrlDraft || publicConfig?.apiBaseUrl || '') ||
              '—'}
          </Text>
          <Input
            variant="glass"
            value={apiKeyDraft}
            onChangeText={setApiKeyDraft}
            placeholder="New API key (optional — leave blank to keep)"
            autoCapitalize="none"
            secureTextEntry
            style={styles.configInput}
          />
          <Input
            variant="glass"
            value={apiBaseUrlDraft}
            onChangeText={setApiBaseUrlDraft}
            placeholder="https://universal-payment-api.sabrishahtab.workers.dev"
            autoCapitalize="none"
            style={styles.configInput}
          />
          <Button
            title={savingConfig ? 'Saving…' : 'Save settings'}
            variant="primary"
            fullWidth
            loading={savingConfig}
            disabled={savingConfig}
            onPress={saveConfig}
            style={styles.payButton}
          />
          <Button
            title={testing ? 'Testing…' : 'Test connection'}
            variant="secondary"
            fullWidth
            loading={testing}
            disabled={testing}
            onPress={testConnection}
            style={styles.payButton}
          />
          <Button
            title="Reset to app defaults"
            variant="secondary"
            fullWidth
            disabled={false}
            onPress={resetDefaults}
            style={styles.payButton}
          />
          {testNote ? <Text style={styles.meta}>{testNote}</Text> : null}
        </View>
      )}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {safetyLine ? <Text style={styles.warn}>{safetyLine}</Text> : null}

      {needsContinue ? (
        <View style={styles.row}>
          <View style={styles.half}>
            <Button
              title="Cancel"
              variant="secondary"
              fullWidth
              disabled={false}
              onPress={onCancelRecentChange}
              style={styles.payButton}
            />
          </View>
          <View style={styles.half}>
            <Button
              title="Continue"
              variant="primary"
              fullWidth
              disabled={false}
              onPress={onAcknowledgeRecentChange}
              style={styles.payButton}
            />
          </View>
        </View>
      ) : null}

      {canPay && primary ? (
        <Button
          title={`Pay ${primary.asset}`}
          variant="primary"
          size="large"
          fullWidth
          disabled={false}
          onPress={() => onPay(primary)}
          style={styles.payButton}
        />
      ) : null}

      {result.mappedOptions.length > 1 && !blocked && !needsContinue ? (
        <View style={styles.options}>
          <Text style={styles.foot}>Payment options</Text>
          {result.mappedOptions.map((option, index) => {
            const selected =
              primary?.address === option.address &&
              primary?.token_contract === option.token_contract &&
              primary?.network_identifier === option.network_identifier;
            const disabled = !option.payment_ready || !option.networkSupported;
            return (
              <Pressable
                key={`${option.address}-${option.network_identifier}-${index}`}
                disabled={disabled}
                onPress={() => onSelectOption(option)}
                style={[
                  styles.option,
                  selected && styles.optionSelected,
                  disabled && styles.optionDisabled,
                ]}
              >
                <Text style={styles.optionTitle}>
                  {option.asset} on {formatChainLabel(option.chain)}
                </Text>
                <Text style={styles.foot}>
                  To: {ellipsisAddress(option.address)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {!showConfig && !(needsKey || needsUrl) ? (
        <Pressable onPress={() => setShowConfig(true)} style={styles.configLink}>
          <Text style={styles.foot}>Resolver settings</Text>
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  meta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 6,
  },
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  amountBlock: {
    marginTop: 4,
  },
  warn: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  error: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  foot: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 8,
  },
  configBlock: {
    marginTop: 8,
  },
  configInput: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  half: {
    flex: 1,
  },
  payButton: {
    marginTop: 16,
  },
  options: {
    marginTop: 16,
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionSelected: {
    borderColor: 'rgba(62, 207, 142, 0.7)',
    backgroundColor: 'rgba(62, 207, 142, 0.1)',
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionTitle: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  configLink: {
    marginTop: 12,
    alignItems: 'center',
  },
});
