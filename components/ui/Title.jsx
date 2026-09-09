import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const Title = ({ 
  children, 
  level = 1, 
  variant = 'default',
  className = '',
  style,
  ...props 
}) => {
  const levelClasses = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold'
  };

  const variantClasses = {
    default: 'text-gray-900',
    glass: 'text-white',
    gradient: 'text-blue-600'
  };

  const fallbackStyles = StyleSheet.create({
    1: {
      fontSize: 30,
      fontWeight: 'bold',
    },
    2: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    3: {
      fontSize: 20,
      fontWeight: '600',
    },
    4: {
      fontSize: 18,
      fontWeight: '600',
    },
    default: {
      color: '#111827',
    },
    glass: {
      color: 'white',
    },
    gradient: {
      color: '#2563eb',
    },
  });

  return (
    <Text 
      className={`${levelClasses[level]} ${variantClasses[variant]} ${className}`}
      style={[fallbackStyles[level], fallbackStyles[variant], style]}
      {...props}
    >
      {children}
    </Text>
  );
};