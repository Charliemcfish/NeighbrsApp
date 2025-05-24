// Enhanced utils/firebaseFunctions.js with detailed debugging

import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { logError } from './errorLogger';

let functionsInstance = null;

/**
 * Get Firebase Functions instance with the correct region
 */
export const getFirebaseFunctions = () => {
  try {
    if (functionsInstance) {
      return functionsInstance;
    }

    const region = 'us-central1';
    const auth = getAuth();
    functionsInstance = getFunctions(auth.app, region);
    
    return functionsInstance;
  } catch (error) {
    logError('getFirebaseFunctions', error);
    throw error;
  }
};

/**
 * Enhanced function calling with detailed debugging
 */
export const callFirebaseFunction = async (functionName, data = {}) => {
  try {
    console.log(`=== CALLING FIREBASE FUNCTION: ${functionName} ===`);
    
    // Check authentication state
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('User must be authenticated to call Firebase Functions');
    }
    
    console.log('✅ User authenticated:', user.uid);
    console.log('📧 User email:', user.email);
    console.log('🔐 Email verified:', user.emailVerified);
    
    // Get and verify token
    try {
      const token = await user.getIdToken(true); // Force refresh
      console.log('🎫 Token obtained successfully');
      console.log('📏 Token length:', token.length);
      console.log('🔤 Token preview:', token.substring(0, 50) + '...');
      
      // Verify token is not expired
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = tokenData.exp;
      const timeUntilExpiration = expirationTime - now;
      
      console.log('⏰ Token expires in:', timeUntilExpiration, 'seconds');
      
      if (timeUntilExpiration <= 0) {
        console.error('❌ Token is expired');
        throw new Error('Authentication token is expired');
      }
      
    } catch (tokenError) {
      console.error('❌ Token error:', tokenError);
      throw new Error('Failed to get authentication token');
    }
    
    // Get functions instance
    console.log('🔧 Getting functions instance...');
    const functions = getFirebaseFunctions();
    console.log('✅ Functions instance created');
    
    // Create function reference
    console.log('📞 Creating function reference...');
    const functionRef = httpsCallable(functions, functionName);
    console.log('✅ Function reference created');
    
    // Log request data
    console.log('📤 Request data:', JSON.stringify(data, null, 2));
    
    // Make the call
    console.log('🚀 Making function call...');
    const startTime = Date.now();
    
    const result = await functionRef(data);
    
    const endTime = Date.now();
    console.log(`✅ Function call completed in ${endTime - startTime}ms`);
    console.log('📥 Response data:', JSON.stringify(result.data, null, 2));
    
    console.log(`=== END FIREBASE FUNCTION: ${functionName} ===`);
    
    return result.data;
    
  } catch (error) {
    console.error(`❌ Function ${functionName} failed:`, error);
    
    // Enhanced error logging
    console.error('🔍 Error details:');
    console.error('  - Code:', error.code);
    console.error('  - Message:', error.message);
    console.error('  - Details:', error.details);
    
    if (error.code === 'functions/unauthenticated') {
      console.error('🚨 Authentication Error Analysis:');
      
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (!user) {
        console.error('  - No user is currently signed in');
      } else {
        console.error('  - User is signed in:', user.uid);
        console.error('  - Email:', user.email);
        console.error('  - Email verified:', user.emailVerified);
        
        // Try to get token again
        try {
          const token = await user.getIdToken(true);
          console.error('  - Token can be obtained, length:', token.length);
        } catch (tokenError) {
          console.error('  - Cannot obtain token:', tokenError.message);
        }
      }
    }
    
    logError(`callFirebaseFunction(${functionName})`, error);
    
    // Provide user-friendly error messages
    if (error.code === 'functions/unauthenticated') {
      throw new Error('Authentication failed. Please sign out and sign in again.');
    } else if (error.code === 'functions/permission-denied') {
      throw new Error('You do not have permission to perform this action.');
    } else if (error.code === 'functions/unavailable') {
      throw new Error('Service temporarily unavailable. Please try again later.');
    } else if (error.code === 'functions/deadline-exceeded') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw error;
  }
};

/**
 * Test function specifically for debugging
 */
export const testFirebaseFunction = async () => {
  try {
    console.log('🧪 Testing Firebase Function connection...');
    const result = await callFirebaseFunction('debugAuth', { test: true });
    console.log('✅ Test successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
};

/**
 * Debug authentication state for functions
 */
export const debugAuthState = () => {
  try {
    console.log('=== FIREBASE FUNCTIONS AUTH DEBUG ===');
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('❌ No user is currently signed in for functions');
      return;
    }
    
    console.log('✅ Functions auth check:');
    console.log('  - User ID:', user.uid);
    console.log('  - Email:', user.email);
    console.log('  - Email verified:', user.emailVerified);
    console.log('  - Provider data:', user.providerData);
    
    // Test token retrieval
    user.getIdToken(true)
      .then(token => {
        console.log('✅ Functions token obtained successfully');
        console.log('  - Token length:', token.length);
        console.log('  - Token starts with:', token.substring(0, 20) + '...');
        
        // Parse token payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('  - Token issued at:', new Date(payload.iat * 1000));
          console.log('  - Token expires at:', new Date(payload.exp * 1000));
          console.log('  - Token audience:', payload.aud);
          console.log('  - Token issuer:', payload.iss);
        } catch (parseError) {
          console.error('  - Could not parse token payload:', parseError);
        }
      })
      .catch(error => {
        console.error('❌ Error getting token for functions:', error);
      });
      
    console.log('=== END FUNCTIONS AUTH DEBUG ===');
  } catch (error) {
    console.error('Error debugging functions auth state:', error);
  }
};