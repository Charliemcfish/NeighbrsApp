// screens/tabs/MessagesScreen.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import message-related screens
import ChatsListScreen from '../messages/ChatsListScreen';
import ChatDetailsScreen from '../messages/ChatDetailsScreen';

const Stack = createStackNavigator();

const MessagesScreen = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ChatsList" 
        component={ChatsListScreen} 
        options={{ title: 'Messages' }}
      />
      <Stack.Screen 
        name="ChatDetails" 
        component={ChatDetailsScreen} 
        options={({ route }) => ({ title: route.params.chatName || 'Chat' })}
      />

      
    </Stack.Navigator>
  );
};

export default MessagesScreen;