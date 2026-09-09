import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { colors } from '@/config/theme';

export const Input = ({
  label,
  error,
  variant = 'default',
  fullWidth = true,
  className = '',
  style,
  ...props
}) => {
  const isGlass = variant === 'glass';

  return (
    <View style={[styles.container, fullWidth && styles.fullWidth]}>
      {label ? (
        <Text style={[styles.label, isGlass && styles.labelGlass]}>{label}</Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          isGlass ? styles.inputGlass : styles.inputDefault,
          error ? styles.inputError : null,
          style,
        ]}
        placeholderTextColor={
          isGlass ? colors.textDim : 'rgba(0, 0, 0, 0.4)'
        }
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  labelGlass: {
    color: colors.textMuted,
  },
  input: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputDefault: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#111827',
  },
  inputGlass: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: 4,
    fontSize: 13,
    color: colors.danger,
  },
});
