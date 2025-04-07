// navigation.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Import your screens
import LandingScreen from './screens/LandingScreen';
import SignUpScreen from './screens/SignUpScreen';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import HelperSetupScreen from './screens/HelperSetupScreen';
import HomeScreen from './screens/HomeScreen';
import EditProfileScreen from './screens/EditProfileScreen';  
import BrowseHelpersScreen from './screens/helpers/BrowseHelpersScreen';
import HelperProfileScreen from './screens/helpers/HelperProfileScreen';
import FeedbackScreen from './screens/FeedbackScreen';

const Stack = createStackNavigator();

// Default screen options to hide header across all screens
const screenOptions = {
  headerShown: false
};

const Navigation = () => {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {user ? (
          // User is signed in
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
          />
          
        ) : (
          // User is not signed in
          <>
            <Stack.Screen 
              name="Landing" 
              component={LandingScreen} 
            />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        )}
        <Stack.Screen name="HelperSetup" component={HelperSetupScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="BrowseHelpers" component={BrowseHelpersScreen} />
        <Stack.Screen name="HelperProfile" component={HelperProfileScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;