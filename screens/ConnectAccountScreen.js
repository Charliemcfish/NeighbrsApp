// screens/ConnectAccountScreen.js - Updated for Express onboarding
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
import { auth } from '../firebase';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { logError } from '../utils/errorLogger';
import { callFirebaseFunction } from '../utils/firebaseFunctions';

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
      console.log('Checking Connect account status...');
      
      if (!auth.currentUser) {
        console.error('User not authenticated when checking Connect account status');
        throw new Error('User not authenticated');
      }
      
      console.log('Current user:', auth.currentUser.uid);
      
      const result = await callFirebaseFunction('checkConnectAccountStatus');
      console.log('Connect account status result:', result);
      
      setAccountStatus(result);
    } catch (error) {
      logError('checkConnectAccountStatus', error);
      Alert.alert('Error', 'Failed to check your payment account status. Please try again.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSetupConnectAccount = async () => {
    try {
      setLoading(true);
      console.log('Setting up Connect Express account...');
      
      const result = await callFirebaseFunction('createConnectAccount');
      console.log('Connect account creation result:', result);
      
      const { accountLinkUrl } = result;
      
      if (accountLinkUrl) {
        console.log('Opening account link URL:', accountLinkUrl);
        // Open the account link URL in the device's browser
        await Linking.openURL(accountLinkUrl);
        
        // Show a message to the user
        Alert.alert(
          'Quick Payment Setup',
          'You\'ll be redirected to complete a quick setup to receive payments. This should only take a few minutes!',
          [{ text: 'OK' }]
        );
      } else {
        console.log('No account link URL received');
        Alert.alert('Error', 'Failed to generate setup link. Please try again.');
      }
    } catch (error) {
      logError('handleSetupConnectAccount', error);
      Alert.alert('Error', 'Failed to set up your payment account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      setLoading(true);
      console.log('Completing Connect account setup...');
      
      const result = await callFirebaseFunction('createAccountLink');
      console.log('Account link creation result:', result);
      
      const { accountLinkUrl } = result;
      
      if (accountLinkUrl) {
        console.log('Opening account link URL:', accountLinkUrl);
        await Linking.openURL(accountLinkUrl);
        
        Alert.alert(
          'Complete Setup',
          'Please complete the remaining steps to activate your payment account.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('No account link URL received');
        Alert.alert('Error', 'Failed to generate setup link. Please try again.');
      }
    } catch (error) {
      logError('handleCompleteSetup', error);
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
                <Text style={styles.statusLabel}>Account Type:</Text>
                <Text style={styles.statusValue}>
                  {accountStatus.accountType === 'express' ? 'Express (Quick Setup)' : 'Standard'}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text 
                  style={[
                    styles.statusValue, 
                    accountStatus.accountStatus === 'complete' ? styles.statusComplete : styles.statusIncomplete
                  ]}
                >
                  {accountStatus.accountStatus === 'complete' ? 'Ready to receive payments' : 'Setup incomplete'}
                </Text>
              </View>
              
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Can Accept Payments:</Text>
                <Text 
                  style={[
                    styles.statusValue, 
                    accountStatus.chargesEnabled ? styles.statusComplete : styles.statusIncomplete
                  ]}
                >
                  {accountStatus.chargesEnabled ? 'Yes' : 'Not yet'}
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
                  {accountStatus.payoutsEnabled ? 'Yes' : 'Not yet'}
                </Text>
              </View>
              
              {accountStatus.needsOnboarding ? (
                <View style={styles.incompleteMessage}>
                  <Ionicons name="alert-circle" size={24} color={COLORS.warning} style={styles.alertIcon} />
                  <Text style={styles.incompleteText}>
                    {accountStatus.accountType === 'express' 
                      ? 'Your quick setup is almost complete! Please finish the remaining steps to start receiving payments.'
                      : 'Your payment account setup is incomplete. Please complete all required steps to receive payments.'
                    }
                  </Text>
                </View>
              ) : (
                <View style={styles.completeMessage}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} style={styles.successIcon} />
                  <Text style={styles.completeText}>
                    Great! Your payment account is fully set up and ready to receive payments from completed jobs.
                  </Text>
                </View>
              )}
              
              {accountStatus.requirementsOverdue && (
                <View style={styles.urgentMessage}>
                  <Ionicons name="warning" size={24} color={COLORS.error} style={styles.alertIcon} />
                  <Text style={styles.urgentText}>
                    Action required: Some information is overdue. Please complete your setup to continue receiving payments.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.setupPrompt}>
              <Ionicons name="card-outline" size={48} color={COLORS.primary} style={styles.setupIcon} />
              <Text style={styles.noAccountText}>
                Set up your payment account to start receiving money for completed jobs.
              </Text>
              <Text style={styles.setupBenefit}>
                ✓ Quick 2-minute setup{'\n'}
                ✓ Secure payments via Stripe{'\n'}
                ✓ Money sent directly to your bank
              </Text>
            </View>
          )}
        </View>

        {!accountStatus?.hasAccount ? (
          <Button
            title={loading ? "Setting up..." : "Quick Setup (2 mins)"}
            onPress={handleSetupConnectAccount}
            loading={loading}
            disabled={loading}
            style={styles.setupButton}
            size="large"
          />
        ) : accountStatus.needsOnboarding ? (
          <Button
            title={loading ? "Loading..." : "Complete Quick Setup"}
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
          <Text style={styles.infoTitle}>How Express Setup Works:</Text>
          <View style={styles.infoItem}>
            <Ionicons name="flash" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Quick 2-minute setup - no lengthy business forms</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Secure identity verification through Stripe</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Just need your ID and bank account details</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Start receiving payments as soon as setup is complete</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Payments typically arrive in 1-2 business days</Text>
          </View>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you encounter any issues during setup, you can restart the process anytime by tapping the setup button again.
          </Text>
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
  urgentMessage: {
    flexDirection: 'row',
    backgroundColor: '#ffebee',
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
  urgentText: {
    ...FONTS.body,
    flex: 1,
    color: COLORS.error,
  },
  setupPrompt: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  setupIcon: {
    marginBottom: 15,
  },
  noAccountText: {
    ...FONTS.body,
    color: COLORS.textDark,
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 16,
  },
  setupBenefit: {
    ...FONTS.body,
    color: COLORS.textMedium,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
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
  helpSection: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    ...SHADOWS.small,
  },
  helpTitle: {
    ...FONTS.bodyBold,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  helpText: {
    ...FONTS.body,
    color: COLORS.textMedium,
    lineHeight: 20,
  },
});

export default ConnectAccountScreen;