// utils/stripeService.js
import { initStripe } from '@stripe/stripe-react-native';
import axios from 'axios';

// Your Stripe publishable key
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51Ox3nTJx8ZWvgwYADp5jzL5vPqyZjmSe3nTNyLldCOvdepDkXadB4UQopYcgWpfyASlI5tXaVIEyVSJTMNVXZjXf00bw9Lhlkl';

// Your API URL (we'll need to set this up)
const API_URL = 'https://your-backend-api.com';

// Initialize Stripe
export const initializeStripe = async () => {
  return await initStripe({
    publishableKey: STRIPE_PUBLISHABLE_KEY,
    merchantIdentifier: 'merchant.com.neighbrs',
    urlScheme: 'neighbrs',
  });
};

// Create a payment intent (to hold funds when job starts)
export const createPaymentIntent = async (amount, userId, jobId) => {
  try {
    const response = await axios.post(`${API_URL}/create-payment-intent`, {
      amount,
      userId,
      jobId,
      capture_method: 'manual' // This tells Stripe to authorize but not capture the payment
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

// Capture a payment (when job is completed)
export const capturePayment = async (paymentIntentId, jobId) => {
  try {
    const response = await axios.post(`${API_URL}/capture-payment`, {
      paymentIntentId,
      jobId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error capturing payment:', error);
    throw error;
  }
};

// Create a tip payment
export const createTipPayment = async (amount, userId, helperId, jobId) => {
  try {
    const response = await axios.post(`${API_URL}/create-tip-payment`, {
      amount,
      userId,
      helperId,
      jobId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating tip payment:', error);
    throw error;
  }
};

// Setup a Stripe Connect account for a user
export const setupConnectAccount = async (userId, email, name) => {
  try {
    const response = await axios.post(`${API_URL}/create-connect-account`, {
      userId,
      email,
      name
    });
    
    return response.data;
  } catch (error) {
    console.error('Error setting up Connect account:', error);
    throw error;
  }
};

// Update a user's Stripe account details
export const updateStripeAccount = async (userId, accountDetails) => {
  try {
    const response = await axios.post(`${API_URL}/update-stripe-account`, {
      userId,
      accountDetails
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating Stripe account:', error);
    throw error;
  }
};

// Get a user's Stripe account details
export const getStripeAccountDetails = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/get-stripe-account/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting Stripe account details:', error);
    throw error;
  }
};

// Verify if a user has a valid Stripe account
export const verifyStripeAccount = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/verify-stripe-account/${userId}`);
    return response.data.isValid;
  } catch (error) {
    console.error('Error verifying Stripe account:', error);
    return false;
  }
};