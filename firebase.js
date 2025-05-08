import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
// Check if Firebase is already initialized to avoid duplicate apps
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth with platform-specific persistence
let auth;

if (Platform.OS === 'web') {
  // Use standard auth for web
  auth = getAuth(app);
} else {
  // Use React Native specific persistence for mobile
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };