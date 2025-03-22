// components/KeyboardAvoidingWrapper.js
import React from 'react';
import { 
  KeyboardAvoidingView, 
  ScrollView, 
  TouchableWithoutFeedback, 
  Keyboard, 
  Platform,
  StyleSheet 
} from 'react-native';

const KeyboardAvoidingWrapper = ({ children, style }) => {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});

export default KeyboardAvoidingWrapper;