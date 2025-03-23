// screens/jobs/JobDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

const JobDetailsScreen = ({ route, navigation }) => {
  const { jobId, userType } = route.params;
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [hasOffered, setHasOffered] = useState(false);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [helperProfile, setHelperProfile] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get the job details
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (!jobDoc.exists()) {
        Alert.alert('Error', 'Job not found');
        navigation.goBack();
        return;
      }
      
      const jobData = {
        id: jobDoc.id,
        ...jobDoc.data(),
        createdAt: jobDoc.data().createdAt.toDate(),
      };

      setJob(jobData);

      // Get current user profile
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      // Get job creator profile
      const creatorDoc = await getDoc(doc(db, 'users', jobData.createdBy));
      if (creatorDoc.exists()) {
        setCreatorProfile(creatorDoc.data());
      }

      // Get helper profile if assigned
      if (jobData.helperAssigned) {
        const helperDoc = await getDoc(doc(db, 'users', jobData.helperAssigned));
        if (helperDoc.exists()) {
          setHelperProfile(helperDoc.data());
        }
      }

      // Check if current user has already made an offer
      if (jobData.offers) {
        const userOffer = jobData.offers.find(offer => offer.userId === user.uid);
        if (userOffer) {
          setHasOffered(true);
          setOfferAmount(userOffer.amount.toString());
          setOfferNote(userOffer.note);
        }
      }

    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // iOS doesn't have ToastAndroid, so we'll make our own
      setToastVisible(true);
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastVisible(false);
      });
    }
  };

  const handleMakeOffer = async () => {
    if (job.paymentType === 'fixed' && !offerAmount) {
      Alert.alert('Error', 'Please enter an offer amount');
      return;
    }

    try {
      const user = auth.currentUser;
      
      const offerData = {
        userId: user.uid,
        amount: offerAmount ? parseFloat(offerAmount) : 0,
        note: offerNote,
        createdAt: new Date(),
      };

      // Update the job with the new offer
      await updateDoc(doc(db, 'jobs', jobId), {
        offers: arrayUnion(offerData)
      });

      // Show toast instead of Alert
      showToast('Offer sent successfully!');
      loadJobDetails();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAcceptOffer = async (offer) => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'accepted',
        helperAssigned: offer.userId,
        acceptedAt: new Date(),
      });

      Alert.alert(
        'Success',
        'Offer accepted! The helper has been assigned to your job.',
        [
          {
            text: 'OK',
            onPress: () => loadJobDetails()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleStartJob = async () => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'in-progress',
        startedAt: new Date(),
      });

      Alert.alert(
        'Success',
        'Job marked as in progress!',
        [
          {
            text: 'OK',
            onPress: () => loadJobDetails()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCompleteJob = async () => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'completed',
        completedAt: new Date(),
      });

      Alert.alert(
        'Success',
        'Job marked as completed!',
        [
          {
            text: 'OK',
            onPress: () => loadJobDetails()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleCancelJob = async () => {
    Alert.alert(
      'Cancel Job',
      'Are you sure you want to cancel this job?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'jobs', jobId), {
                status: 'cancelled',
                cancelledAt: new Date(),
              });

              Alert.alert(
                'Success',
                'Job has been cancelled',
                [
                  {
                    text: 'OK',
                    onPress: () => loadJobDetails()
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const handleOpenChat = async (otherUserId) => {
    try {
      // First check if a chat exists for this job
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(chatsQuery);
      let existingChatId = null;
      
      // Look for a chat with this job ID and the other user
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        if (chatData.jobId === jobId && chatData.participants.includes(otherUserId)) {
          existingChatId = doc.id;
        }
      });
      
      // Navigate to the chat
      navigation.navigate('Messages', { 
        screen: 'ChatDetails',
        params: { 
          chatId: existingChatId, // Will be null if no chat exists yet
          otherUserId: otherUserId,
          jobId: jobId
        } 
      });
    } catch (error) {
      console.error("Error finding chat:", error);
      // Fallback to just passing the other user ID
      navigation.navigate('Messages', { 
        screen: 'ChatDetails',
        params: { 
          otherUserId: otherUserId,
          jobId: jobId
        } 
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error loading job details</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCreator = auth.currentUser.uid === job.createdBy;
  const isHelper = job.helperAssigned === auth.currentUser.uid;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{job.title}</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusBadge, styles[`status${job.status}`]]}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Job Type:</Text>
        <Text style={styles.infoValue}>{job.jobType}</Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Payment:</Text>
        <Text style={styles.infoValue}>
          {job.paymentType === 'fixed' ? 
            `$${job.paymentAmount.toFixed(2)}` : 
            job.paymentType === 'tip' ? 
              'Tip Only' : 'No Payment'}
        </Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Posted By:</Text>
        <Text style={styles.infoValue}>
          {creatorProfile ? creatorProfile.fullName : 'Unknown User'}
        </Text>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoLabel}>Date Posted:</Text>
        <Text style={styles.infoValue}>
          {job.createdAt.toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionLabel}>Description</Text>
        <Text style={styles.descriptionText}>{job.description}</Text>
      </View>
      
      {/* Helper assigned section */}
      {job.helperAssigned && (
        <View style={styles.helperAssignedContainer}>
          <Text style={styles.sectionTitle}>
            {isCreator ? 'Helper Assigned:' : 'You are assigned to this job'}
          </Text>
          <Text style={styles.helperName}>
            {helperProfile ? helperProfile.fullName : 'Unknown Helper'}
          </Text>
        </View>
      )}
      
      {/* Offers section - only visible to job creator */}
      {isCreator && job.status === 'open' && job.offers && job.offers.length > 0 && (
        <View style={styles.offersContainer}>
          <Text style={styles.sectionTitle}>Offers ({job.offers.length})</Text>
          
          {job.offers.map((offer, index) => (
            <View key={index} style={styles.offerItem}>
              <View style={styles.offerHeader}>
                <Text style={styles.offerAmount}>
                  ${offer.amount.toFixed(2)}
                </Text>
                <View style={styles.offerActionButtons}>
                  {/* Add a chat button */}
                  <TouchableOpacity 
                    style={styles.chatOfferButton}
                    onPress={() => handleOpenChat(offer.userId)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="white" />
                    <Text style={styles.chatOfferButtonText}>Chat</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.acceptButton}
                    onPress={() => handleAcceptOffer(offer)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {offer.note && (
                <Text style={styles.offerNote}>{offer.note}</Text>
              )}
              
              <Text style={styles.offerDate}>
                {new Date(offer.createdAt.seconds * 1000).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Make offer section - only visible to helpers for open jobs */}
      {!isCreator && job.status === 'open' && (
        <View style={styles.makeOfferContainer}>
          <Text style={styles.sectionTitle}>
            {hasOffered ? 'Update Your Offer' : 'Make an Offer'}
          </Text>
          
          {job.paymentType === 'fixed' && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Your Offer Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Enter your price"
                keyboardType="numeric"
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
              />
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={offerNote}
              onChangeText={setOfferNote}
              placeholder="Add a note about your offer..."
              multiline
              numberOfLines={3}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleMakeOffer}
          >
            <Text style={styles.submitButtonText}>
              {hasOffered ? 'Update Offer' : 'Submit Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Action buttons based on job status and user role */}
      <View style={styles.actionButtonsContainer}>
        {job.status === 'accepted' && (isCreator || isHelper) && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleStartJob}
          >
            <Text style={styles.actionButtonText}>Start Job</Text>
          </TouchableOpacity>
        )}
        
        {job.status === 'in-progress' && (isCreator || isHelper) && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCompleteJob}
          >
            <Text style={styles.actionButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}
        
        {(job.status === 'open' || job.status === 'accepted' || job.status === 'in-progress') && isCreator && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelJob}
          >
            <Text style={styles.cancelButtonText}>Cancel Job</Text>
          </TouchableOpacity>
        )}
        
        {/* Chat button for accepted/in-progress jobs */}
        {(job.status === 'accepted' || job.status === 'in-progress') && (isCreator || isHelper) && (
          <TouchableOpacity 
            style={styles.chatActionButton}
            onPress={() => handleOpenChat(isCreator ? job.helperAssigned : job.createdBy)}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="white" style={styles.chatButtonIcon} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>
        )}
        
        {/* Chat button for helpers who made an offer */}
        {!isCreator && job.status === 'open' && hasOffered && (
          <TouchableOpacity 
            style={styles.chatActionButton}
            onPress={() => handleOpenChat(job.createdBy)}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="white" style={styles.chatButtonIcon} />
            <Text style={styles.chatButtonText}>Chat with Job Poster</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {Platform.OS === 'ios' && toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            { opacity: toastOpacity }
          ]}
        >
          <Text style={styles.toastText}>Offer sent successfully!</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginBottom: 20,
  },
  backLink: {
    color: '#4A90E2',
    fontSize: 16,
  },
  jobHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusopen: {
    backgroundColor: '#e3f2fd',
    color: '#2196f3',
  },
  statusaccepted: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  'statusin-progress': {
    backgroundColor: '#fff8e1',
    color: '#ffc107',
  },
  statuscompleted: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  statuscancelled: {
    backgroundColor: '#ffebee',
    color: '#f44336',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    width: 110,
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginTop: 15,
    marginBottom: 15,
  },
  descriptionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  helperAssignedContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  helperName: {
    fontSize: 16,
    color: '#333',
  },
  offersContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
  },
  offerItem: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  offerActionButtons: {
    flexDirection: 'row',
  },
  chatOfferButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  chatOfferButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  offerNote: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  offerDate: {
    fontSize: 12,
    color: '#999',
  },
  makeOfferContainer: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatActionButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  chatButtonIcon: {
    marginRight: 10,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  toastText: {
    color: 'white',
    fontSize: 16,
  },
});

export default JobDetailsScreen;