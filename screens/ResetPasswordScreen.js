// screens/ResetPasswordScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        
        {resetSent ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Password reset email sent! Check your inbox and follow the instructions to reset your password.
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.buttonText}>Return to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.instructions}>
              Enter your email address below and we'll send you instructions to reset your password.
            </Text>
            
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={[styles.button, loading && styles.disabledButton]} 
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.linkContainer} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Remember your password? <Text style={styles.link}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    color: '#333',
  },
  link: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  successContainer: {
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 30,
  },
});

export default ResetPasswordScreen;