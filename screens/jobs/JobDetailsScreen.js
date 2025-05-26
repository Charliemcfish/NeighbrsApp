// screens/jobs/JobDetailsScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Image,
  Modal
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
  getDocs,
  addDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useStripe } from '@stripe/stripe-react-native';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { calculateDistance, getReadableDistance } from '../../utils/locationService';
import ReviewModal from '../../components/ReviewModal';
import StarRating from '../../components/StarRating';
import { callFirebaseFunction } from '../../utils/firebaseFunctions';


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
  const [offersWithHelpers, setOffersWithHelpers] = useState([]);
  const [distance, setDistance] = useState(null);
  
  // Review-related state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [isReviewingHelper, setIsReviewingHelper] = useState(false);
  const [showFeedbackButton, setShowFeedbackButton] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Payment-related state
  const [processingPayment, setProcessingPayment] = useState(false);
  const [tipAmount, setTipAmount] = useState('');
  const [showTipModal, setShowTipModal] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const flatListRef = useRef(null);
  const user = auth.currentUser;

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
        const userData = userDoc.data();
        setUserProfile(userData);
        setCurrentUser(userData);
        
        // Calculate distance if both user and job have location coordinates
        if (userData.location?.coordinates && jobData.locationCoordinates) {
          const distanceCalc = calculateDistance(
            userData.location.coordinates, 
            jobData.locationCoordinates
          );
          setDistance(distanceCalc);
        }
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

      // Get helper profiles for all offers
      if (jobData.offers && jobData.offers.length > 0) {
        const helpersInfo = await Promise.all(
          jobData.offers.map(async (offer) => {
            try {
              const helperDoc = await getDoc(doc(db, 'users', offer.userId));
              if (helperDoc.exists()) {
                const helperData = helperDoc.data();
                
                // Calculate distance between job creator and helper
                let helperDistance = null;
                if (helperData.location?.coordinates && jobData.locationCoordinates) {
                  helperDistance = calculateDistance(
                    helperData.location.coordinates, 
                    jobData.locationCoordinates
                  );
                }
                
                // Get helper's rating and completed jobs count
                let rating = 0;
                let completedJobs = 0;
                
                try {
                  const completedJobsQuery = query(
                    collection(db, 'jobs'),
                    where('helperAssigned', '==', offer.userId),
                    where('status', '==', 'completed')
                  );
                  
                  const jobsSnapshot = await getDocs(completedJobsQuery);
                  let totalRating = 0;
                  let ratingCount = 0;
                  
                  jobsSnapshot.forEach((doc) => {
                    completedJobs++;
                    const job = doc.data();
                    if (job.helperRating) {
                      totalRating += job.helperRating;
                      ratingCount++;
                    }
                  });
                  
                  if (ratingCount > 0) {
                    rating = totalRating / ratingCount;
                  }
                } catch (error) {
                  console.error('Error getting helper rating:', error);
                }
                
                return {
                  userId: offer.userId,
                  fullName: helperData.fullName,
                  profileImage: helperData.profileImage,
                  distance: helperDistance,
                  rating,
                  completedJobs
                };
              }
              return { userId: offer.userId };
            } catch (error) {
              console.error('Error getting helper info:', error);
              return { userId: offer.userId };
            }
          })
        );
        
        setOffersWithHelpers(helpersInfo);
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

      // Check if the current user can leave a review
      if (jobData.status === 'completed') {
        const isCreator = user.uid === jobData.createdBy;
        const isHelper = jobData.helperAssigned === user.uid;
        
        // If creator hasn't left a review for helper yet
        if (isCreator && !jobData.helperRating) {
          setIsReviewingHelper(true);
          setShowFeedbackButton(true);
        }
        
        // If helper hasn't left a review for creator yet
        if (isHelper && !jobData.creatorRating) {
          setIsReviewingHelper(false);
          setShowFeedbackButton(true);
        }
      }

    } catch (error) {
      console.error('Error loading job details:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentSetup = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      return !!userData.hasPaymentMethod;
    } catch (error) {
      console.error('Error verifying payment setup:', error);
      return false;
    }
  };

const verifyHelperPaymentSetup = async (helperId) => {
  try {
    console.log('Checking helper payment setup for:', helperId);
    
    // Call the Firebase function to check Connect account status
    const result = await callFirebaseFunction('checkConnectAccountStatus', { userId: helperId });
    
    console.log('Helper Connect account status:', result);
    
    // Updated logic - Check if the helper has a complete account setup
    // Based on your logs, the helper should pass this check
    const isComplete = result.hasAccount && 
                      result.accountStatus === 'complete' && 
                      result.chargesEnabled && 
                      result.payoutsEnabled && 
                      !result.needsOnboarding;
    
    console.log('Helper payment setup complete:', isComplete);
    console.log('Breakdown:');
    console.log('- hasAccount:', result.hasAccount);
    console.log('- accountStatus === "complete":', result.accountStatus === 'complete');
    console.log('- chargesEnabled:', result.chargesEnabled);
    console.log('- payoutsEnabled:', result.payoutsEnabled);
    console.log('- needsOnboarding:', result.needsOnboarding);
    console.log('- !needsOnboarding:', !result.needsOnboarding);
    
    return isComplete;
  } catch (error) {
    console.error('Error verifying helper payment setup:', error);
    
    // If there's an error calling the function, we should probably allow the job to proceed
    // but log the error for debugging
    console.log('Allowing job to proceed despite payment check error');
    return true; // Allow job to proceed if we can't verify
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

// In screens/jobs/JobDetailsScreen.js - Replace the handleStartJob function

const handleStartJob = async () => {
  try {
    // Only check payment setup for fixed payment jobs
    if (job.paymentType === 'fixed') {
      setProcessingPayment(true);
      
      // Check if user has payment method set up
      const hasPaymentSetup = await verifyPaymentSetup(job.createdBy);
      if (!hasPaymentSetup) {
        Alert.alert(
          'Payment Setup Required',
          'You need to set up a payment method before starting this job.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Set Up Payment', 
              onPress: () => navigation.navigate('PaymentMethod') 
            }
          ]
        );
        setProcessingPayment(false);
        return;
      }
      
      // Check if helper has Connect account set up
      try {
        console.log('About to check helper payment setup for helper ID:', job.helperAssigned);
        
        // Make sure we're calling with the correct helper ID
        const helperHasPaymentSetup = await verifyHelperPaymentSetup(job.helperAssigned);
        
        console.log('Helper payment setup result:', helperHasPaymentSetup);
        
        if (!helperHasPaymentSetup) {
          // Show warning but allow user to proceed
          Alert.alert(
            'Helper Payment Setup Warning',
            'The helper may not have completed their payment setup. You can still start the job, but payment processing might be delayed.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setProcessingPayment(false) },
              { 
                text: 'Continue Anyway', 
                onPress: () => createPaymentAndStartJob()
              }
            ]
          );
          return;
        } else {
          console.log('Helper payment setup is complete, proceeding with job start');
        }
      } catch (helperCheckError) {
        console.error('Helper payment check failed, continuing anyway:', helperCheckError);
        // Continue with job start even if helper check fails
      }
      
      // If all checks pass, create payment and start job
      await createPaymentAndStartJob();
    } else {
      // For non-fixed payment jobs, just update the status
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'in-progress',
        startedAt: new Date(),
      });
      
      Alert.alert(
        'Job Started!',
        'You have successfully started this job.',
        [
          {
            text: 'OK',
            onPress: () => {
              loadJobDetails();
            }
          }
        ]
      );
      setProcessingPayment(false);
    }
  } catch (error) {
    console.error('Error starting job:', error);
    Alert.alert('Error', error.message || 'Failed to start job. Please try again.');
    setProcessingPayment(false);
  }
};

// Separate function to handle payment creation and job start
const createPaymentAndStartJob = async () => {
  try {
    console.log('Creating payment intent for job start');
    
    // Create payment intent for the job amount
    const result = await callFirebaseFunction('createPaymentIntent', {
      amount: job.paymentAmount,
      jobId: job.id,
      capture_method: 'manual'
    });
    
    console.log('Payment intent created:', result);
    
    // Update the job status
    await updateDoc(doc(db, 'jobs', jobId), {
      status: 'in-progress',
      startedAt: new Date(),
      paymentIntentId: result.paymentIntentId,
      paymentStatus: result.status
    });
    
    Alert.alert(
      'Job Started!',
      'You have successfully started this job. The payment has been authorized and will be charged when the job is completed.',
      [
        {
          text: 'OK',
          onPress: () => {
            loadJobDetails();
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error creating payment and starting job:', error);
    throw error;
  } finally {
    setProcessingPayment(false);
  }
};

  const handleCompleteJob = async () => {
  try {
    const user = auth.currentUser;
    const isCreator = user.uid === job.createdBy;
    const isHelper = job.helperAssigned === user.uid;

    if (isHelper) {
      // Helper is requesting completion - send notification to job creator
      await handleHelperRequestCompletion();
    } else if (isCreator) {
      // Job creator is completing the job and releasing payment
      await handleJobCreatorComplete();
    }
  } catch (error) {
    console.error('Error in job completion flow:', error);
    Alert.alert('Error', error.message || 'Failed to process request. Please try again.');
  }
};

// New function for when helper requests completion
const handleHelperRequestCompletion = async () => {
  try {
    Alert.alert(
      'Request Job Completion',
      'This will notify the job creator that you have completed the work. They will then review and release payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Request Completion',
          onPress: async () => {
            setProcessingPayment(true);
            
            try {
              // Update job status to indicate helper has requested completion
              await updateDoc(doc(db, 'jobs', jobId), {
                status: 'completion-requested',
                helperCompletedAt: new Date(),
                helperRequestedCompletion: true
              });

              // Send a message to the job creator
              await sendCompletionRequestMessage();

              Alert.alert(
                'Completion Requested',
                'You have notified the job creator that the work is complete. They will review and release payment once confirmed.',
                [{ text: 'OK', onPress: () => loadJobDetails() }]
              );
            } catch (error) {
              console.error('Error requesting completion:', error);
              Alert.alert('Error', 'Failed to request completion. Please try again.');
            } finally {
              setProcessingPayment(false);
            }
          }
        }
      ]
    );
  } catch (error) {
    console.error('Error in helper request completion:', error);
    throw error;
  }
};

// New function for when job creator completes the job
const handleJobCreatorComplete = async () => {
  try {
    if (job.paymentType === 'fixed' && job.paymentIntentId) {
      // For fixed payment jobs with a payment intent, prompt confirmation
      Alert.alert(
        'Complete Job and Release Payment',
        `Are you sure you want to mark this job as complete and pay $${job.paymentAmount.toFixed(2)} to the helper?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Complete and Pay',
            onPress: async () => {
              setProcessingPayment(true);
              try {
                // Capture the payment
                const functions = getFunctions();
                const capturePayment = httpsCallable(functions, 'capturePayment');
                await capturePayment({
                  paymentIntentId: job.paymentIntentId,
                  jobId: job.id
                });
                
                // Update job status
                await updateDoc(doc(db, 'jobs', jobId), {
                  status: 'completed',
                  completedAt: new Date(),
                  paymentStatus: 'captured',
                  completedBy: 'creator'
                });
                
                // Send completion confirmation message
                await sendCompletionConfirmationMessage();
                
                // Determine who should be reviewed
                const shouldReviewHelper = auth.currentUser.uid === job.createdBy;
                setIsReviewingHelper(shouldReviewHelper);
                setReviewModalVisible(true);
                
                // Refresh job details
                loadJobDetails();
              } catch (error) {
                console.error('Error capturing payment:', error);
                Alert.alert('Payment Error', error.message || 'Failed to process payment. Please try again.');
              } finally {
                setProcessingPayment(false);
              }
            }
          }
        ]
      );
    } else if (job.paymentType === 'tip') {
      // For tip-only jobs, show tip modal first
      setShowTipModal(true);
    } else {
      // For free jobs, just mark as complete
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'completed',
        completedAt: new Date(),
        completedBy: 'creator'
      });

      // Send completion confirmation message
      await sendCompletionConfirmationMessage();

      // Determine who should be reviewed
      const shouldReviewHelper = auth.currentUser.uid === job.createdBy;
      setIsReviewingHelper(shouldReviewHelper);
      setReviewModalVisible(true);
      
      // Refresh job details
      loadJobDetails();
    }
  } catch (error) {
    console.error('Error in job creator complete:', error);
    throw error;
  }
};

// Helper function to send completion request message
const sendCompletionRequestMessage = async () => {
  try {
    // Find or create chat between helper and job creator
    const user = auth.currentUser;
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    
    const querySnapshot = await getDocs(chatsQuery);
    let existingChatId = null;
    
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      if (chatData.participants.includes(job.createdBy)) {
        existingChatId = doc.id;
      }
    });
    
    let chatId = existingChatId;
    
    if (!chatId) {
      // Create new chat if none exists
      const newChatData = {
        participants: [user.uid, job.createdBy],
        createdAt: new Date(),
        updatedAt: new Date(),
        jobId: job.id,
        lastMessage: `Job "${job.title}" has been completed and is ready for review.`,
        unreadBy: [job.createdBy]
      };
      
      const newChatRef = await addDoc(collection(db, 'chats'), newChatData);
      chatId = newChatRef.id;
    }
    
    // Send completion request message
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: `🎉 Job Complete! I have finished the work for "${job.title}". Please review and confirm completion to release payment.`,
      senderId: user.uid,
      createdAt: new Date(),
      isCompletionRequest: true,
      jobId: job.id
    });
    
    // Update chat with latest message
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: `Job "${job.title}" has been completed and is ready for review.`,
      updatedAt: new Date(),
      unreadBy: [job.createdBy]
    });
    
  } catch (error) {
    console.error('Error sending completion request message:', error);
    // Don't throw error - completion request should still work even if message fails
  }
};

// Helper function to send completion confirmation message
const sendCompletionConfirmationMessage = async () => {
  try {
    // Find existing chat
    const user = auth.currentUser;
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    
    const querySnapshot = await getDocs(chatsQuery);
    let existingChatId = null;
    
    querySnapshot.forEach((doc) => {
      const chatData = doc.data();
      if (chatData.participants.includes(job.helperAssigned)) {
        existingChatId = doc.id;
      }
    });
    
    if (existingChatId) {
      // Send completion confirmation message
      await addDoc(collection(db, 'chats', existingChatId, 'messages'), {
        text: `✅ Job Confirmed Complete! Thank you for your excellent work on "${job.title}". Payment has been released.`,
        senderId: user.uid,
        createdAt: new Date(),
        isCompletionConfirmation: true,
        jobId: job.id
      });
      
      // Update chat with latest message
      await updateDoc(doc(db, 'chats', existingChatId), {
        lastMessage: `Job "${job.title}" has been confirmed complete and payment released.`,
        updatedAt: new Date(),
        unreadBy: [job.helperAssigned]
      });
    }
    
  } catch (error) {
    console.error('Error sending completion confirmation message:', error);
    // Don't throw error - job completion should still work even if message fails
  }
};

  const handleSubmitTip = async () => {
    if (!tipAmount || isNaN(parseFloat(tipAmount)) || parseFloat(tipAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid tip amount.');
      return;
    }

    const tipAmountNum = parseFloat(tipAmount);

    setProcessingPayment(true);
    setShowTipModal(false);

    try {
      // Check if user has payment method set up
      const hasPaymentSetup = await verifyPaymentSetup(job.createdBy);
      if (!hasPaymentSetup) {
        Alert.alert(
          'Payment Setup Required',
          'You need to set up a payment method before sending a tip.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Set Up Payment', 
              onPress: () => navigation.navigate('PaymentMethod') 
            }
          ]
        );
        return;
      }
      
      // Create tip payment
      const functions = getFunctions();
      const createTipPayment = httpsCallable(functions, 'createTipPayment');
      await createTipPayment({
        amount: tipAmountNum,
        helperId: job.helperAssigned,
        jobId: job.id
      });
      
      // Update job status
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'completed',
        completedAt: new Date(),
        tipAmount: tipAmountNum,
        tipPaidAt: new Date()
      });
      
      Alert.alert(
        'Tip Sent',
        `You've successfully completed the job and sent a ${tipAmountNum.toFixed(2)} ${tipAmountNum === 1 ? 'pound' : 'pounds'} tip!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Show review modal after tip
              const shouldReviewHelper = auth.currentUser.uid === job.createdBy;
              setIsReviewingHelper(shouldReviewHelper);
              setReviewModalVisible(true);
              
              // Refresh job details
              loadJobDetails();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error processing tip:', error);
      Alert.alert('Payment Error', error.message || 'Failed to process tip. Please try again.');
    } finally {
      setProcessingPayment(false);
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

  const handleViewNeighborProfile = () => {
    navigation.navigate('NeighborProfile', { neighborId: job.createdBy });
  };

  const handleShowDeleteOptions = () => {
    Alert.alert(
      'Chat Options',
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: confirmDeleteChat
        }
      ]
    );
  };

  const confirmDeleteChat = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteChat
        }
      ]
    );
  };

  const handleDeleteChat = async () => {
    try {
      if (!currentChatId) {
        throw new Error('No chat to delete');
      }

      // First, delete all messages in the chat
      const messagesQuery = query(collection(db, 'chats', currentChatId, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messageDeletions = messagesSnapshot.docs.map(messageDoc => 
        deleteDoc(doc(db, 'chats', currentChatId, 'messages', messageDoc.id))
      );
      
      // Wait for all message deletions to complete
      await Promise.all(messageDeletions);
      
      // Then delete the chat document itself
      await deleteDoc(doc(db, 'chats', currentChatId));
      
      // Navigate back to the chat list
      navigation.navigate('ChatsList', { refresh: true });

    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  const handleSubmitReview = async (rating, comment) => {
    try {
      const reviewData = {
        rating,
        comment,
        jobId: job.id,
        jobTitle: job.title,
        reviewerUid: auth.currentUser.uid,
        reviewerName: currentUser?.fullName || 'Unknown User',
        reviewedUid: isReviewingHelper ? job.helperAssigned : job.createdBy,
        createdAt: new Date(),
      };
      
      // Add review to the reviews collection
      await addDoc(collection(db, 'reviews'), reviewData);
      
      // Also update the job with the rating
      if (isReviewingHelper) {
        await updateDoc(doc(db, 'jobs', jobId), {
          helperRating: rating,
          helperReview: comment
        });
      } else {
        await updateDoc(doc(db, 'jobs', jobId), {
          creatorRating: rating,
          creatorReview: comment
        });
      }
      
      // Hide the feedback button after submission
      setShowFeedbackButton(false);
      
      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => setReviewModalVisible(false)
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        
        <View style={styles.creatorContainer}>
          {creatorProfile?.profileImage ? (
            <Image
              source={{ uri: creatorProfile.profileImage }}
              style={styles.creatorImage}
            />
          ) : (
            <View style={styles.creatorImagePlaceholder}>
              <Text style={styles.creatorImagePlaceholderText}>
                {creatorProfile?.fullName ? creatorProfile.fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.creatorName}>
            {creatorProfile?.fullName || 'Unknown User'}
          </Text>
        </View>
      </View>
      
      <View style={styles.jobContent}>
        <View style={styles.jobHeader}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusBadge, styles[`status${job.status.replace('-', '')}`]]}>
  {job.status === 'completion-requested' ? 'Completion Requested' : 
   job.status.charAt(0).toUpperCase() + job.status.slice(1)}
</Text>
          </View>
        </View>
        
        <View style={styles.jobDetailsContainer}>
          <View style={styles.jobInfoRow}>
            <View style={styles.jobInfoItem}>
              <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
              <Text style={styles.jobInfoText}>{job.jobType}</Text>
            </View>
            
            {distance && (
              <View style={styles.jobInfoItem}>
                <Ionicons name="location" size={18} color={COLORS.primary} />
                <Text style={styles.jobInfoText}>{getReadableDistance(distance)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.jobInfoRow}>
            <View style={styles.jobInfoItem}>
              <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
              <Text style={styles.jobInfoText}>
                {job.paymentType === 'fixed' ? 
                  `$${job.paymentAmount.toFixed(2)}` : 
                  job.paymentType === 'tip' ? 
                    'Tip Only' : 'No Payment'}
              </Text>
            </View>
            
            <View style={styles.jobInfoItem}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.jobInfoText}>
                {job.createdAt.toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Job location */}
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Location</Text>
          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={22} color={COLORS.primary} style={styles.locationIcon} />
            <Text style={styles.locationText}>{job.location}</Text>
          </View>
        </View>
        
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionLabel}>Description</Text>
          <Text style={styles.descriptionText}>{job.description}</Text>
        </View>
        
        {/* Job Poster Profile Section */}
        {!isCreator && (
          <View style={styles.posterProfileContainer}>
            <Text style={styles.sectionTitle}>Job Posted By</Text>
            <View style={styles.posterInfo}>
              {creatorProfile?.profileImage ? (
                <Image
                  source={{ uri: creatorProfile.profileImage }}
                  style={styles.posterImage}
                />
              ) : (
                <View style={styles.posterImagePlaceholder}>
                  <Text style={styles.posterImagePlaceholderText}>
                    {creatorProfile?.fullName ? creatorProfile.fullName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.posterName}>
                {creatorProfile?.fullName || 'Unknown User'}
              </Text>
            </View>
            <Button 
              title="View Neighbor Profile"
              size="small"
              onPress={handleViewNeighborProfile}
              style={styles.viewNeighborButton}
            />
          </View>
        )}
        
        {/* Helper assigned section */}
        {job.helperAssigned && (
          <View style={styles.helperAssignedContainer}>
            <Text style={styles.sectionTitle}>
              {isCreator ? 'Helper Assigned:' : 'You are assigned to this job'}
            </Text>
            <View style={styles.helperInfo}>
              {helperProfile?.profileImage ? (
                <Image
                source={{ uri: helperProfile.profileImage }}
                  style={styles.helperImage}
                />
              ) : (
                <View style={styles.helperImagePlaceholder}>
                  <Text style={styles.helperImagePlaceholderText}>
                    {helperProfile?.fullName ? helperProfile.fullName.charAt(0).toUpperCase() : '?'}
                  </Text>
                </View>
              )}
              <Text style={styles.helperName}>
                {helperProfile ? helperProfile.fullName : 'Unknown Helper'}
              </Text>
            </View>
            {isCreator && (
              <Button 
                title="View Helper Profile"
                size="small"
                onPress={() => navigation.navigate('HelperProfile', { helperId: job.helperAssigned })}
                style={styles.viewHelperButton}
              />
            )}
          </View>
        )}
        
        {/* Reviews Section - Display if job is completed */}
        {job.status === 'completed' && (
          <View style={styles.reviewsContainer}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            
            {job.helperRating && (
              <View style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewLabel}>Helper Rating:</Text>
                  <StarRating rating={job.helperRating} disabled size={16} />
                </View>
                {job.helperReview && (
                  <Text style={styles.reviewText}>{job.helperReview}</Text>
                )}
              </View>
            )}
            
            {job.creatorRating && (
              <View style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewLabel}>Job Poster Rating:</Text>
                  <StarRating rating={job.creatorRating} disabled size={16} />
                </View>
                {job.creatorReview && (
                  <Text style={styles.reviewText}>{job.creatorReview}</Text>
                )}
              </View>
            )}
            
            {!job.helperRating && !job.creatorRating && (
              <Text style={styles.noReviewsText}>No reviews yet</Text>
            )}
          </View>
        )}
        
        {/* Offers section - only visible to job creator */}
        {isCreator && job.status === 'open' && job.offers && job.offers.length > 0 && (
          <View style={styles.offersContainer}>
            <Text style={styles.sectionTitle}>Offers ({job.offers.length})</Text>
            
            {job.offers.map((offer, index) => {
              // Get the helper profile from offersWithHelpers
              const helper = offersWithHelpers.find(h => h.userId === offer.userId);
              
              return (
                <View key={index} style={styles.offerItem}>
                  {/* Helper info */}
                  {helper && (
                    <View style={styles.offerHelperContainer}>
                      {helper.profileImage ? (
                        <Image 
                          source={{ uri: helper.profileImage }} 
                          style={styles.offerHelperImage} 
                        />
                      ) : (
                        <View style={styles.offerHelperImagePlaceholder}>
                          <Text style={styles.offerHelperImageText}>
                            {helper.fullName ? helper.fullName.charAt(0).toUpperCase() : '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.offerHelperInfo}>
                        <Text style={styles.offerHelperName}>
                          {helper.fullName || 'Unknown Helper'}
                        </Text>
                        {helper.rating > 0 && (
                          <View style={styles.offerHelperRating}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={styles.offerHelperRatingText}>
                              {helper.rating.toFixed(1)} ({helper.completedJobs} jobs)
                            </Text>
                          </View>
                        )}
                        {helper.distance && (
                          <Text style={styles.offerHelperDistance}>
                            {getReadableDistance(helper.distance)}
                          </Text>
                        )}
                      </View>
                      <Button
                        title="View Profile"
                        size="small"
                        onPress={() => navigation.navigate('HelperProfile', { helperId: offer.userId })}
                        style={styles.viewProfileButton}
                      />
                    </View>
                  )}
                  
                  <View style={styles.offerHeader}>
                    <Text style={styles.offerAmount}>
                      ${offer.amount.toFixed(2)}
                    </Text>
                    <View style={styles.offerActionButtons}>
                      <Button 
                        title="Chat"
                        icon="chatbubble-outline"
                        size="small"
                        onPress={() => handleOpenChat(offer.userId)}
                        style={styles.chatOfferButton}
                      />
                      
                      <Button 
                        title="Accept"
                        size="small"
                        onPress={() => handleAcceptOffer(offer)}
                        style={styles.acceptButton}
                      />
                    </View>
                  </View>
                  
                  {offer.note && (
                    <Text style={styles.offerNote}>{offer.note}</Text>
                  )}
                  
                  <Text style={styles.offerDate}>
                    {new Date(offer.createdAt.seconds * 1000).toLocaleString()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Make offer section - only visible to helpers for open jobs */}
        {!isCreator && job.status === 'open' && (
          <View style={styles.makeOfferContainer}>
            <Text style={styles.sectionTitle}>
              {hasOffered ? 'Update Your Offer' : 'Make an Offer'}
            </Text>
            
            {job.paymentType === 'fixed' && (
              <Input
                label="Your Offer Amount ($)"
                value={offerAmount}
                onChangeText={setOfferAmount}
                placeholder="Enter your price"
                keyboardType="numeric"
                required
              />
            )}
            
            <Input
              label="Note (optional)"
              value={offerNote}
              onChangeText={setOfferNote}
              placeholder="Add a note about your offer..."
              multiline
              numberOfLines={3}
            />
            
            <Button 
              title={hasOffered ? 'Update Offer' : 'Submit Offer'}
              onPress={handleMakeOffer}
              style={styles.submitButton}
              size="large"
            />
          </View>
        )}
        
       // In screens/jobs/JobDetailsScreen.js - Replace the action buttons section in the JSX

{/* Action buttons based on job status and user role */}
<View style={styles.actionButtonsContainer}>
  {job.status === 'accepted' && (isCreator || isHelper) && (
    <Button 
      title="Start Job"
      onPress={handleStartJob}
      style={styles.actionButton}
      size="large"
    />
  )}
  
  {/* Helper can request completion when job is in progress */}
  {job.status === 'in-progress' && isHelper && (
    <Button 
      title="Request Job Completion"
      onPress={handleCompleteJob}
      style={styles.actionButton}
      size="large"
      icon="checkmark-circle-outline"
    />
  )}
  
  {/* Show status message when helper has requested completion */}
  {job.status === 'completion-requested' && isCreator && (
    <View style={styles.completionRequestedContainer}>
      <Text style={styles.completionRequestedText}>
        🎉 The helper has completed the work and is requesting job completion.
      </Text>
      <Button 
        title="Review and Complete Job"
        onPress={handleCompleteJob}
        style={styles.actionButton}
        size="large"
        icon="checkmark-done"
      />
    </View>
  )}
  
  {/* Show waiting message for helper when completion is requested */}
  {job.status === 'completion-requested' && isHelper && (
    <View style={styles.waitingForApprovalContainer}>
      <Text style={styles.waitingForApprovalText}>
        ⏳ Waiting for job creator to review and confirm completion.
      </Text>
    </View>
  )}
  
  {/* Job creator can still complete directly if helper hasn't requested completion yet */}
  {job.status === 'in-progress' && isCreator && (
    <Button 
      title="Mark as Completed"
      onPress={handleCompleteJob}
      style={styles.actionButton}
      size="large"
    />
  )}
  
  {(job.status === 'open' || job.status === 'accepted' || job.status === 'in-progress' || job.status === 'completion-requested') && isCreator && (
    <Button 
      title="Cancel Job"
      onPress={handleCancelJob}
      type="secondary"
      style={styles.cancelButton}
      size="large"
    />
  )}
  
  {/* Chat button for accepted/in-progress jobs */}
  {(job.status === 'accepted' || job.status === 'in-progress' || job.status === 'completion-requested') && (isCreator || isHelper) && (
    <Button 
      title="Chat"
      icon="chatbubble-ellipses"
      onPress={() => handleOpenChat(isCreator ? job.helperAssigned : job.createdBy)}
      style={styles.chatActionButton}
      size="large"
    />
  )}
  
  {/* Chat button for helpers who made an offer */}
  {!isCreator && job.status === 'open' && hasOffered && (
    <Button 
      title="Chat with Job Poster"
      icon="chatbubble-ellipses"
      onPress={() => handleOpenChat(job.createdBy)}
      style={styles.chatActionButton}
      size="large"
    />
  )}
  
  {/* Button to give feedback for completed jobs */}
  {job.status === 'completed' && showFeedbackButton && (
    <Button 
      title={`Rate ${isReviewingHelper ? 'Helper' : 'Neighbor'}`}
      icon="star"
      onPress={() => setReviewModalVisible(true)}
      style={styles.feedbackButton}
      size="large"
    />
  )}
</View>
      </View>
      
      {/* Tip Modal */}
      <Modal
        visible={showTipModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a Tip</Text>
              <TouchableOpacity onPress={() => setShowTipModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.tipDescription}>
              Show your appreciation for a job well done!
            </Text>
            
            <Input
              label="Tip Amount (£)"
              value={tipAmount}
              onChangeText={setTipAmount}
              placeholder="Enter amount (e.g. 5.00)"
              keyboardType="numeric"
              required
            />
            
            <Text style={styles.tipHint}>
              You can also complete the job without a tip.
            </Text>
            
            <View style={styles.tipButtonsContainer}>
              <Button
                title="Skip Tip"
                type="secondary"
                onPress={async () => {
                  setShowTipModal(false);
                  // Mark job as complete without tip
                  await updateDoc(doc(db, 'jobs', jobId), {
                    status: 'completed',
                    completedAt: new Date(),
                  });
                  // Show review modal
                  const shouldReviewHelper = auth.currentUser.uid === job.createdBy;
                  setIsReviewingHelper(shouldReviewHelper);
                  setReviewModalVisible(true);
                  // Refresh job details
                  loadJobDetails();
                }}
                style={styles.skipTipButton}
              />
              
              <Button
                title="Send Tip"
                onPress={handleSubmitTip}
                disabled={!tipAmount || isNaN(parseFloat(tipAmount)) || parseFloat(tipAmount) <= 0}
                style={styles.sendTipButton}
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Review Modal */}
      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onSubmit={handleSubmitReview}
        title={`Rate Your ${isReviewingHelper ? 'Helper' : 'Neighbor'}`}
        recipient={isReviewingHelper ? helperProfile?.fullName : creatorProfile?.fullName}
      />
      
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
    backgroundColor: COLORS.background,
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
  },
  backLink: {
    ...FONTS.body,
    color: COLORS.primary,
    fontSize: 16,
  },
  headerContainer: {
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorContainer: {
    alignItems: 'center',
  },
  creatorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: 10,
  },
  creatorImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: 10,
  },
  creatorImagePlaceholderText: {
    color: COLORS.white,
    ...FONTS.heading,
    fontSize: 32,
  },
  creatorName: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  jobContent: {
    padding: 20,
    marginTop: -20,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  jobHeader: {
    marginBottom: 15,
  },
  jobTitle: {
    ...FONTS.heading,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    ...FONTS.bodyBold,
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
  jobDetailsContainer: {
    backgroundColor: COLORS.white, // Changed from background to white
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  jobInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  jobInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    flex: 1,
  },
  jobInfoText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginLeft: 8,
  },
  locationContainer: {
    marginBottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  locationLabel: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textDark,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  locationText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    flex: 1,
    flexWrap: 'wrap',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionLabel: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textDark,
  },
  descriptionText: {
    ...FONTS.body,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textDark,
  },
  posterProfileContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  posterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  posterImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  posterImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  posterImagePlaceholderText: {
    ...FONTS.bodyBold,
    fontSize: 20,
    color: COLORS.white,
  },
  posterName: {
    ...FONTS.subheading,
    fontSize: 16,
    color: COLORS.textDark,
  },
  viewNeighborButton: {
    alignSelf: 'flex-end',
  },
  helperAssignedContainer: {
    backgroundColor: COLORS.white, // Changed from background to white
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  helperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  helperImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  helperImagePlaceholderText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontSize: 18,
  },
  helperName: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  viewHelperButton: {
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  sectionTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.textDark,
  },
  reviewsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  reviewItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewLabel: {
    ...FONTS.bodyBold,
    fontSize: 14,
    color: COLORS.textDark,
    marginRight: 10,
  },
  reviewText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  noReviewsText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  offersContainer: {
    marginBottom: 20,
  },
  offerItem: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  offerHelperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  offerHelperImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  offerHelperImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  offerHelperImageText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontSize: 20,
  },
  offerHelperInfo: {
    flex: 1,
  },
  offerHelperName: {
    ...FONTS.subheading,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 5,
  },
  offerHelperRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  offerHelperRatingText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginLeft: 5,
  },
  offerHelperDistance: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  viewProfileButton: {
    marginLeft: 10,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerAmount: {
    ...FONTS.subheading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  offerActionButtons: {
    flexDirection: 'row',
  },
  chatOfferButton: {
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: COLORS.success,
  },
  offerNote: {
    ...FONTS.body,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  offerDate: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.textLight,
  },
  makeOfferContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  submitButton: {
    marginTop: 10,
  },
  actionButtonsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    marginBottom: 10,
  },
  cancelButton: {
    marginBottom: 10,
  },
  chatActionButton: {
    backgroundColor: COLORS.info,
    marginBottom: 10,
  },
  feedbackButton: {
    backgroundColor: '#FFB800', // Golden color for feedback button
    marginBottom: 10,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    ...FONTS.body,
    color: COLORS.white,
    fontSize: 16,
  },
  // Modal styles for tip
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
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
  tipDescription: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  tipHint: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tipButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skipTipButton: {
    flex: 1,
    marginRight: 10,
  },
  sendTipButton: {
    flex: 1,
  },

  completionRequestedContainer: {
  backgroundColor: '#e8f5e9',
  borderRadius: 15,
  padding: 20,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: COLORS.success,
  alignItems: 'center',
},
completionRequestedText: {
  ...FONTS.body,
  fontSize: 16,
  color: COLORS.success,
  textAlign: 'center',
  marginBottom: 15,
  fontWeight: 'bold',
},
waitingForApprovalContainer: {
  backgroundColor: '#fff8e1',
  borderRadius: 15,
  padding: 20,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: COLORS.warning,
  alignItems: 'center',
},
waitingForApprovalText: {
  ...FONTS.body,
  fontSize: 16,
  color: COLORS.warning,
  textAlign: 'center',
  fontWeight: 'bold',
},

'statuscompletion-requested': {
  backgroundColor: '#e8f5e9',
  color: '#4caf50',
},

});

export default JobDetailsScreen;