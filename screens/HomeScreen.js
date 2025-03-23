// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { View, Text, StyleSheet } from 'react-native';
import { auth, db } from '../firebase';

// Import tab screens
import DashboardScreen from './tabs/DashboardScreen';
import JobsScreen from './tabs/JobsScreen';
import MessagesScreen from './tabs/MessagesScreen';
import ProfileScreen from './tabs/ProfileScreen';

const Tab = createBottomTabNavigator();

const HomeScreen = () => {
  const [userType, setUserType] = useState('neighbor'); // Default as neighbor
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

  useEffect(() => {
    const checkUnreadMessages = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) return;
        
        console.log('Checking unread messages for user:', user.uid);
        
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid)
        );
        
        const unsubscribe = onSnapshot(chatsQuery, (querySnapshot) => {
          console.log(`Found ${querySnapshot.docs.length} chats`);
          let unreadCount = 0;
          
          querySnapshot.forEach((chatDoc) => {
            const chatData = chatDoc.data();
            console.log(`Chat ${chatDoc.id} unreadBy:`, chatData.unreadBy);
            
            // Check if this chat has unread messages for the current user
            if (chatData.unreadBy && chatData.unreadBy.includes(user.uid)) {
              unreadCount++;
              console.log(`Chat ${chatDoc.id} is unread`);
            }
          });
          
          console.log('Total unread count:', unreadCount);
          setUnreadMessages(unreadCount);
        });
        
        return () => {
          console.log('Cleaning up unread message listener');
          unsubscribe();
        };
      } catch (error) {
        console.error('Error checking unread messages:', error);
      }
    };
    
    console.log('Setting up unread message listener');
    const unsubscribeFromMessages = checkUnreadMessages();
    
    return () => {
      if (unsubscribeFromMessages) {
        unsubscribeFromMessages();
      }
    };
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
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused ? 'chatbubble' : 'chatbubble-outline';
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                {unreadMessages > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{unreadMessages}</Text>
                  </View>
                )}
              </View>
            );
          }
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        initialParams={{ userType }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;