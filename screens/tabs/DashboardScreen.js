// screens/tabs/DashboardScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen = ({ route, navigation }) => {
  const { userType } = route.params || {};
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome to Neighbrs
        </Text>
        <Text style={styles.subtitle}>
          You're logged in as a {userType}
        </Text>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Jobs', { screen: userType === 'neighbor' ? 'PostJob' : 'FindJobs' })}
        >
          <Ionicons 
            name={userType === 'neighbor' ? 'add-circle' : 'search'} 
            size={24} 
            color="#4A90E2" 
          />
          <Text style={styles.actionText}>
            {userType === 'neighbor' ? 'Post a New Job' : 'Find Available Jobs'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <Ionicons name="chatbubbles" size={24} color="#4A90E2" />
          <Text style={styles.actionText}>View Messages</Text>
        </TouchableOpacity>
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
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 20,
    backgroundColor: '#4A90E2',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  actionsContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    marginTop: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  steps: {
    marginTop: 10,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stepDesc: {
    fontSize: 14,
    color: '#666',
  },
});

export default DashboardScreen;