// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS, FONTS } from '../styles/theme';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Welcome Back</Text>
          
          <View style={styles.formContainer}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              required
            />
            
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              icon="lock-closed-outline"
              required
            />
            
            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <Button 
              title="Login" 
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
              size="large"
            />
            
            <TouchableOpacity 
              style={styles.linkContainer} 
              onPress={() => navigation.navigate('SignUp')}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.link}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 20,
  },
  title: {
    ...FONTS.heading,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    color: COLORS.textDark,
  },
  formContainer: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontSize: 16,
  },
  loginButton: {
    width: '100%',
    marginTop: 10,
  },
  linkContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  linkText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  link: {
    ...FONTS.bodyBold,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default LoginScreen;