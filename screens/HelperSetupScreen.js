// screens/HelperSetupScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';


// Update your navigation.js to include this screen

const jobTypes = [
  'Package Delivery', 
  'Car Buying Assistance', 
  'Running Errands',
  // Add more job types as needed
];

const HelperSetupScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [helpDescription, setHelpDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Bank info for payment (in real app, use a secure service for this)
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');

  const toggleJobType = (jobType) => {
    if (selectedJobTypes.includes(jobType)) {
      setSelectedJobTypes(selectedJobTypes.filter(type => type !== jobType));
    } else {
      setSelectedJobTypes([...selectedJobTypes, jobType]);
    }
  };

  const handleSubmit = async () => {
    if (selectedJobTypes.length === 0) {
      Alert.alert('Error', 'Please select at least one job type');
      return;
    }
  
    if (!helpDescription) {
      Alert.alert('Error', 'Please describe how you can help');
      return;
    }
  
    if (!accountName || !accountNumber || !routingNumber) {
      Alert.alert('Error', 'Please fill in all bank account details');
      return;
    }
  
    setLoading(true);
  
    try {
      await updateDoc(doc(db, 'users', userId), {
        jobTypes: selectedJobTypes,
        helpDescription,
        bankInfo: {
          accountName,
          accountNumber,
          routingNumber,
        },
        isHelper: true, // Make sure this is set to true
        helperSetupComplete: true,
      });
  
      Alert.alert(
        'Success',
        'Your helper profile is set up!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Refresh the main app state to reflect the change
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }]
              });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper>

    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Set Up Your Helper Profile</Text>
        
        <Text style={styles.sectionTitle}>What can you help with?</Text>
        <Text style={styles.description}>
          Select the types of jobs you're willing to help neighbors with:
        </Text>
        
        <View style={styles.jobTypesContainer}>
          {jobTypes.map((jobType) => (
            <TouchableOpacity
              key={jobType}
              style={[
                styles.jobTypeButton,
                selectedJobTypes.includes(jobType) && styles.selectedJobType
              ]}
              onPress={() => toggleJobType(jobType)}
            >
              <Text 
                style={[
                  styles.jobTypeText,
                  selectedJobTypes.includes(jobType) && styles.selectedJobTypeText
                ]}
              >
                {jobType}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.label}>How can you help?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={helpDescription}
          onChangeText={setHelpDescription}
          placeholder="Describe how you can help neighbors with these types of jobs..."
          multiline
          numberOfLines={4}
        />
        
        <Text style={styles.sectionTitle}>Payment Information</Text>
        <Text style={styles.description}>
          Enter your bank account details to receive payments:
        </Text>
        
        <Text style={styles.label}>Account Holder Name</Text>
        <TextInput 
          style={styles.input}
          value={accountName}
          onChangeText={setAccountName}
          placeholder="Enter full name on account"
        />
        
        <Text style={styles.label}>Account Number</Text>
        <TextInput 
        
          style={styles.input}
          value={accountNumber}
          onChangeText={setAccountNumber}
          placeholder="Enter account number"
          keyboardType="number-pad"
        />
        
        <Text style={styles.label}>Routing Number</Text>
        <TextInput
          style={styles.input}
          value={routingNumber}
          onChangeText={setRoutingNumber}
          placeholder="Enter routing number"
          keyboardType="number-pad"
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Saving...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingWrapper>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  jobTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 30,
  },
  jobTypeButton: {
    borderWidth: 1,
    borderColor: '#4A90E2',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 5,
  },
  selectedJobType: {
    backgroundColor: '#4A90E2',
  },
  jobTypeText: {
    color: '#4A90E2',
  },
  selectedJobTypeText: {
    color: 'white',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
  },
});

export default HelperSetupScreen;