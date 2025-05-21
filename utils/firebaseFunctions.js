// utils/firebaseFunctions.js
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { logError } from './errorLogger';
import { verifyAuthentication, getAuthToken } from './authUtils';

/**
 * Get Firebase Functions instance with the correct region
 * @returns {Functions} Firebase Functions instance
 */
export const getFirebaseFunctions = () => {
  try {
    // Initialize functions with the correct region
    // First check for region in process.env
    const region = 'us-central1'; // Default to us-central1 if not specified
    
    console.log(`Initializing Firebase Functions with region: ${region}`);
    
    // Initialize functions with explicit parameters: app and region
    const auth = getAuth();
    const functions = getFunctions(auth.app, region);
    
    // If you're using the emulator locally, uncomment these lines
    // if (__DEV__) {
    //   console.log('Using Firebase Functions emulator');
    //   connectFunctionsEmulator(functions, 'localhost', 5001);
    // }
    
    return functions;
  } catch (error) {
    logError('getFirebaseFunctions', error);
    throw error;
  }
};

/**
 * Call a Firebase Function with proper error handling and authentication verification
 * @param {string} functionName - The name of the function to call
 * @param {object} data - The data to pass to the function
 * @returns {Promise<any>} The result of the function call
 */
export const callFirebaseFunction = async (functionName, data = {}) => {
  try {
    // First verify authentication
    const isAuthenticated = await verifyAuthentication();
    
    if (!isAuthenticated) {
      console.error('User is not authenticated for function call');
      throw new Error('User not authenticated');
    }
    
    // Get fresh ID token
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Could not obtain authentication token');
    }
    
    // Now use the fresh token for the function call
    
    // Get functions instance
    const functions = getFirebaseFunctions();
    
    // Get function reference
    const functionRef = httpsCallable(functions, functionName);
    
    // Include the token in metadata (not needed for most cases, but just in case)
    const metadata = {
      auth: token
    };
    
    // Call function and return result
    console.log(`Calling Firebase function: ${functionName}`);
    const result = await functionRef(data);
    console.log(`Function ${functionName} completed successfully`);
    
    return result.data;
  } catch (error) {
    logError(`callFirebaseFunction(${functionName})`, error);
    throw error;
  }
};

// For debugging purposes - use this to inspect the current auth state
export const debugAuthState = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    console.log('DEBUG: No user is currently signed in');
    return null;
  }
  
  console.log('DEBUG: User is signed in');
  console.log('DEBUG: User ID:', user.uid);
  console.log('DEBUG: Email:', user.email);
  console.log('DEBUG: Email verified:', user.emailVerified);
  
  return {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified
  };
};