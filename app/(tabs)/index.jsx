import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { useWallet } from '@/contexts/WalletContext';
import {
  GlassCard,
  Button,
  Title,
  Input,
  IconButton,
  SettingsModal,
} from '@/components/ui';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/config/theme';
import { NetworkPicker } from '@/components/NetworkPicker';

export default function HomeScreen() {
  const {
    wallet,
    isReady,
    hasStoredWallet,
    isLoading,
    isAuthenticated,
    error,
    networkName,
    networkSymbol,
    paymentSymbol,
    networkKey,
    networkEnv,
    networks,
    switchNetwork,
    unlockWallet,
    createNewWallet,
    refreshBalance,
    exportPrivateKey,
    restoreFromPrivateKey,
  } = useWallet();

  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');

  const handleExportPrivateKey = async () => {
    try {
      const privateKey = await exportPrivateKey();
      Alert.alert('Export Private Key', 'Choose how to export your private key:', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy to Clipboard',
          onPress: () => {
            Clipboard.setStringAsync(privateKey);
            Alert.alert('Copied', 'Private key copied to clipboard');
          },
        },
        {
          text: 'Show Key',
          onPress: () => {
            Alert.alert('Private Key', privateKey, [{ text: 'OK' }], {
              cancelable: true,
            });
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        'Export Failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const handleRestoreWallet = async () => {
    if (!privateKeyInput.trim()) {
      Alert.alert('Error', 'Please enter a private key');
      return;
    }
    try {
      await restoreFromPrivateKey(privateKeyInput.trim());
      setShowRestoreModal(false);
      setPrivateKeyInput('');
      Alert.alert('Success', 'Wallet restored');
    } catch (err) {
      Alert.alert(
        'Restore Failed',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const copyAddress = async () => {
    if (!wallet?.address) return;
    await Clipboard.setStringAsync(wallet.address);
    Alert.alert('Copied', 'Address copied to clipboard');
  };

  if (!isReady || isLoading) {
    return (
      <ImageBackground
        source={require('../../assets/images/background1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.centered}>
          <GlassCard variant="large">
            <View style={styles.cardCenter}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Starting wallet…</Text>
            </View>
          </GlassCard>
        </View>
      </ImageBackground>
    );
  }

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../../assets/images/background1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <View style={styles.authContainer}>
          <GlassCard variant="large" style={styles.authCard}>
            <Title level={2} variant="glass" style={styles.authTitle}>
              Wallet
            </Title>
            <Text style={styles.authSubtitle}>
              Unlock an existing wallet or create a new one to send and receive.
            </Text>

            {hasStoredWallet ? (
              <Button
                title="Unlock wallet"
                variant="primary"
                size="large"
                fullWidth
                disabled={false}
                onPress={unlockWallet}
                style={styles.authButton}
              />
            ) : null}

            <Button
              title={hasStoredWallet ? 'Create new wallet' : 'Create wallet'}
              variant={hasStoredWallet ? 'secondary' : 'primary'}
              size="large"
              fullWidth
              disabled={false}
              onPress={() => {
                if (hasStoredWallet) {
                  Alert.alert(
                    'Replace wallet?',
                    'Creating a new wallet replaces the stored key on this device. Export the old key first if you need it.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Create', onPress: createNewWallet },
                    ]
                  );
                } else {
                  createNewWallet();
                }
              }}
              style={styles.authButton}
            />

            <Button
              title="Restore from private key"
              variant="secondary"
              size="medium"
              fullWidth
              disabled={false}
              onPress={() => setShowRestoreModal(true)}
              style={styles.authButton}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </GlassCard>
        </View>

        <Modal
          visible={showRestoreModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowRestoreModal(false)}
        >
          <ImageBackground
            source={require('../../assets/images/background1.png')}
            style={styles.backgroundImage}
            resizeMode="cover"
          >
            <View style={styles.overlay} />
            <View style={styles.modalHeader}>
              <Title level={2} variant="glass">
                Restore Wallet
              </Title>
              <Button
                title="Cancel"
                variant="glass"
                size="small"
                disabled={false}
                onPress={() => setShowRestoreModal(false)}
                style={{}}
              />
            </View>
            <View style={styles.modalContent}>
              <GlassCard>
                <Text style={styles.modalDescription}>
                  Enter a private key (0x…). This becomes the active wallet on
                  this device.
                </Text>
                <Input
                  variant="glass"
                  value={privateKeyInput}
                  onChangeText={setPrivateKeyInput}
                  placeholder="0x…"
                  multiline
                  numberOfLines={3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ marginBottom: 16 }}
                />
                <Button
                  title="Restore"
                  variant="glass"
                  size="large"
                  fullWidth
                  disabled={!privateKeyInput.trim()}
                  onPress={handleRestoreWallet}
                  style={{}}
                />
              </GlassCard>
            </View>
          </ImageBackground>
        </Modal>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/background1.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerContainer}>
          <Title level={1} variant="glass" style={styles.mainTitle}>
            Your Wallet
          </Title>
          <IconButton
            icon="⬢"
            variant="glass"
            size="small"
            onPress={() => setShowSettingsModal(true)}
            style={styles.settingsButton}
          />
        </View>

        {wallet && (
          <GlassCard style={styles.balanceCard}>
            <View style={styles.envBadgeRow}>
              <Text style={styles.networkLabel}>{networkName}</Text>
              <Text
                style={[
                  styles.envBadge,
                  networkEnv === 'testnet' ? styles.envTestnet : styles.envMainnet,
                ]}
              >
                {networkEnv === 'testnet' ? 'Testnet' : 'Mainnet'}
              </Text>
            </View>
            <Text style={styles.balanceLabel}>USDC</Text>
            <Text style={styles.balanceValue}>
              {parseFloat(wallet.usdcBalance || '0').toFixed(4)}{' '}
              {paymentSymbol}
            </Text>
            <Text style={styles.gasLine}>
              Gas: {parseFloat(wallet.balance || '0').toFixed(5)} {networkSymbol}
            </Text>
            <Text style={styles.addressText}>{wallet.address}</Text>
            <View style={styles.actionsRow}>
              <Button
                title="Copy address"
                variant="secondary"
                size="small"
                disabled={false}
                onPress={copyAddress}
                style={styles.actionBtn}
              />
              <Button
                title="Refresh"
                variant="secondary"
                size="small"
                disabled={false}
                onPress={refreshBalance}
                style={styles.actionBtn}
              />
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.networkCard}>
          <Text style={styles.sectionLabel}>Network</Text>
          <Text style={styles.sectionHint}>
            Pay with USDC. {networkSymbol} is only used for gas.
          </Text>
          <NetworkPicker
            networks={networks}
            selectedKey={networkKey}
            onSelect={async (key) => {
              try {
                await switchNetwork(key);
              } catch (err) {
                Alert.alert(
                  'Network',
                  err instanceof Error ? err.message : 'Switch failed'
                );
              }
            }}
          />
        </GlassCard>

        {error ? (
          <GlassCard style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}
      </ScrollView>

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onExportPrivateKey={handleExportPrivateKey}
        onRestoreWallet={() => {
          setShowSettingsModal(false);
          setShowRestoreModal(true);
        }}
      />

      <Modal
        visible={showRestoreModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <ImageBackground
          source={require('../../assets/images/background1.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <View style={styles.modalHeader}>
            <Title level={2} variant="glass">
              Restore Wallet
            </Title>
            <Button
              title="Cancel"
              variant="glass"
              size="small"
              disabled={false}
              onPress={() => setShowRestoreModal(false)}
              style={{}}
            />
          </View>
          <View style={styles.modalContent}>
            <GlassCard>
              <Text style={styles.modalDescription}>
                Enter your private key to restore a wallet.
              </Text>
              <Input
                variant="glass"
                value={privateKeyInput}
                onChangeText={setPrivateKeyInput}
                placeholder="0x…"
                multiline
                numberOfLines={3}
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 16 }}
              />
              <Button
                title="Restore"
                variant="glass"
                size="large"
                fullWidth
                disabled={!privateKeyInput.trim()}
                onPress={handleRestoreWallet}
                style={{}}
              />
            </GlassCard>
          </View>
        </ImageBackground>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCenter: { alignItems: 'center' },
  loadingText: {
    color: colors.text,
    fontSize: 17,
    marginTop: 16,
    fontWeight: '500',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
  },
  authTitle: { textAlign: 'center', marginBottom: 8, color: colors.text },
  authSubtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },
  authButton: { marginBottom: 12 },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: 22,
    paddingTop: 58,
    paddingBottom: 120,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  mainTitle: {
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  settingsButton: { position: 'absolute', right: 0, top: 0 },
  balanceCard: { marginBottom: 16 },
  networkCard: { marginBottom: 28 },
  envBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  envBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  envTestnet: {
    color: '#fde68a',
    backgroundColor: 'rgba(232, 184, 109, 0.18)',
  },
  envMainnet: {
    color: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionHint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  networkLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 6,
  },
  gasLine: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  addressText: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: 'SpaceMono',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  actionBtn: { flex: 1 },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 16,
    lineHeight: 18,
  },
  errorCard: {
    backgroundColor: 'rgba(176, 40, 48, 0.35)',
    borderColor: 'rgba(240, 113, 120, 0.35)',
  },
  errorText: {
    color: '#fecaca',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  modalContent: { flex: 1, padding: 24 },
  modalDescription: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 22,
  },
});
