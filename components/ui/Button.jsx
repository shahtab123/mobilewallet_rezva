import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { colors } from '@/config/theme';

export const Button = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const isPrimary = variant === 'primary' || variant === 'glass';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isDanger && styles.danger,
        size === 'small' && styles.small,
        size === 'large' && styles.large,
        size === 'medium' && styles.medium,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.85}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isSecondary ? colors.ink : colors.text}
          style={styles.loader}
        />
      ) : null}
      <Text
        style={[
          styles.text,
          size === 'small' && styles.textSmall,
          size === 'large' && styles.textLarge,
          isSecondary && styles.textSecondary,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: colors.accentDeep,
    borderWidth: 1,
    borderColor: 'rgba(62, 207, 142, 0.45)',
  },
  secondary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  danger: {
    backgroundColor: '#b91c1c',
  },
  small: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  large: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  text: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 17,
  },
  textSecondary: {
    color: colors.text,
  },
  loader: {
    marginRight: 8,
  },
});
