// screens/PaymentMethodScreen.js with region fix
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardField, useStripe, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebase';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import { logError } from '../utils/errorLogger';

// Function to get Firebase Functions with the correct region
const getFirebaseFunctions = () => {
  // Initialize functions with your region
  const functions = getFunctions(undefined, 'us-central1'); // Replace with your actual region
  
  // If you're using the emulator locally, uncomment this line
  // connectFunctionsEmulator(functions, "localhost", 5001);
  
  return functions;
};

const PaymentMethodScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [cardDetails, setCardDetails] = useState(null);
  const [userHasPaymentMethod, setUserHasPaymentMethod] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);
  const { confirmSetupIntent } = useConfirmSetupIntent();
  const { createPaymentMethod } = useStripe();

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      setFetchingStatus(true);
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Checking payment status for user:', user.uid);
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();
      setUserHasPaymentMethod(!!userData.hasPaymentMethod);
      console.log('User has payment method:', !!userData.hasPaymentMethod);
    } catch (error) {
      logError('checkPaymentStatus', error);
      Alert.alert('Error', 'Failed to check payment status. Please try again.');
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter valid card details');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('Adding payment method for user:', user.uid);

      // First, create a Stripe customer if not already created
      const functions = getFirebaseFunctions(); // Use the function to get region-specific functions
      
      console.log('Creating Stripe customer...');
      const createStripeCustomer = httpsCallable(functions, 'createStripeCustomer');
      
      console.log('Calling createStripeCustomer function...');
      const customerResult = await createStripeCustomer();
      console.log('Customer result:', customerResult.data);
      
      // Create a setup intent on the backend
      console.log('Creating setup intent...');
      const createSetupIntent = httpsCallable(functions, 'createSetupIntent');
      const { data: { clientSecret } } = await createSetupIntent();

      if (!clientSecret) {
        throw new Error('Failed to create setup intent');
      }
      
      console.log('Setup intent created successfully');

      // Confirm the setup intent with the card details
      console.log('Confirming setup intent...');
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Setup intent confirmation error:', error);
        throw new Error(error.message);
      }

      if (setupIntent) {
        console.log('Setup intent confirmed successfully:', setupIntent);
        
        // Update user's profile to indicate they have a payment method
        await updateDoc(doc(db, 'users', user.uid), {
          hasPaymentMethod: true,
          paymentMethodId: setupIntent.paymentMethodId,
          paymentMethodUpdatedAt: new Date()
        });
        
        console.log('User profile updated successfully');

        setUserHasPaymentMethod(true);
        Alert.alert(
          'Success',
          'Your payment method has been added successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      logError('handleAddPaymentMethod', error);
      Alert.alert('Error', error.message || 'Failed to add payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!cardDetails?.complete) {
      Alert.alert('Error', 'Please enter valid card details');
      return;
    }

    setLoading(true);

    try {
      // Same process as adding a new payment method
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      console.log('Updating payment method for user:', user.uid);

      // Get Firebase Functions with the correct region
      const functions = getFirebaseFunctions();
      
      // Create a setup intent on the backend
      console.log('Creating setup intent for update...');
      const createSetupIntent = httpsCallable(functions, 'createSetupIntent');
      const { data: { clientSecret } } = await createSetupIntent();

      if (!clientSecret) {
        throw new Error('Failed to create setup intent');
      }
      
      console.log('Setup intent created successfully');

      // Confirm the setup intent with the card details
      console.log('Confirming setup intent...');
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        console.error('Setup intent confirmation error:', error);
        throw new Error(error.message);
      }

      if (setupIntent) {
        console.log('Setup intent confirmed successfully:', setupIntent);
        
        // Update user's profile with new payment method
        await updateDoc(doc(db, 'users', user.uid), {
          hasPaymentMethod: true,
          paymentMethodId: setupIntent.paymentMethodId,
          paymentMethodUpdatedAt: new Date()
        });
        
        console.log('User profile updated successfully');

        Alert.alert(
          'Success',
          'Your payment method has been updated successfully',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      logError('handleUpdatePaymentMethod', error);
      Alert.alert('Error', error.message || 'Failed to update payment method. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Checking payment status...</Text>
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
        <Text style={styles.headerTitle}>
          {userHasPaymentMethod ? 'Update Payment Method' : 'Add Payment Method'}
        </Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Card Information</Text>
          <Text style={styles.description}>
            {userHasPaymentMethod
              ? 'Update your credit or debit card details'
              : 'Add your credit or debit card to pay for jobs'}
          </Text>

          <View style={styles.cardFieldContainer}>
            <CardField
              postalCodeEnabled={true}
              placeholders={{
                number: '4242 4242 4242 4242',
                expiration: 'MM/YY',
                cvc: 'CVC',
                postalCode: 'Postal Code',
              }}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
              }}
              style={styles.cardField}
              onCardChange={details => setCardDetails(details)}
            />
          </View>

          <Text style={styles.securityNote}>
            <Ionicons name="lock-closed" size={14} color={COLORS.textMedium} />
            {' '}Your payment information is securely processed by Stripe
          </Text>

          {userHasPaymentMethod ? (
            <Button
              title={loading ? 'Updating...' : 'Update Card'}
              onPress={handleUpdatePaymentMethod}
              loading={loading}
              disabled={loading || !cardDetails?.complete}
              style={styles.button}
              size="large"
            />
          ) : (
            <Button
              title={loading ? 'Adding...' : 'Add Card'}
              onPress={handleAddPaymentMethod}
              loading={loading}
              disabled={loading || !cardDetails?.complete}
              style={styles.button}
              size="large"
            />
          )}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How payments work:</Text>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Your card is securely stored with Stripe</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>Payments for jobs are authorized when a job starts</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>You're only charged when you mark a job as complete</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>For tip-only jobs, you can add a tip when the job is complete</Text>
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
  cardSection: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  sectionTitle: {
    ...FONTS.heading,
    fontSize: 20,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  description: {
    ...FONTS.body,
    color: COLORS.textMedium,
    marginBottom: 20,
  },
  cardFieldContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginVertical: 10,
  },
  securityNote: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '100%',
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

export default PaymentMethodScreen;