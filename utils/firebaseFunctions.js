// utils/firebaseFunctions.js

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { logError } from './errorLogger';

/**
 * Get Firebase Functions instance with the correct region
 */
export const getFirebaseFunctions = () => {
  try {
    const region = 'us-central1'; // Must match your deployed functions region
    
    // Get the Firebase app instance from auth
    const auth = getAuth();
    const functions = getFunctions(auth.app, region);
    
    return functions;
  } catch (error) {
    logError('getFirebaseFunctions', error);
    throw error;
  }
};

/**
 * Call a Firebase Function with proper error handling
 * @param {string} functionName - The name of the function to call
 * @param {object} data - The data to pass to the function
 */
export const callFirebaseFunction = async (functionName, data = {}) => {
  try {
    console.log(`Calling Firebase function: ${functionName}`);
    
    // Get functions instance
    const functions = getFirebaseFunctions();
    
    // Get function reference
    const functionRef = httpsCallable(functions, functionName);
    
    // Call function and return result - no need to manually add token
    // Firebase will automatically handle auth when using httpsCallable
    const result = await functionRef(data);
    
    return result.data;
  } catch (error) {
    logError(`callFirebaseFunction(${functionName})`, error);
    throw error;
  }
};