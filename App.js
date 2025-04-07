import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Navigation from './navigation';
import { loadFonts } from './utils/fontLoader';  // Correct relative path

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Handle user state changes
  const onAuthStateChange = (user) => {
    setUser(user);
    if (initializing) setInitializing(false);
  };

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await loadFonts();
        
        // Set up authentication listener
        const unsubscribe = onAuthStateChanged(auth, onAuthStateChange);
        
        // Return cleanup function
        return unsubscribe;
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Navigation initialUser={user} />
      <StatusBar style="auto" />
    </View>
  );
}