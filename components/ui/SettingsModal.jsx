import React from 'react';
import { View, Text, Modal, StyleSheet, ImageBackground } from 'react-native';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { Title } from './Title';

export default function SettingsModal({
  visible,
  onClose,
  onExportPrivateKey,
  onRestoreWallet
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ImageBackground
        source={require('../../assets/images/background1.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        
        <View style={styles.modalHeader}>
          <Title level={2} variant="glass">⬢ Settings</Title>
          <Button
            title="⨯"
            variant="glass"
            size="small"
            onPress={onClose}
          />
        </View>
        
        <View style={styles.modalContent}>
          <GlassCard style={styles.settingsCard}>
            <Text style={styles.sectionDescription}>
              Manage your wallet settings and security options
            </Text>
            
            <View style={styles.buttonSpacing}>
              <Button
                title="↗ Export Private Key"
                variant="glass"
                size="medium"
                fullWidth
                onPress={onExportPrivateKey}
              />
            </View>
            
            <Button
              title="↻ Restore Wallet"
              variant="glass"
              size="medium"
              fullWidth
              onPress={onRestoreWallet}
            />
          </GlassCard>
        </View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  settingsCard: {
    marginBottom: 30,
  },
  sectionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
  buttonSpacing: {
    marginBottom: 16,
  },
});