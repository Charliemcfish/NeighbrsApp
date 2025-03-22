import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration (you'll get this from Firebase console)
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

// Initialize Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };