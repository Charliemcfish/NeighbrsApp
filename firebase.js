import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjdF9EGr5_5Qo4u5AxpZc8JuNKthdnIkc",
    authDomain: "neighbrs-app.firebaseapp.com",
    projectId: "neighbrs-app",
    storageBucket: "neighbrs-app.firebasestorage.app",
    messagingSenderId: "567444589768",
    appId: "1:567444589768:web:1c69ff8b4814d51e98e9fd",
    measurementId: "G-YF7WWJX5LL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
let auth;

if (Platform.OS === 'web') {
  // Use standard auth for web
  auth = getAuth(app);
} else {
  // Use React Native specific persistence for mobile
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth');
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };