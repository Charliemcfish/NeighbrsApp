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
    <Stack.Navigator>
      {userType === 'neighbor' ? (
        <>
          <Stack.Screen 
            name="MyJobs" 
            component={MyJobsScreen} 
            options={{ title: 'My Jobs' }}
            initialParams={{ userType }}
          />
          <Stack.Screen 
            name="PostJob" 
            component={PostJobScreen} 
            options={{ title: 'Post a New Job' }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="FindJobs" 
          component={FindJobsScreen} 
          options={{ title: 'Find Jobs' }}
          initialParams={{ userType }}
        />
      )}
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen} 
        options={{ title: 'Job Details' }}
        initialParams={{ userType }}
      />
    </Stack.Navigator>
  );
};

export default JobsScreen;