// screens/FirebaseDebugScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { debugFirebaseConfig, debugAuthState } from '../utils/firebaseDebug';
import { callFirebaseFunction, debugAuthState as debugFunctionAuthState } from '../utils/firebaseFunctions';
import { verifyAuthentication, getAuthToken } from '../utils/authUtils';



const FirebaseDebugScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('Unknown');
  const [logs, setLogs] = useState([]);
  const [testEmail, setTestEmail] = useState(''); // Set a test email
  const [testPassword, setTestPassword] = useState(''); // Set a test password
  
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)}: ${message}`]);
  };
  
  const checkAuthStatus = async () => {
    const auth = getAuth();
    if (auth.currentUser) {
      setAuthStatus(`Logged in as ${auth.currentUser.email}`);
    } else {
      setAuthStatus('Not logged in');
    }
  };
  
  const handleDebugFirebase = () => {
    addLog('Running Firebase config debug...');
    debugFirebaseConfig();
    addLog('Firebase config debug completed. Check console logs.');
  };
  
  const handleDebugAuth = () => {
    addLog('Running Auth state debug...');
    debugAuthState();
    debugFunctionAuthState();
    addLog('Auth state debug completed. Check console logs.');
  };
  
  const handleVerifyAuth = async () => {
    addLog('Verifying authentication...');
    setLoading(true);
    try {
      const isAuthenticated = await verifyAuthentication();
      addLog(`Authentication verification result: ${isAuthenticated}`);
      
      if (isAuthenticated) {
        const token = await getAuthToken();
        addLog(`Token obtained: ${token ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      addLog(`Error verifying authentication: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestSignIn = async () => {
    if (!testEmail || !testPassword) {
      Alert.alert('Error', 'Please provide test email and password');
      return;
    }
    
    addLog(`Signing in with email: ${testEmail}...`);
    setLoading(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, testEmail, testPassword);
      addLog('Sign in successful');
      checkAuthStatus();
    } catch (error) {
      addLog(`Sign in error: ${error.message}`);
      Alert.alert('Sign In Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignOut = async () => {
    addLog('Signing out...');
    setLoading(true);
    try {
      const auth = getAuth();
      await signOut(auth);
      addLog('Sign out successful');
      checkAuthStatus();
    } catch (error) {
      addLog(`Sign out error: ${error.message}`);
      Alert.alert('Sign Out Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestStripeCustomer = async () => {
    addLog('Testing createStripeCustomer function...');
    setLoading(true);
    try {
      const result = await callFirebaseFunction('createStripeCustomer');
      addLog(`Function result: ${JSON.stringify(result)}`);
      Alert.alert('Function Result', JSON.stringify(result));
    } catch (error) {
      addLog(`Function error: ${error.message}`);
      Alert.alert('Function Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestConnectAccount = async () => {
    addLog('Testing checkConnectAccountStatus function...');
    setLoading(true);
    try {
      const result = await callFirebaseFunction('checkConnectAccountStatus');
      addLog(`Function result: ${JSON.stringify(result)}`);
      Alert.alert('Function Result', JSON.stringify(result));
    } catch (error) {
      addLog(`Function error: ${error.message}`);
      Alert.alert('Function Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAuthFunction = async () => {
  addLog('Testing auth test function...');
  setLoading(true);
  try {
    const result = await callFirebaseFunction('testAuth');
    addLog(`Function result: ${JSON.stringify(result)}`);
    Alert.alert('Function Result', JSON.stringify(result));
  } catch (error) {
    addLog(`Function error: ${error.message}`);
    Alert.alert('Function Error', error.message);
  } finally {
    setLoading(false);
  }
};
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Firebase Debug</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Authentication Status</Text>
          <Text style={styles.statusText}>{authStatus}</Text>
        </View>
        
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Debug Actions</Text>
          
          <Button
            title="Debug Firebase Config"
            onPress={handleDebugFirebase}
            style={styles.button}
            disabled={loading}
          />
          
          <Button
            title="Debug Auth State"
            onPress={handleDebugAuth}
            style={styles.button}
            disabled={loading}
          />
          
          <Button
            title="Verify Authentication"
            onPress={handleVerifyAuth}
            style={styles.button}
            disabled={loading}
          />
          
          <Button
            title="Test Stripe Customer Function"
            onPress={handleTestStripeCustomer}
            style={styles.button}
            disabled={loading}
          />
          
          <Button
            title="Test Connect Account Function"
            onPress={handleTestConnectAccount}
            style={styles.button}
            disabled={loading}
          />
          
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            type="secondary"
            style={styles.button}
            disabled={loading}
          />

          <Button
  title="Test Auth Function"
  onPress={handleTestAuthFunction}
  style={styles.button}
  disabled={loading}
/>
        </View>
        
        <View style={styles.logsCard}>
          <Text style={styles.sectionTitle}>Debug Logs</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.emptyText}>No logs yet. Run some debug actions.</Text>
          )}
        </View>
      </ScrollView>
      
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  actionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  logsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.small,
    maxHeight: 300,
  },
  sectionTitle: {
    ...FONTS.heading,
    fontSize: 18,
    marginBottom: 15,
    color: COLORS.textDark,
  },
  statusText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  button: {
    marginBottom: 10,
  },
  logText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 5,
  },
  emptyText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.white,
    marginTop: 10,
  },
});

export default FirebaseDebugScreen;