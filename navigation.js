import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import your screens (we'll create these next)
import LandingScreen from './screens/LandingScreen';
import SignUpScreen from './screens/SignUpScreen';
import LoginScreen from './screens/LoginScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import HelperSetupScreen from './screens/HelperSetupScreen';

const Stack = createStackNavigator();

const Navigation = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Landing">
        <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="HelperSetup" component={HelperSetupScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;