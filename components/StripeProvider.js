// components/StripeProvider.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StripeProvider as NativeStripeProvider } from '@stripe/stripe-react-native';
import { initializeStripe } from '../utils/stripeService';
import { COLORS, FONTS } from '../styles/theme';

const StripeProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupStripe = async () => {
      try {
        await initializeStripe();
        setLoading(false);
      } catch (err) {
        console.error('Error setting up Stripe:', err);
        setError('Failed to initialize payment system');
        setLoading(false);
      }
    };

    setupStripe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ ...FONTS.body, marginTop: 20, color: COLORS.textDark }}>
          Setting up payment system...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ ...FONTS.bodyBold, color: COLORS.error, marginBottom: 10, textAlign: 'center' }}>
          {error}
        </Text>
        <Text style={{ ...FONTS.body, color: COLORS.textDark, textAlign: 'center' }}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <NativeStripeProvider
      publishableKey="pk_test_51RLPSVEP3auVpDo10N8I7TIyeZHv86hcbuQLvu5TLBvDsX18mbOL9K7da3VMCzETB1tAWCDJ7z2jqXIhrglaBF9x00vkKvOPzK"
      merchantIdentifier="merchant.com.neighbrs"
      urlScheme="neighbrs"
    >
      {children}
    </NativeStripeProvider>
  );
};

export default StripeProvider;