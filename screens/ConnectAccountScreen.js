// screens/ConnectAccountScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

const ConnectAccountScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkConnectAccountStatus();
  }, []);

  const checkConnectAccountStatus = async () => {
    try {
      setCheckingStatus(true);
      const functions = getFunctions();
      const checkConnectStatus = httpsCallable(functions, 'checkConnectAccountStatus');
      const result = await checkConnectStatus();
      
      setAccountStatus(result.data);
    } catch (error) {
      console.error('Error checking Connect account status:', error);
      Alert.alert('Error', 'Failed to check your payment account status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSetupConnectAccount = async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const createConnectAccount = httpsCallable(functions, 'createConnectAccount');
      const result = await createConnectAccount();
      
      const { accountLinkUrl } = result.data;
      
      if (accountLinkUrl) {
        // Open the account link URL in the device's browser
        await Linking.openURL(accountLinkUrl);
        
        // Show a message to the user
        Alert.alert(
          'Stripe Setup',
          'You\'ll be redirected to set up your Stripe account. Please complete all steps to receive payments.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error setting up Connect account:', error);
      Alert.alert('Error', 'Failed to set up your payment account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const createAccountLink = httpsCallable(functions, 'createAccountLink');
      const result = await createAccountLink();
      
      const { accountLinkUrl } = result.data;
      
      if (accountLinkUrl) {
        await Linking.openURL(accountLinkUrl);
        
        Alert.alert(
          'Complete Setup',
          'Please complete all remaining steps to activate your payment account.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating account link:', error);
      Alert.alert('Error', 'Failed to create setup link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking account status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Setup</Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.sectionTitle}>Payment Account Status</Text>
          
          {accountStatus?.hasAccount ? (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Account Status:</Text>
                <Text 
                  style={[
                    styles.statusValue, 
                    accountStatus.accountStatus === 'complete' ? styles.statusComplete : styles.statusIncomplete
                  ]}
                >
                  {accountStatus.accountStatus === 'complete' ? 'Complete' : 'Incomplete'}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Charges Enabled:</Text>
                <Text 
                  style={[
                    styles.statusValue, 
                    accountStatus.chargesEnabled ? styles.statusComplete : styles.statusIncomplete
                  ]}
                >
                  {accountStatus.chargesEnabled ? 'Yes' : 'No'}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Payouts Enabled:</Text>
                <Text 
                  style={[
                    styles.statusValue, 
                    accountStatus.payoutsEnabled ? styles.statusComplete : styles.statusIncomplete
                  ]}
                >
                  {accountStatus.payoutsEnabled ? 'Yes' : 'No'}
                </Text>
              </View>
              
              {accountStatus.needsOnboarding ? (
                <View style={styles.incompleteMessage}>
                  <Ionicons name="alert-circle" size={24} color={COLORS.warning} style={styles.alertIcon} />
                  <Text style={styles.incompleteText}>
                    Your payment account setup is incomplete. Please complete all required steps to receive payments.
                  </Text>
                </View>
              ) : (
                <View style={styles.completeMessage}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} style={styles.successIcon} />
                  <Text style={styles.completeText}>
                    Your payment account is fully set up and ready to receive payments!
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noAccountText}>
              You haven't set up a payment account yet. Set up your account to receive payments for completed jobs.
            </Text>
          )}
        </View>

        {!accountStatus?.hasAccount ? (
          <Button
            title={loading ? "Setting up..." : "Set Up Payment Account"}
            onPress={handleSetupConnectAccount}
            loading={loading}
            disabled={loading}
            style={styles.setupButton}
            size="large"
          />
        ) : accountStatus.needsOnboarding ? (
          <Button
            title={loading ? "Loading..." : "Complete Account Setup"}
            onPress={handleCompleteSetup}
            loading={loading}
            disabled={loading}
            style={styles.completeButton}
            size="large"
          />
        ) : (
          <Button
            title="Refresh Status"
            onPress={checkConnectAccountStatus}
            type="secondary"
            style={styles.refreshButton}
            size="medium"
          />
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How Payments Work:</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>You need a Stripe account to receive payments from jobs</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Payments are securely processed by Stripe when jobs are completed</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Stripe may hold funds for a few days before releasing to your bank account</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Stripe will send payouts directly to your bank account</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...FONTS.body,
    marginTop: 10,
    color: COLORS.textDark,
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
  },
  statusCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  sectionTitle: {
    ...FONTS.heading,
    fontSize: 20,
    marginBottom: 20,
    color: COLORS.textDark,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  statusValue: {
    ...FONTS.bodyBold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusComplete: {
    color: COLORS.success,
  },
  statusIncomplete: {
    color: COLORS.warning,
  },
  completeMessage: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  incompleteMessage: {
    flexDirection: 'row',
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  alertIcon: {
    marginRight: 10,
  },
  successIcon: {
    marginRight: 10,
  },
  completeText: {
    ...FONTS.body,
    flex: 1,
    color: COLORS.success,
  },
  incompleteText: {
    ...FONTS.body,
    flex: 1,
    color: COLORS.warning,
  },
  noAccountText: {
    ...FONTS.body,
    color: COLORS.textMedium,
    marginBottom: 10,
    textAlign: 'center',
  },
  setupButton: {
    marginBottom: 20,
  },
  completeButton: {
    marginBottom: 20,
    backgroundColor: COLORS.warning,
  },
  refreshButton: {
    marginBottom: 20,
    alignSelf: 'center',
  },
  infoSection: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  infoTitle: {
    ...FONTS.bodyBold,
    fontSize: 18,
    marginBottom: 15,
    color: COLORS.textDark,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    ...FONTS.body,
    flex: 1,
    color: COLORS.textDark,
  },
});

export default ConnectAccountScreen;