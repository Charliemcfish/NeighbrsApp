// screens/HelperSetupScreen.js - Updated to use Stripe Connect
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { callFirebaseFunction } from '../utils/firebaseFunctions';
import { logError } from '../utils/errorLogger';

const jobTypes = [
  'Package Delivery', 
  'Car Buying Assistance', 
  'Running Errands',
  // Add more job types as needed
];

const HelperSetupScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [helpDescription, setHelpDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [stripeAccountLoading, setStripeAccountLoading] = useState(false);
  const [stripeAccountSetup, setStripeAccountSetup] = useState(false);

  useEffect(() => {
    // Check if user already has a Stripe account when component loads
    checkExistingStripeAccount();
  }, []);

  const checkExistingStripeAccount = async () => {
    try {
      const result = await callFirebaseFunction('checkConnectAccountStatus');
      console.log('Existing account status:', result);
      
      if (result.hasAccount && result.accountStatus === 'complete') {
        setStripeAccountSetup(true);
      }
    } catch (error) {
      // If there's an error checking, just continue - they can set it up
      console.log('No existing Stripe account found or error checking:', error.message);
    }
  };

  const toggleJobType = (jobType) => {
    if (selectedJobTypes.includes(jobType)) {
      setSelectedJobTypes(selectedJobTypes.filter(type => type !== jobType));
    } else {
      setSelectedJobTypes([...selectedJobTypes, jobType]);
    }
  };

  const handleSetupStripeAccount = async () => {
    try {
      setStripeAccountLoading(true);
      
      console.log('Setting up Stripe Connect account...');
      
      // Create the Connect account
      const result = await callFirebaseFunction('createConnectAccount');
      console.log('Connect account creation result:', result);
      
      if (result.accountLinkUrl) {
        console.log('Opening account link URL:', result.accountLinkUrl);
        
        // Import Linking at the top of the file
        const { Linking } = require('react-native');
        
        // Open the Stripe onboarding URL in the device's browser
        await Linking.openURL(result.accountLinkUrl);
        
        // Show instructions to the user
        Alert.alert(
          'Complete Payment Setup',
          'You\'ve been redirected to complete your payment account setup. Please finish the process in your browser, then return to the app to continue.',
          [
            {
              text: 'I completed the setup',
              onPress: () => {
                // Check if the account setup is actually complete
                checkStripeAccountStatus();
              }
            },
            {
              text: 'I need to finish later',
              style: 'cancel',
              onPress: () => {
                // User can continue setup later
                console.log('User will complete Stripe setup later');
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to generate setup link. Please try again.');
      }
    } catch (error) {
      logError('handleSetupStripeAccount', error);
      Alert.alert('Error', 'Failed to set up payment account. Please try again.');
    } finally {
      setStripeAccountLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      console.log('Checking Stripe account status...');
      
      const result = await callFirebaseFunction('checkConnectAccountStatus');
      console.log('Account status result:', result);
      
      if (result.hasAccount && result.accountStatus === 'complete') {
        setStripeAccountSetup(true);
        Alert.alert(
          'Setup Complete!',
          'Your payment account has been set up successfully. You can now receive payments for completed jobs.'
        );
      } else if (result.hasAccount && result.needsOnboarding) {
        Alert.alert(
          'Setup Incomplete',
          'Your payment account setup is not complete yet. Please finish the setup process to receive payments.',
          [
            {
              text: 'Continue Setup',
              onPress: () => handleSetupStripeAccount()
            },
            {
              text: 'Finish Later',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert(
          'Setup Not Found',
          'We couldn\'t find your payment account setup. Please try the setup process again.',
          [
            {
              text: 'Try Again',
              onPress: () => handleSetupStripeAccount()
            }
          ]
        );
      }
    } catch (error) {
      logError('checkStripeAccountStatus', error);
      Alert.alert(
        'Status Check Failed',
        'We couldn\'t verify your payment account status. Please try again or contact support if the problem persists.'
      );
    }
  };

  const handleSubmit = async () => {
    if (selectedJobTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one job type');
      return;
    }
  
    if (!helpDescription) {
      Alert.alert('Error', 'Please describe how you can help');
      return;
    }

    if (!stripeAccountSetup) {
      Alert.alert('Error', 'Please set up your payment account to receive payments');
      return;
    }
  
    setLoading(true);
  
    try {
      await updateDoc(doc(db, 'users', userId), {
        jobTypes: selectedJobTypes,
        helpDescription,
        isHelper: true,
        helperSetupComplete: true,
        stripeAccountSetupInitiated: true, // Track that they've started the setup process
      });
  
      Alert.alert(
        'Success',
        'Your helper profile is set up!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh the main app state to reflect the change
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }]
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Up Helper Profile</Text>
          <View style={{ width: 40 }} /> {/* Empty view for spacing */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.jobTypesContainer}>
            <Text style={styles.sectionTitle}>What can you help with?</Text>
            <Text style={styles.description}>
              Select the types of jobs you're willing to help neighbors with:
            </Text>
            
            <View style={styles.jobTypesWrapper}>
              {jobTypes.map((jobType) => (
                <TouchableOpacity
                  key={jobType}
                  style={[
                    styles.jobTypeButton,
                    selectedJobTypes.includes(jobType) && styles.selectedJobType
                  ]}
                  onPress={() => toggleJobType(jobType)}
                >
                  <Text 
                    style={[
                      styles.jobTypeText,
                      selectedJobTypes.includes(jobType) && styles.selectedJobTypeText
                    ]}
                  >
                    {jobType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <Text style={styles.label}>How can you help?</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={helpDescription}
            onChangeText={setHelpDescription}
            placeholder="Describe how you can help neighbors with these types of jobs..."
            multiline
            numberOfLines={4}
          />
          
          {/* Stripe Connect Setup Section */}
          <View style={styles.paymentSetupContainer}>
            <Text style={styles.sectionTitle}>Payment Setup</Text>
            <Text style={styles.description}>
              Set up your payment account to receive money for completed jobs:
            </Text>
            
            <View style={styles.paymentInfoCard}>
              <View style={styles.paymentInfoHeader}>
                <Ionicons name="card" size={24} color={COLORS.primary} />
                <Text style={styles.paymentInfoTitle}>Secure Payment Account</Text>
              </View>
              
              <Text style={styles.paymentInfoText}>
                We use Stripe to securely process payments. You'll need to provide:
              </Text>
              
              <View style={styles.requirementsList}>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.requirementText}>Government-issued ID</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.requirementText}>Bank account details</Text>
                </View>
                <View style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.requirementText}>Tax information (if applicable)</Text>
                </View>
              </View>
              
              {stripeAccountSetup ? (
                <View style={styles.setupCompleteContainer}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                  <Text style={styles.setupCompleteText}>Payment account setup complete!</Text>
                </View>
              ) : (
                <Button
                  title={stripeAccountLoading ? "Setting up..." : "Set Up Payment Account"}
                  onPress={handleSetupStripeAccount}
                  loading={stripeAccountLoading}
                  disabled={stripeAccountLoading}
                  style={styles.stripeButton}
                  size="large"
                />
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.button, 
              (loading || !stripeAccountSetup) && styles.disabledButton
            ]} 
            onPress={handleSubmit}
            disabled={loading || !stripeAccountSetup}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Saving...' : 'Complete Setup'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...SHADOWS.small,
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
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  jobTypesContainer: {
    marginBottom: 20,
  },
  jobTypesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  jobTypeButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 5,
  },
  selectedJobType: {
    backgroundColor: COLORS.primary,
  },
  jobTypeText: {
    color: COLORS.primary,
  },
  selectedJobTypeText: {
    color: 'white',
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
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  // Payment Setup Styles
  paymentSetupContainer: {
    marginBottom: 30,
  },
  paymentInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    ...SHADOWS.small,
  },
  paymentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentInfoTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginLeft: 10,
  },
  paymentInfoText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 15,
    lineHeight: 22,
  },
  requirementsList: {
    marginBottom: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    marginLeft: 8,
  },
  setupCompleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
  },
  setupCompleteText: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.success,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  stripeButton: {
    marginTop: 10,
  },
  
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
  },
});

export default HelperSetupScreen;