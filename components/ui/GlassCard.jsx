import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/config/theme';

export const GlassCard = ({
  children,
  variant = 'default',
  className = '',
  style,
  ...props
}) => {
  return (
    <View
      style={[
        styles.panel,
        variant === 'large' && styles.large,
        variant === 'small' && styles.small,
        variant === 'default' && styles.default,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  default: { padding: 20 },
  large: { padding: 26 },
  small: { padding: 14 },
});
