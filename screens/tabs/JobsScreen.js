// screens/tabs/JobsScreen.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import job-related screens
import PostJobScreen from '../jobs/PostJobScreen';
import FindJobsScreen from '../jobs/FindJobsScreen';
import JobDetailsScreen from '../jobs/JobDetailsScreen';
import MyJobsScreen from '../jobs/MyJobsScreen';

const Stack = createStackNavigator();

const JobsScreen = ({ route }) => {
  const { userType } = route.params || {};
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userType === 'neighbor' ? (
        <>
          <Stack.Screen 
            name="MyJobs" 
            component={MyJobsScreen} 
            initialParams={{ userType }}
          />
          <Stack.Screen 
            name="PostJob" 
            component={PostJobScreen} 
          />
        </>
      ) : (
        <Stack.Screen 
          name="FindJobs" 
          component={FindJobsScreen} 
          initialParams={{ userType, ...route.params?.params }}
        />
      )}
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen} 
        initialParams={{ userType }}
      />
    </Stack.Navigator>
  );
};

export default JobsScreen;