// screens/helpers/HelperProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';

const HelperProfileScreen = ({ route, navigation }) => {
  const { helperId } = route.params;
  const [helperProfile, setHelperProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [rating, setRating] = useState(0);
  
  // Direct request form fields
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobType, setJobType] = useState('');
  const [paymentType, setPaymentType] = useState('fixed');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadHelperProfile();
    loadCompletedJobs();
  }, [helperId]);

  const loadHelperProfile = async () => {
    try {
      const helperDoc = await getDoc(doc(db, 'users', helperId));
      
      if (helperDoc.exists()) {
        setHelperProfile(helperDoc.data());
      } else {
        Alert.alert('Error', 'Helper profile not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading helper profile:', error);
      Alert.alert('Error', 'Could not load helper profile');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedJobs = async () => {
    try {
      // Query for completed jobs where this helper was assigned
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('helperAssigned', '==', helperId),
        where('status', '==', 'completed')
      );

      const querySnapshot = await getDocs(jobsQuery);
      const jobsData = [];
      let totalRating = 0;
      let ratingCount = 0;

      querySnapshot.forEach((doc) => {
        const job = doc.data();
        jobsData.push({
          id: doc.id,
          ...job
        });

        // Calculate average rating if available
        if (job.helperRating) {
          totalRating += job.helperRating;
          ratingCount++;
        }
      });

      setCompletedJobs(jobsData);
      
      // Set average rating
      if (ratingCount > 0) {
        setRating(totalRating / ratingCount);
      }
    } catch (error) {
      console.error('Error loading completed jobs:', error);
    }
  };

  const handleSendMessage = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to send messages');
      }
  
      // Instead of navigating to an existing chat, let's create a new one if needed
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      let existingChatId = null;
      
      // Find if a chat already exists between these users
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.participants.includes(helperId)) {
          existingChatId = doc.id;
        }
      });
  
      // If no chat exists, create one
      if (!existingChatId) {
        const newChatData = {
          participants: [user.uid, helperId],
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: `Chat started with ${helperProfile.fullName}`,
          unreadBy: [helperId] // Mark as unread for the helper
        };
        
        const newChatRef = await addDoc(collection(db, 'chats'), newChatData);
        existingChatId = newChatRef.id;
        
        // Add an initial message to the chat
        await addDoc(collection(db, 'chats', existingChatId, 'messages'), {
          text: `Hi ${helperProfile.fullName}, I'd like to discuss getting your help.`,
          senderId: user.uid,
          createdAt: new Date(),
        });
      }
  
      // Let the user know the chat has been created and we're working on the navigation
      Alert.alert(
        'Chat Started',
        `You can now chat with ${helperProfile.fullName}. Please go to the Messages tab to continue your conversation.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to the home screen and then tell them to go to messages tab
              navigation.navigate('HomeScreen');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSendDirectRequest = async () => {
    if (!jobTitle || !jobDescription || !jobType) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (paymentType === 'fixed' && !paymentAmount) {
      Alert.alert('Error', 'Please enter a payment amount');
      return;
    }

    setSubmitting(true);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to create job requests');
      }

      // Create the job
      const jobData = {
        title: jobTitle,
        description: jobDescription,
        jobType: jobType,
        paymentType: paymentType,
        paymentAmount: paymentType === 'fixed' ? parseFloat(paymentAmount) : 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: 'open',
        location: '', // Optional field
        helperAssigned: null,
        offers: [],
        // Add a flag that this is a direct request to this helper
        isDirectRequest: true,
        directRequestedHelper: helperId
      };

      const jobRef = await addDoc(collection(db, 'jobs'), jobData);
      
      // Reset form and close modal
      setJobTitle('');
      setJobDescription('');
      setJobType('');
      setPaymentAmount('');
      setPaymentType('fixed');
      setRequestModalVisible(false);

      // Ask if user wants to go to the job details
      Alert.alert(
        'Success',
        'Direct job request created successfully!',
        [
          {
            text: 'View Job',
            onPress: () => {
              // Navigate to Jobs tab first
              navigation.navigate('HomeScreen', { screen: 'Jobs' });
              
              // Then navigate to the job details
              setTimeout(() => {
                navigation.navigate('HomeScreen', {
                  screen: 'Jobs',
                  params: {
                    screen: 'JobDetails',
                    params: { jobId: jobRef.id }
                  }
                });
              }, 100);
            }
          },
          {
            text: 'Stay Here',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!helperProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Helper profile could not be loaded</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.goBackButton}
        />
      </View>
    );
  }

  // Render star rating
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={18} color="#FFD700" />
        );
      } else if (i === fullStars + 1 && halfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={18} color="#FFD700" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={18} color="#FFD700" />
        );
      }
    }
    
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Helper Profile</Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.profileHeader}>
          {helperProfile.profileImage ? (
            <Image
              source={{ uri: helperProfile.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {helperProfile.fullName ? helperProfile.fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          
          <Text style={styles.helperName}>{helperProfile.fullName}</Text>
          <Text style={styles.helperLocation}>{helperProfile.address}</Text>
          
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {renderStars(rating)}
            </View>
            <Text style={styles.ratingText}>
              {rating > 0 
                ? `${rating.toFixed(1)} (${completedJobs.length} jobs)` 
                : 'No ratings yet'}
            </Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.aboutText}>
            {helperProfile.aboutMe || 'No information provided.'}
          </Text>
        </View>
        
        {helperProfile.jobTypes && helperProfile.jobTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services Offered</Text>
            <View style={styles.jobTypesList}>
              {helperProfile.jobTypes.map((jobType, index) => (
                <View key={index} style={styles.jobTypeTag}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.jobTypeText}>{jobType}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {helperProfile.helpDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How I Can Help</Text>
            <Text style={styles.aboutText}>
              {helperProfile.helpDescription}
            </Text>
          </View>
        )}
        
        {completedJobs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Jobs</Text>
            <Text style={styles.completedJobsText}>
              Has completed {completedJobs.length} jobs on Neighbrs
            </Text>
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <Button
            title="Send Message"
            icon="chatbubble-outline"
            onPress={handleSendMessage}
            style={styles.actionButton}
          />
          
          <Button
            title="Direct Job Request"
            icon="briefcase-outline"
            onPress={() => setRequestModalVisible(true)}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
      
      {/* Direct Job Request Modal */}
      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Direct Job Request</Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Input
                label="Job Title"
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="Enter a title for your job"
                required
              />
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Job Type</Text>
                <View style={styles.jobTypePickerContainer}>
                  {helperProfile.jobTypes && helperProfile.jobTypes.map((type, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.jobTypePickerOption,
                        jobType === type && styles.selectedJobTypeOption
                      ]}
                      onPress={() => setJobType(type)}
                    >
                      <Text 
                        style={[
                          styles.jobTypePickerText,
                          jobType === type && styles.selectedJobTypeText
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {helperProfile.jobTypes && helperProfile.jobTypes.length === 0 && (
                  <Text style={styles.noJobTypesText}>
                    This helper hasn't specified any job types.
                  </Text>
                )}
              </View>
              
              <Input
                label="Job Description"
                value={jobDescription}
                onChangeText={setJobDescription}
                placeholder="Describe what you need help with..."
                multiline
                numberOfLines={5}
                required
              />
              
              <Text style={styles.inputLabel}>Payment Type</Text>
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
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                type="secondary"
                onPress={() => setRequestModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title={submitting ? 'Sending...' : 'Send Request'}
                onPress={handleSendDirectRequest}
                loading={submitting}
                disabled={submitting}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...FONTS.bodyBold,
    fontSize: 18,
    color: COLORS.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  goBackButton: {
    width: 150,
  },
  scrollContent: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: COLORS.white,
    marginBottom: 15,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.small,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImagePlaceholderText: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.white,
  },
  helperName: {
    ...FONTS.heading,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 5,
  },
  helperLocation: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 15,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  ratingText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  sectionTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  aboutText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 24,
  },
  jobTypesList: {
    marginTop: 10,
  },
  jobTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  jobTypeText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginLeft: 10,
  },
  completedJobsText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  modalScroll: {
    marginBottom: 20,
    maxHeight: '70%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    ...FONTS.subheading,
    fontSize: 16,
    marginBottom: 6,
    color: COLORS.textDark,
  },
  jobTypePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  jobTypePickerOption: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 5,
  },
  selectedJobTypeOption: {
    backgroundColor: COLORS.primary,
  },
  jobTypePickerText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  selectedJobTypeText: {
    color: COLORS.white,
  },
  noJobTypesText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    fontStyle: 'italic',
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default HelperProfileScreen;