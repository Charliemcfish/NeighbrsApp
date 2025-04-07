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
  Animated,
  Image
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
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import Input from '../../components/Input';

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

      // Get helper profiles for all offers
      if (jobData.offers && jobData.offers.length > 0) {
        const helpersInfo = await Promise.all(
          jobData.offers.map(async (offer) => {
            try {
              const helperDoc = await getDoc(doc(db, 'users', offer.userId));
              if (helperDoc.exists()) {
                const helperData = helperDoc.data();
                
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
        'Job started!',
        'You have successfully started this job.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to dashboard after confirming
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            }
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
            <Text style={[styles.statusBadge, styles[`status${job.status}`]]}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.jobDetailsContainer}>
          <View style={styles.jobInfoRow}>
            <View style={styles.jobInfoItem}>
              <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
              <Text style={styles.jobInfoText}>{job.jobType}</Text>
            </View>
            
            {job.location && (
              <View style={styles.jobInfoItem}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <Text style={styles.jobInfoText}>{job.location}</Text>
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
          
          {job.status === 'in-progress' && (isCreator || isHelper) && (
            <Button 
              title="Mark as Completed"
              onPress={handleCompleteJob}
              style={styles.actionButton}
              size="large"
            />
          )}
          
          {(job.status === 'open' || job.status === 'accepted' || job.status === 'in-progress') && isCreator && (
            <Button 
              title="Cancel Job"
              onPress={handleCancelJob}
              type="secondary"
              style={styles.cancelButton}
              size="large"
            />
          )}
          
          {/* Chat button for accepted/in-progress jobs */}
          {(job.status === 'accepted' || job.status === 'in-progress') && (isCreator || isHelper) && (
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
        </View>
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
  },
  offerHelperRatingText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginLeft: 5,
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
});

export default JobDetailsScreen;