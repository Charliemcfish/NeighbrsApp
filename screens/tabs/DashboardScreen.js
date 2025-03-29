// screens/tabs/DashboardScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';

const DashboardScreen = ({ route, navigation }) => {
  const { userType } = route.params || {};
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData.fullName || '');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const handleNavigate = (screen, params = {}) => {
    if (screen === 'PostJob') {
      navigation.navigate('Jobs', { screen: 'PostJob' });
    } else if (screen === 'MyJobs') {
      navigation.navigate('Jobs', { screen: 'MyJobs' });
    } else if (screen === 'FindJobs') {
      // Make sure we're passing the initialTabName parameter correctly
      navigation.navigate('Jobs', { 
        screen: 'FindJobs',
        params: params 
      });
    } else if (screen === 'Messages') {
      navigation.navigate('Messages');
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome
        </Text>
        <Text style={styles.nameText}>
          {userName}
        </Text>
      </View>
      
      <View style={styles.actionsContainer}>
        {userType === 'neighbor' ? (
          // Actions for neighbors
          <>
            <Button 
              title="Post a New Job" 
              onPress={() => handleNavigate('PostJob')}
              style={styles.actionButton}
              size="large"
              icon="add-circle"
            />
            
            <Button 
              title="Browse Your Jobs" 
              onPress={() => handleNavigate('MyJobs')}
              style={styles.actionButton}
              size="large"
              icon="list"
            />
            
            <Button 
              title="View Closed Jobs" 
              onPress={() => handleNavigate('MyJobs')}
              style={styles.actionButton}
              size="large"
              icon="checkmark-circle"
            />
            
            <Button 
              title="Find A Helper" 
              onPress={() => handleNavigate('FindJobs')}
              style={styles.actionButton}
              size="large"
              icon="search"
            />
          </>
        ) : (
          // Actions for helpers
          <>
            <Button 
              title="Find Available Jobs" 
              onPress={() => handleNavigate('FindJobs')}
              style={styles.actionButton}
              size="large"
              icon="search"
            />
            
            <Button 
              title="Your Current Jobs" 
              onPress={() => handleNavigate('FindJobs', { initialTabName: 'current' })}
              style={styles.actionButton}
              size="large"
              icon="briefcase"
            />
            
            <Button 
              title="Your Completed Jobs" 
              onPress={() => handleNavigate('FindJobs', { initialTabName: 'completed' })}
              style={styles.actionButton}
              size="large"
              icon="checkmark-done-circle"
            />
            
            <Button 
              title="Messages" 
              onPress={() => handleNavigate('Messages')}
              style={styles.actionButton}
              size="large"
              icon="chatbubbles"
            />
          </>
        )}
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.sectionTitle}>How it works</Text>
        
        {userType === 'neighbor' ? (
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Post a Job</Text>
                <Text style={styles.stepDesc}>Describe what you need help with and how much you're willing to pay</Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Review Offers</Text>
                <Text style={styles.stepDesc}>Choose from helpers based on their offers and ratings</Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Complete & Pay</Text>
                <Text style={styles.stepDesc}>Once the job is done, rate your helper and process payment</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Find Jobs</Text>
                <Text style={styles.stepDesc}>Browse available jobs in your area that match your skills</Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Make Offers</Text>
                <Text style={styles.stepDesc}>Send offers to jobs you're interested in</Text>
              </View>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Get Paid</Text>
                <Text style={styles.stepDesc}>Complete the job, get rated, and receive payment</Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  welcomeText: {
    ...FONTS.subheading,
    fontSize: 24,
    color: COLORS.white,
  },
  nameText: {
    ...FONTS.heading,
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 5,
  },
  actionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    width: '90%',
    marginBottom: 15,
    ...SHADOWS.medium,
  },
  infoContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    margin: 15,
    padding: 20,
    ...SHADOWS.small,
  },
  sectionTitle: {
    ...FONTS.heading,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  steps: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    ...SHADOWS.small,
  },
  stepNumberText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.textDark,
  },
  stepDesc: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 20,
  },
});

export default DashboardScreen;