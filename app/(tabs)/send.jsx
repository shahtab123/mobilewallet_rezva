import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Pressable,
  Platform,
  AppState,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useWallet } from '@/contexts/WalletContext';
import { GlassCard, Button, Title, Input } from '@/components/ui';
import { RezvaResolutionPanel } from '@/components/RezvaResolutionPanel';
import BlockchainService from '@/services/BlockchainService';
import {
  classifySendInput,
  resolveSendInput,
  REZVA_IDENTIFIER_MAX_CHARS,
} from '@/services/rezva';
import { colors } from '@/config/theme';
import { getUsdcForChain } from '@/config/tokens';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** Google/iOS system scanners leave Expo Go and land on the Expo home screen. */
function canUseSystemBarcodeScanner() {
  if (Platform.OS === 'web') return false;
  if (!CameraView.isModernBarcodeScannerAvailable) return false;
  // Expo Go / store client — keep scanning inside the app.
  if (Constants.appOwnership === 'expo') return false;
  if (Constants.executionEnvironment === 'storeClient') return false;
  return true;
}

function debounce(fn, ms) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

export default function SendScreen() {
  const router = useRouter();
  const {
    wallet,
    isAuthenticated,
    error,
    networkSymbol,
    networkName,
    paymentSymbol,
    sendErc20Transaction,
    getErc20Balance,
  } = useWallet();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [rezvaResult, setRezvaResult] = useState(null);
  const [rezvaLoading, setRezvaLoading] = useState(false);
  const [acknowledgedRecentChange, setAcknowledgedRecentChange] =
    useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);
  const [rezvaAmount, setRezvaAmount] = useState('');

  const [scanOpen, setScanOpen] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const modernScanSub = useRef(null);
  const pendingScanRef = useRef(null);

  const validateAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

  const findChainById = useCallback((chainId) => {
    const key = BlockchainService.getNetworkKeyByChainId(chainId);
    if (!key) return null;
    return { id: chainId, key };
  }, []);

  const runResolve = useCallback(
    async (raw) => {
      const classification = classifySendInput(raw);
      if (classification.kind !== 'identifier') {
        setRezvaResult(null);
        setSelectedOption(null);
        setTokenBalance(null);
        return;
      }

      setRezvaLoading(true);
      setAcknowledgedRecentChange(false);
      try {
        const result = await resolveSendInput(raw, { findChainById });
        setRezvaResult(result);
        const firstReady =
          result.mappedOptions.find(
            (o) => o.payment_ready && o.networkSupported
          ) || result.mappedOptions[0] || null;
        setSelectedOption(firstReady);
        if (firstReady?.fixed_amount) {
          setRezvaAmount(firstReady.fixed_amount);
        } else {
          setRezvaAmount('');
        }
      } catch (err) {
        setRezvaResult({
          classification,
          response: null,
          mappedOptions: [],
          safety: null,
          error: {
            name: 'Error',
            message: err?.message || 'Resolve failed',
            code: 'RESOLVER_ERROR',
          },
        });
      } finally {
        setRezvaLoading(false);
      }
    },
    [findChainById]
  );

  const debouncedResolve = useRef(debounce(runResolve, 450)).current;

  useEffect(() => {
    const trimmed = (recipient || '').trim();
    if (!trimmed) {
      setIsValidAddress(true);
    } else {
      const kind = classifySendInput(trimmed).kind;
      // EMV / Bangla QR and other identifiers are not EVM addresses — don't flag as invalid.
      if (kind === 'identifier' || kind === 'ens') {
        setIsValidAddress(true);
      } else {
        setIsValidAddress(validateAddress(trimmed));
      }
    }
    debouncedResolve(recipient);
    return () => debouncedResolve.cancel?.();
  }, [recipient, debouncedResolve]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (
        !selectedOption?.token_contract ||
        !selectedOption.networkSupported ||
        selectedOption.chainId == null
      ) {
        setTokenBalance(null);
        return;
      }
      try {
        const networkKey = BlockchainService.getNetworkKeyByChainId(
          selectedOption.chainId
        );
        if (!networkKey) {
          setTokenBalance(null);
          return;
        }
        await BlockchainService.switchNetwork(networkKey);
        const bal = await getErc20Balance(selectedOption.token_contract);
        if (!cancelled) {
          setTokenBalance(
            `${parseFloat(bal.balance).toFixed(4)} ${bal.symbol}`
          );
        }
      } catch {
        if (!cancelled) setTokenBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedOption, getErc20Balance]);

  const handleNativeSend = async () => {
    if (!recipient || !amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!validateAddress(recipient)) {
      Alert.alert('Error', 'Please enter a valid Ethereum address');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const chainId = BlockchainService.getCurrentNetwork()?.chainId;
    const usdc = getUsdcForChain(chainId);
    if (!usdc) {
      Alert.alert('Error', 'USDC is not configured for this network.');
      return;
    }

    if (wallet && numAmount > parseFloat(wallet.usdcBalance || '0')) {
      Alert.alert('Error', 'Insufficient USDC balance');
      return;
    }

    Alert.alert(
      'Confirm payment',
      `Send ${amount} USDC to ${recipient.slice(0, 10)}…${recipient.slice(
        -8
      )}?\nGas paid in ${networkSymbol}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setIsSending(true);
              const txHash = await sendErc20Transaction({
                tokenContract: usdc.address,
                to: recipient,
                amount,
                decimals: usdc.decimals,
                chainId,
              });
              Alert.alert(
                'Success',
                `USDC sent! Hash: ${txHash.slice(0, 10)}…${txHash.slice(-8)}`
              );
              setRecipient('');
              setAmount('');
            } catch (err) {
              Alert.alert(
                'Transaction Failed',
                err.message || 'Unknown error occurred'
              );
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const handleRezvaPay = async (option) => {
    const payAmount = option.fixed_amount || rezvaAmount;
    if (!payAmount || parseFloat(payAmount) <= 0) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (!option.address || !option.token_contract || option.chainId == null) {
      Alert.alert(
        'Error',
        'Resolved payment option is missing address, token_contract, or network_identifier.'
      );
      return;
    }

    Alert.alert(
      'Confirm payment',
              `Send ${payAmount} ${option.asset || 'USDC'} to ${option.address.slice(
                0,
                8
              )}…${option.address.slice(-6)} on ${option.chain}?\nGas paid in ETH.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            try {
              setIsSending(true);
              const txHash = await sendErc20Transaction({
                tokenContract: option.token_contract,
                to: option.address,
                amount: payAmount,
                decimals:
                  option.asset?.toUpperCase() === 'USDC'
                    ? getUsdcForChain(option.chainId)?.decimals ?? 6
                    : undefined,
                chainId: option.chainId,
              });
              Alert.alert(
                'Success',
                `Transaction sent!\n${txHash}\n\nView on explorer if needed.`
              );
              setRecipient('');
              setRezvaResult(null);
              setRezvaAmount('');
              setSelectedOption(null);
            } catch (err) {
              Alert.alert(
                'Payment failed',
                err.message || 'Unknown error occurred'
              );
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  const applyScannedData = useCallback(
    (data) => {
      const value = String(data || '')
        .trim()
        .slice(0, REZVA_IDENTIFIER_MAX_CHARS);
      if (!value) return;
      if (scannedRef.current) return;
      scannedRef.current = true;
      setScanOpen(false);
      setRecipient(value);
      // Stay on Send after system scanner (standalone builds).
      try {
        router.replace('/(tabs)/send');
      } catch {
        // ignore
      }
    },
    [router]
  );

  const openInAppScanner = useCallback(() => {
    scannedRef.current = false;
    setCameraKey((k) => k + 1);
    setScanOpen(true);
  }, []);

  const openScanner = async () => {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        Alert.alert(
          'Camera permission',
          'Allow camera access to scan payment QR codes.'
        );
        return;
      }
    }

    scannedRef.current = false;

    // System Google/iOS scanners exit Expo Go to the Expo home screen.
    // Keep scanning in-app under Expo Go so the wallet stays open.
    if (canUseSystemBarcodeScanner()) {
      try {
        modernScanSub.current?.remove?.();
        modernScanSub.current = CameraView.onModernBarcodeScanned((event) => {
          modernScanSub.current?.remove?.();
          modernScanSub.current = null;
          pendingScanRef.current = event?.data || null;
          applyScannedData(event?.data);
          CameraView.dismissScanner?.().catch(() => undefined);
        });
        await CameraView.launchScanner({ barcodeTypes: ['qr'] });
        return;
      } catch (err) {
        modernScanSub.current?.remove?.();
        modernScanSub.current = null;
        console.warn('launchScanner failed, using in-app camera', err);
      }
    }

    openInAppScanner();
  };

  // If a system scan completes while the app was backgrounded, re-apply on resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const pending = pendingScanRef.current;
      if (!pending) return;
      pendingScanRef.current = null;
      scannedRef.current = false;
      applyScannedData(pending);
    });
    return () => sub.remove();
  }, [applyScannedData]);

  useEffect(() => {
    return () => {
      modernScanSub.current?.remove?.();
      modernScanSub.current = null;
    };
  }, []);

  const closeScanner = () => {
    setScanOpen(false);
  };

  const onBarcodeScanned = ({ data }) => {
    applyScannedData(data);
  };

  const showNativeForm =
    !rezvaLoading &&
    (!rezvaResult || rezvaResult.classification.kind !== 'identifier');

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../../assets/images/background2.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.centered}>
          <GlassCard>
            <Text style={styles.messageText}>
              Unlock or create a wallet on the Wallet tab first.
            </Text>
          </GlassCard>
        </View>
      </ImageBackground>
    );
  }

  return (
    <View style={styles.root}>
    <ImageBackground
      source={require('../../assets/images/background2.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Title level={1} variant="glass" style={styles.mainTitle}>
          Send
        </Title>

        {wallet && (
          <GlassCard style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>USDC · {networkName}</Text>
            <Text style={styles.balanceValue}>
              {parseFloat(wallet.usdcBalance || '0').toFixed(4)}{' '}
              {paymentSymbol}
            </Text>
            <Text style={styles.networkHint}>
              Gas: {parseFloat(wallet.balance || '0').toFixed(5)} {networkSymbol}{' '}
              · {wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}
            </Text>
          </GlassCard>
        )}

        <GlassCard style={styles.formCard}>
          <Text style={styles.fieldLabel}>
            To (address, payment ID, or Bangla QR)
          </Text>
          <Input
            variant="glass"
            value={recipient}
            onChangeText={(text) =>
              setRecipient(text.slice(0, REZVA_IDENTIFIER_MAX_CHARS))
            }
            placeholder="0x…, email, name.provider, or full EMV QR"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={REZVA_IDENTIFIER_MAX_CHARS}
            style={[
              styles.input,
              styles.recipientInput,
              !isValidAddress &&
              recipient &&
              classifySendInput(recipient).kind === 'address'
                ? styles.inputError
                : {},
            ]}
          />
          <Button
            title="Scan QR"
            variant="secondary"
            size="medium"
            fullWidth
            onPress={openScanner}
            style={styles.scanButton}
          />
        </GlassCard>

        <RezvaResolutionPanel
          result={rezvaResult}
          loading={rezvaLoading}
          acknowledgedRecentChange={acknowledgedRecentChange}
          onAcknowledgeRecentChange={() => setAcknowledgedRecentChange(true)}
          onCancelRecentChange={() => {
            setAcknowledgedRecentChange(false);
            setRezvaResult(null);
            setRecipient('');
          }}
          onPay={handleRezvaPay}
          selectedOption={selectedOption}
          onSelectOption={(option) => {
            setSelectedOption(option);
            if (option.fixed_amount) setRezvaAmount(option.fixed_amount);
          }}
          amount={rezvaAmount}
          onAmountChange={setRezvaAmount}
          tokenBalance={tokenBalance}
          onConfigSaved={() => runResolve(recipient)}
        />

        {showNativeForm ? (
          <GlassCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Amount (USDC)</Text>
            <Input
              variant="glass"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.0"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Button
              title={isSending ? 'Sending…' : 'Send USDC'}
              variant="primary"
              size="large"
              fullWidth
              loading={isSending}
              disabled={
                !recipient ||
                !amount ||
                !isValidAddress ||
                isSending
              }
              onPress={handleNativeSend}
              style={styles.sendButton}
            />
          </GlassCard>
        ) : null}

        {error && (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorMessage}>{error}</Text>
          </GlassCard>
        )}

        <GlassCard style={styles.warningCard}>
          <Text style={styles.warningText}>
            Double-check the destination before confirming. On-chain transfers
            cannot be reversed.
          </Text>
        </GlassCard>
      </ScrollView>
    </ImageBackground>

      {scanOpen ? (
        <View style={styles.scannerOverlay} collapsable={false}>
          <CameraView
            key={cameraKey}
            style={{ width: SCREEN_W, height: SCREEN_H }}
            facing="back"
            active
            autofocus="on"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={onBarcodeScanned}
            onMountError={(e) => {
              Alert.alert(
                'Camera error',
                e?.message || 'Could not start camera preview.'
              );
              closeScanner();
            }}
          >
            <View style={styles.scannerUi} pointerEvents="box-none">
              <Pressable style={styles.scannerClose} onPress={closeScanner}>
                <Text style={styles.scannerCloseText}>Close</Text>
              </Pressable>
              <View style={styles.viewfinderWrap} pointerEvents="none">
                <View style={styles.viewfinder} />
              </View>
              <Text style={styles.scannerHint}>
                Point at a payment QR, Bangla EMV QR, or Rezva JSON QR
              </Text>
            </View>
          </CameraView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backgroundImage: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 22,
    paddingTop: 58,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mainTitle: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: 28,
  },
  balanceCard: {
    marginBottom: 18,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  balanceValue: {
    color: colors.accent,
    fontSize: 26,
    fontWeight: '700',
  },
  networkHint: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
  },
  formCard: { marginBottom: 16 },
  fieldLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },
  input: { marginBottom: 4 },
  recipientInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  inputError: {
    borderColor: colors.danger,
    borderWidth: 1,
  },
  scanButton: { marginTop: 4 },
  sendButton: { marginTop: 16 },
  errorCard: {
    backgroundColor: 'rgba(176, 40, 48, 0.35)',
    borderColor: 'rgba(240, 113, 120, 0.35)',
    marginBottom: 16,
  },
  errorMessage: {
    color: '#fecaca',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningCard: {
    backgroundColor: 'rgba(90, 60, 10, 0.45)',
    borderColor: 'rgba(232, 184, 109, 0.3)',
    marginBottom: 16,
  },
  warningText: {
    color: '#fde68a',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  messageText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: '#000',
  },
  scannerUi: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  scannerClose: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
  },
  scannerCloseText: { color: '#fff', fontWeight: '600' },
  viewfinderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinder: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'transparent',
  },
  scannerHint: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
