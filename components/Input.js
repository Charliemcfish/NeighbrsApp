// components/Input.js
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONTS } from '../styles/theme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon,
  error,
  style,
  inputStyle,
  required = false,
  ...props
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        multiline && styles.multiline,
        error && styles.errorInput
      ]}>
        {icon && (
          <Ionicons name={icon} size={20} color="#666666" style={styles.icon} />
        )}
        <TextInput
          style={[
            styles.input,
            multiline && styles.multilineText,
            inputStyle
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontFamily: 'Barlow-Medium',
    fontSize: 16,
    marginBottom: 6,
    color: '#333333',
  },
  required: {
    color: '#FF0000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 30,
    overflow: 'hidden',
  },
  multiline: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'flex-start',
  },
  multilineText: {
    height: 'auto',
  },
  icon: {
    paddingLeft: 15,
  },
  input: {
    flex: 1,
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  errorInput: {
    borderColor: '#FF0000',
  },
  errorText: {
    fontFamily: 'Montserrat-Regular',
    color: '#FF0000',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default Input;