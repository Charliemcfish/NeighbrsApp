// utils/authUtils.js
import { getAuth } from 'firebase/auth';
import { logError } from './errorLogger';

/**
 * Get the current Firebase auth token
 * @returns {Promise<string|null>} The ID token or null if not authenticated
 */
export const getAuthToken = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user is currently authenticated');
      return null;
    }
    
    // Get the current token
    const token = await user.getIdToken(true);  // Force refresh the token
    console.log('Successfully retrieved auth token');
    return token;
  } catch (error) {
    logError('getAuthToken', error);
    return null;
  }
};

/**
 * Verify if the user is properly authenticated
 * @returns {Promise<boolean>} Whether the user is authenticated
 */
export const verifyAuthentication = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user is currently authenticated');
      return false;
    }
    
    // Check if the token is valid
    try {
      const token = await user.getIdToken();
      console.log('User is authenticated with valid token');
      console.log('User ID:', user.uid);
      console.log('Email:', user.email);
      console.log('Email verified:', user.emailVerified);
      console.log('Token received successfully');
      return true;
    } catch (tokenError) {
      logError('verifyAuthentication:getIdToken', tokenError);
      return false;
    }
  } catch (error) {
    logError('verifyAuthentication', error);
    return false;
  }
};