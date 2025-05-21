// utils/firebaseDebug.js
import { getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

/**
 * Debug Firebase configuration
 * Logs the current Firebase configuration and state
 */
export const debugFirebaseConfig = () => {
  try {
    console.log('=== FIREBASE CONFIGURATION DEBUG ===');
    
    // Check if Firebase is initialized
    const apps = getApps();
    console.log(`Firebase apps initialized: ${apps.length}`);
    
    if (apps.length > 0) {
      const app = getApp();
      console.log('App name:', app.name);
      console.log('App options:', JSON.stringify({
        apiKey: app.options.apiKey ? '[PRESENT]' : '[MISSING]',
        authDomain: app.options.authDomain,
        projectId: app.options.projectId,
        storageBucket: app.options.storageBucket,
        messagingSenderId: app.options.messagingSenderId ? '[PRESENT]' : '[MISSING]',
        appId: app.options.appId ? '[PRESENT]' : '[MISSING]'
      }, null, 2));
    }
    
    // Check auth instance
    try {
      const auth = getAuth();
      console.log('Auth instance created');
      console.log('Current user:', auth.currentUser ? auth.currentUser.uid : 'None');
    } catch (authError) {
      console.error('Error getting auth instance:', authError);
    }
    
    // Check functions instance 
    try {
      const functions = getFunctions();
      console.log('Functions instance created');
      
      // Check if custom domain is used
      if (functions.customDomain) {
        console.log('Functions custom domain:', functions.customDomain);
      }
      
      // Check region
      console.log('Functions region:', functions.region || 'default');
    } catch (functionsError) {
      console.error('Error getting functions instance:', functionsError);
    }
    
    console.log('=== END FIREBASE DEBUG ===');
  } catch (error) {
    console.error('Error debugging Firebase config:', error);
  }
};

/**
 * Debug the current authentication state
 */
export const debugAuthState = () => {
  try {
    console.log('=== AUTH STATE DEBUG ===');
    
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user is currently signed in');
      return;
    }
    
    console.log('User is signed in');
    console.log('User ID:', user.uid);
    console.log('Email:', user.email);
    console.log('Email verified:', user.emailVerified);
    console.log('Provider ID:', user.providerId);
    
    // Get token
    user.getIdToken()
      .then(token => {
        console.log('ID token obtained successfully');
        console.log('Token length:', token.length);
        console.log('Token prefix:', token.substring(0, 10) + '...');
      })
      .catch(error => {
        console.error('Error getting ID token:', error);
      });
      
    console.log('=== END AUTH STATE DEBUG ===');
  } catch (error) {
    console.error('Error debugging auth state:', error);
  }
};