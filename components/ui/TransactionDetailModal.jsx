import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, ImageBackground, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { Title } from './Title';
import BlockchainService from '../../services/BlockchainService';
import { ethers } from 'ethers';

export default function TransactionDetailModal({
  visible,
  transaction,
  onClose
}) {
  const [fullDetails, setFullDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && transaction) {
      loadTransactionDetails();
    }
  }, [visible, transaction]);

  const loadTransactionDetails = async () => {
    if (!transaction) return;

    setIsLoading(true);
    setError(null);

    try {
      const provider = BlockchainService.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const [txResponse, txReceipt, block] = await Promise.all([
        provider.getTransaction(transaction.hash),
        provider.getTransactionReceipt(transaction.hash),
        provider.getBlock(transaction.blockNumber)
      ]);

      if (!txResponse || !txReceipt) {
        throw new Error('Transaction not found');
      }

      const details = {
        hash: txResponse.hash,
        blockNumber: txReceipt.blockNumber,
        blockHash: txReceipt.blockHash,
        transactionIndex: txReceipt.index,
        from: txResponse.from,
        to: txResponse.to || '',
        value: ethers.formatEther(txResponse.value),
        gasLimit: txResponse.gasLimit.toString(),
        gasUsed: txReceipt.gasUsed.toString(),
        gasPrice: txResponse.gasPrice?.toString() || '0',
        effectiveGasPrice: txReceipt.gasPrice?.toString(),
        nonce: txResponse.nonce,
        data: txResponse.data,
        type: txResponse.type || 0,
        status: txReceipt.status === 1 ? 'success' : 'failed',
        timestamp: (block?.timestamp || 0) * 1000,
        confirmations: txReceipt.confirmations || 0,
        maxFeePerGas: txResponse.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: txResponse.maxPriorityFeePerGas?.toString()
      };

      setFullDetails(details);
    } catch (err) {
      console.error('Failed to load transaction details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transaction details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (value) => {
    return parseFloat(value).toFixed(6);
  };

  const formatGwei = (wei) => {
    try {
      return parseFloat(ethers.formatUnits(wei, 'gwei')).toFixed(2) + ' Gwei';
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const openPolygonScan = () => {
    if (transaction?.hash) {
      const url = `https://polygonscan.com/tx/${transaction.hash}`;
      Linking.openURL(url);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      // For React Native, we'll need to use Expo's Clipboard
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(text);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  if (!transaction) return null;

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
          <Title level={2} variant="glass">Transaction Details</Title>
          <Button
            title="⨯"
            variant="glass"
            size="small"
            onPress={onClose}
          />
        </View>
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <GlassCard style={styles.loadingCard}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </GlassCard>
          ) : error ? (
            <GlassCard style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <Button
                title="↻ Retry"
                variant="glass"
                size="small"
                onPress={loadTransactionDetails}
              />
            </GlassCard>
          ) : fullDetails ? (
            <>
              {/* Transaction Status */}
              <GlassCard style={styles.detailCard}>
                <View style={styles.statusRow}>
                  <Text style={styles.label}>Status</Text>
                  <Text style={[
                    styles.status,
                    fullDetails.status === 'success' ? styles.statusSuccess : styles.statusFailed
                  ]}>
                    {fullDetails.status === 'success' ? '✓ Success' : '✗ Failed'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Type</Text>
                  <Text style={styles.value}>
                    {transaction.type === 'sent' ? '↗ Sent' : '↘ Received'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.value}>{formatDate(fullDetails.timestamp)}</Text>
                </View>
              </GlassCard>

              {/* Transaction Hash & Block */}
              <GlassCard style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Hash</Text>
                  <Text style={styles.hashValue}>{fullDetails.hash}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Block</Text>
                  <Text style={styles.value}>#{fullDetails.blockNumber}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Position</Text>
                  <Text style={styles.value}>{fullDetails.transactionIndex}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Confirmations</Text>
                  <Text style={styles.value}>{fullDetails.confirmations}</Text>
                </View>
              </GlassCard>

              {/* Addresses */}
              <GlassCard style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>From</Text>
                  <Text style={styles.addressValue}>{fullDetails.from}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>To</Text>
                  <Text style={styles.addressValue}>{fullDetails.to}</Text>
                </View>
              </GlassCard>

              {/* Value & Gas */}
              <GlassCard style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Value</Text>
                  <Text style={styles.amountValue}>
                    {formatAmount(fullDetails.value)} POL
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Gas Limit</Text>
                  <Text style={styles.value}>{fullDetails.gasLimit}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Gas Used</Text>
                  <Text style={styles.value}>{fullDetails.gasUsed}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Gas Price</Text>
                  <Text style={styles.value}>{formatGwei(fullDetails.gasPrice)}</Text>
                </View>
                {fullDetails.effectiveGasPrice && (
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Effective Gas Price</Text>
                    <Text style={styles.value}>{formatGwei(fullDetails.effectiveGasPrice)}</Text>
                  </View>
                )}
              </GlassCard>

              {/* EIP-1559 Fields (if available) */}
              {(fullDetails.maxFeePerGas || fullDetails.maxPriorityFeePerGas) && (
                <GlassCard style={styles.detailCard}>
                  {fullDetails.maxFeePerGas && (
                    <View style={styles.detailRow}>
                      <Text style={styles.label}>Max Fee Per Gas</Text>
                      <Text style={styles.value}>{formatGwei(fullDetails.maxFeePerGas)}</Text>
                    </View>
                  )}
                  {fullDetails.maxPriorityFeePerGas && (
                    <View style={styles.detailRow}>
                      <Text style={styles.label}>Max Priority Fee</Text>
                      <Text style={styles.value}>{formatGwei(fullDetails.maxPriorityFeePerGas)}</Text>
                    </View>
                  )}
                </GlassCard>
              )}

              {/* Additional Details */}
              <GlassCard style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Nonce</Text>
                  <Text style={styles.value}>{fullDetails.nonce}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Input Data</Text>
                  <Text style={styles.dataValue}>
                    {fullDetails.data === '0x' ? 'None' : `${fullDetails.data.slice(0, 20)}...`}
                  </Text>
                </View>
              </GlassCard>

              {/* Action Buttons */}
              <GlassCard style={styles.actionCard}>
                <Button
                  title="⬡ View on PolygonScan"
                  variant="glass"
                  size="medium"
                  fullWidth
                  onPress={openPolygonScan}
                />
              </GlassCard>
            </>
          ) : null}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  loadingCard: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: 'rgba(254, 202, 202, 1)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
  },
  detailCard: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSuccess: {
    color: '#86efac',
  },
  statusFailed: {
    color: '#fca5a5',
  },
  hashValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  addressValue: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  amountValue: {
    color: '#86efac',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 2,
    textAlign: 'right',
  },
  dataValue: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 2,
    textAlign: 'right',
  },
  actionCard: {
    marginTop: 8,
  },
});