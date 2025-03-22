// screens/jobs/PostJobScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';


// Default job types
const DEFAULT_JOB_TYPES = [
  'Package Delivery', 
  'Car Buying Assistance', 
  'Running Errands',
  // Add more job types as needed
];

const PostJobScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [customJobType, setCustomJobType] = useState('');
  const [paymentType, setPaymentType] = useState('fixed'); // 'fixed', 'tip', 'free'
  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false);

  const handlePostJob = async () => {
    if (!title || !description) {
      Alert.alert('Error', 'Please fill in the job title and description');
      return;
    }

    if (!selectedJobType && !customJobType) {
      Alert.alert('Error', 'Please select or enter a job type');
      return;
    }

    if (paymentType === 'fixed' && !paymentAmount) {
      Alert.alert('Error', 'Please enter a payment amount');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to post a job');
      }

      const finalJobType = customJobType || selectedJobType;

      const jobData = {
        title,
        description,
        jobType: finalJobType,
        paymentType,
        paymentAmount: paymentType === 'fixed' ? parseFloat(paymentAmount) : 0,
        createdBy: user.uid,
        status: 'open', // Initial status
        createdAt: new Date(),
        helperAssigned: null,
        offers: [],
      };

      await addDoc(collection(db, 'jobs'), jobData);
      
      Alert.alert(
        'Success',
        'Your job has been posted successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('MyJobs')
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectJobType = (jobType) => {
    setSelectedJobType(jobType);
    setCustomJobType('');
    setJobTypeModalVisible(false);
  };

  const handleCustomJobType = () => {
    if (customJobType.trim()) {
      setSelectedJobType('');
      setJobTypeModalVisible(false);
    } else {
      Alert.alert('Error', 'Please enter a job type');
    }
  };

  const renderJobTypeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.jobTypeItem}
      onPress={() => selectJobType(item)}
    >
      <Text style={styles.jobTypeItemText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingWrapper>
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Job Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a title for your job"
        />
        
        <Text style={styles.label}>Job Type</Text>
        <TouchableOpacity
          style={styles.jobTypeButton}
          onPress={() => setJobTypeModalVisible(true)}
        >
          <Text style={[styles.jobTypeButtonText, (!selectedJobType && !customJobType) && styles.placeholderText]}>
            {customJobType || selectedJobType || 'Select or enter a job type'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
        
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you need help with..."
          multiline
          numberOfLines={5}
        />
        
        <Text style={styles.label}>Payment Type</Text>
        <View style={styles.paymentTypeContainer}>
          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === 'fixed' && styles.selectedPaymentType
            ]}
            onPress={() => setPaymentType('fixed')}
          >
            <Text 
              style={[
                styles.paymentTypeText,
                paymentType === 'fixed' && styles.selectedPaymentTypeText
              ]}
            >
              Fixed Amount
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === 'tip' && styles.selectedPaymentType
            ]}
            onPress={() => setPaymentType('tip')}
          >
            <Text 
              style={[
                styles.paymentTypeText,
                paymentType === 'tip' && styles.selectedPaymentTypeText
              ]}
            >
              Tip Only
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentTypeButton,
              paymentType === 'free' && styles.selectedPaymentType
            ]}
            onPress={() => setPaymentType('free')}
          >
            <Text 
              style={[
                styles.paymentTypeText,
                paymentType === 'free' && styles.selectedPaymentTypeText
              ]}
            >
              No Payment
            </Text>
          </TouchableOpacity>
        </View>
        
        {paymentType === 'fixed' && (
          <>
            <Text style={styles.label}>Payment Amount ($)</Text>
            <TextInput
              style={styles.input}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
            />
          </>
        )}
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handlePostJob}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Posting...' : 'Post Job'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Job Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={jobTypeModalVisible}
        onRequestClose={() => setJobTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Job Type</Text>
              <TouchableOpacity onPress={() => setJobTypeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={DEFAULT_JOB_TYPES}
              renderItem={renderJobTypeItem}
              keyExtractor={(item) => item}
              style={styles.jobTypeList}
            />

            <View style={styles.customJobTypeContainer}>
              <Text style={styles.customJobTypeLabel}>Or enter custom job type:</Text>
              <TextInput
                style={styles.customJobTypeInput}
                value={customJobType}
                onChangeText={setCustomJobType}
                placeholder="Enter custom job type"
              />
              <TouchableOpacity
                style={styles.customJobTypeButton}
                onPress={handleCustomJobType}
              >
                <Text style={styles.customJobTypeButtonText}>Use Custom Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  formContainer: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  jobTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  jobTypeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
  },
  paymentTypeText: {
    fontSize: 14,
  },
  selectedPaymentType: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  selectedPaymentTypeText: {
    color: 'white',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  jobTypeList: {
    marginBottom: 20,
  },
  jobTypeItem: {
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jobTypeItemText: {
    fontSize: 16,
  },
  customJobTypeContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  customJobTypeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  customJobTypeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  customJobTypeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  customJobTypeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default PostJobScreen;