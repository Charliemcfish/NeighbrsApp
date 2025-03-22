// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Import tab screens (we'll create these next)
import DashboardScreen from './tabs/DashboardScreen';
import JobsScreen from './tabs/JobsScreen';
import MessagesScreen from './tabs/MessagesScreen';
import ProfileScreen from './tabs/ProfileScreen';

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  const [userType, setUserType] = useState('neighbor'); // Default as neighbor
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // If user is set up as a helper, set userType accordingly
            if (userData.isHelper) {
              setUserType('helper');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Jobs') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        initialParams={{ userType }} 
      />
      <Tab.Screen 
        name="Jobs" 
        component={JobsScreen}
        initialParams={{ userType }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesScreen} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        initialParams={{ userType }}
      />
    </Tab.Navigator>
  );
};

export default HomeScreen;