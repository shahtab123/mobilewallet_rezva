import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '@/config/theme';

/**
 * Network picker. Payment currency is USDC; gas is native (ETH / POL).
 */
export function NetworkPicker({
  networks = [],
  selectedKey,
  onSelect,
}) {
  const testnets = networks.filter((n) => n.env === 'testnet');
  const mainnets = networks.filter((n) => n.env === 'mainnet');

  const renderGroup = (title, items) => {
    if (!items.length) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.row}>
          {items.map((net) => {
            const selected = net.key === selectedKey;
            return (
              <Pressable
                key={net.key}
                onPress={() => onSelect(net.key)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text
                  style={[styles.chipName, selected && styles.chipNameSelected]}
                >
                  {net.name}
                </Text>
                <Text
                  style={[
                    styles.chipSymbol,
                    selected && styles.chipSymbolSelected,
                  ]}
                >
                  {net.paymentSymbol || 'USDC'}
                </Text>
                <Text style={styles.chipGas}>gas {net.symbol}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      {renderGroup('Testnet', testnets)}
      {renderGroup('Mainnet', mainnets)}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 14,
  },
  group: {
    gap: 8,
  },
  groupTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 118,
  },
  chipSelected: {
    borderColor: 'rgba(62, 207, 142, 0.65)',
    backgroundColor: colors.accentSoft,
  },
  chipName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  chipNameSelected: {
    color: colors.text,
  },
  chipSymbol: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '700',
  },
  chipSymbolSelected: {
    color: colors.accent,
  },
  chipGas: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
});
