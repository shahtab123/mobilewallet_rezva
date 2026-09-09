import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@/config/theme';

export const IconButton = ({
  icon,
  label,
  variant = 'glass',
  size = 'medium',
  disabled,
  style,
  ...props
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles.glass,
        size === 'small' && styles.small,
        size === 'large' && styles.large,
        size === 'medium' && styles.medium,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <Text style={[styles.text, size === 'small' && styles.textSmall]}>
        {icon}
      </Text>
      {label ? <Text style={styles.labelText}>{label}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  small: { padding: 8 },
  medium: { padding: 12 },
  large: { padding: 16 },
  disabled: { opacity: 0.5 },
  text: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 18,
  },
  textSmall: { fontSize: 16 },
  labelText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
