// screens/jobs/PostJobScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import KeyboardAvoidingWrapper from '../../components/KeyboardAvoidingWrapper';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';

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
  const [locationData, setLocationData] = useState({
    address: '',
    coordinates: null
  });
  const [loading, setLoading] = useState(false);
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false);
  const [addressError, setAddressError] = useState(null);

  // Load user's location from profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Set the user's location data
          if (userData.location) {
            setLocationData({
              address: userData.location.address || userData.address || '',
              coordinates: userData.location.coordinates || null
            });
          } else if (userData.address) {
            setLocationData({
              address: userData.address,
              coordinates: null
            });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, []);

  const handleAddressSelect = (place) => {
    setLocationData({
      address: place.address,
      coordinates: place.coordinates
    });
    setAddressError(null);
  };

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

    if (!locationData.address) {
      setAddressError('Please select a valid location');
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
        location: locationData.address,
        locationCoordinates: locationData.coordinates,
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
      <Ionicons name="checkmark-circle" size={22} color={selectedJobType === item ? COLORS.primary : 'transparent'} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingWrapper>
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Post a New Job</Text>
            
            <Input
              label="Job Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Enter a title for your job"
              required
            />
            
            <View style={styles.inputContainer}>
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
            </View>
            
            <AddressAutocomplete
              label="Job Location"
              value={locationData.address}
              onSelect={handleAddressSelect}
              placeholder="Enter job location"
              required
              error={addressError}
            />
            
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you need help with..."
              multiline
              numberOfLines={5}
              required
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
              <Input
                label="Payment Amount ($)"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                required
              />
            )}
            
            <Button 
              title="Post Job"
              onPress={handlePostJob}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              size="large"
            />
          </View>
        </ScrollView>

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
                <Input
                  value={customJobType}
                  onChangeText={setCustomJobType}
                  placeholder="Enter custom job type"
                  style={styles.customJobTypeInput}
                />
                <Button
                  title="Use Custom Type"
                  onPress={handleCustomJobType}
                  style={styles.customJobTypeButton}
                  size="medium"
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    ...FONTS.heading,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    ...FONTS.subheading,
    fontSize: 16,
    marginBottom: 6,
    color: COLORS.textDark,
  },
  jobTypeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 30,
    padding: 15,
  },
  jobTypeButtonText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  placeholderText: {
    color: '#999',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    marginHorizontal: 4,
    borderRadius: 20,
  },
  paymentTypeText: {
    ...FONTS.body,
    fontSize: 14,
  },
  selectedPaymentType: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectedPaymentTypeText: {
    color: 'white',
    ...FONTS.bodyBold,
  },
  submitButton: {
    marginTop: 20,
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
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  jobTypeList: {
    marginBottom: 20,
  },
  jobTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  jobTypeItemText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  customJobTypeContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  customJobTypeLabel: {
    ...FONTS.subheading,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textDark,
  },
  customJobTypeInput: {
    marginBottom: 15,
  },
  customJobTypeButton: {
    width: '100%',
  },
});

export default PostJobScreen;