// components/Button.js - Fixed for Android
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { FONTS } from '../styles/theme';

const Button = ({ 
  title, 
  onPress, 
  type = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`${type}Button`],
        styles[`${size}Button`],
        disabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={type === 'primary' ? 'white' : '#008CFF'} />
      ) : (
        <Text 
          style={[
            styles.buttonText, 
            styles[`${type}ButtonText`],
            styles[`${size}ButtonText`],
            textStyle
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    // Enhanced shadow for better visibility on Android
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButton: {
    backgroundColor: '#008CFF',
    // Ensure white text is visible on Android
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: 'white', // Changed from transparent for better Android compatibility
    borderWidth: 2,
    borderColor: '#008CFF',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36, // Ensure minimum touch target
  },
  mediumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44, // Standard touch target
  },
  largeButton: {
    paddingVertical: 15,
    paddingHorizontal: 32,
    minHeight: 50, // Larger touch target
  },
  buttonText: {
    fontFamily: 'Barlow-Medium',
    textAlign: 'center',
    fontWeight: '600',
    // Ensure text is always visible
    includeFontPadding: false, // Android-specific: prevents extra padding
  },
  primaryButtonText: {
    color: '#FFFFFF', // Explicit white color
  },
  secondaryButtonText: {
    color: '#008CFF',
  },
  smallButtonText: {
    fontSize: 14,
  },
  mediumButtonText: {
    fontSize: 16,
  },
  largeButtonText: {
    fontSize: 18,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    borderColor: '#CCCCCC',
    opacity: 0.6,
  },
});

export default Button;