// screens/NeighborProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Image,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  doc, 
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import Button from '../components/Button';
import StarRating from '../components/StarRating';

const NeighborProfileScreen = ({ route, navigation }) => {
  const { neighborId } = route.params;
  const [neighborProfile, setNeighborProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [completedJobs, setCompletedJobs] = useState(0);

  useEffect(() => {
    loadNeighborProfile();
  }, [neighborId]);

  const loadNeighborProfile = async () => {
    setLoading(true);
    try {
      // Get the neighbor profile
      const neighborDoc = await getDoc(doc(db, 'users', neighborId));
      
      if (neighborDoc.exists()) {
        setNeighborProfile(neighborDoc.data());
      } else {
        Alert.alert('Error', 'Neighbor profile not found');
        navigation.goBack();
        return;
      }
      
      // Get reviews for this neighbor
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('reviewedUid', '==', neighborId),
        orderBy('createdAt', 'desc')
      );
      
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const reviewsList = [];
      let totalRating = 0;
      
      reviewsSnapshot.forEach((doc) => {
        const reviewData = doc.data();
        reviewsList.push({
          id: doc.id,
          ...reviewData,
          createdAt: reviewData.createdAt.toDate()
        });
        totalRating += reviewData.rating;
      });
      
      setReviews(reviewsList);
      
      // Calculate average rating
      if (reviewsList.length > 0) {
        setAverageRating(totalRating / reviewsList.length);
      }
      
      // Get count of completed jobs
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('createdBy', '==', neighborId),
        where('status', '==', 'completed')
      );
      
      const jobsSnapshot = await getDocs(jobsQuery);
      setCompletedJobs(jobsSnapshot.size);
      
    } catch (error) {
      console.error('Error loading neighbor profile:', error);
      Alert.alert('Error', 'Could not load neighbor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('You must be logged in to send messages');
      }
  
      // Navigate to the chat with this neighbor
      navigation.navigate('Messages', { 
        screen: 'ChatDetails', 
        params: { 
          otherUserId: neighborId
        } 
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{item.reviewerName}</Text>
        <Text style={styles.reviewDate}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.ratingContainer}>
        <StarRating rating={item.rating} disabled size={18} />
        <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
      </View>
      
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
      
      <Text style={styles.jobReference}>
        For: {item.jobTitle}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!neighborProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Neighbor profile could not be loaded</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.goBackButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Neighbor Profile</Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>
      
      <ScrollView style={styles.scrollContent}>
        <View style={styles.profileHeader}>
          {neighborProfile.profileImage ? (
            <Image
              source={{ uri: neighborProfile.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {neighborProfile.fullName ? neighborProfile.fullName.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          
          <Text style={styles.neighborName}>{neighborProfile.fullName}</Text>
          <Text style={styles.neighborLocation}>{neighborProfile.address}</Text>
          
          <View style={styles.ratingContainer}>
            <StarRating rating={averageRating} disabled />
            <Text style={styles.ratingText}>
              {averageRating.toFixed(1)} ({reviews.length} reviews)
            </Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedJobs}</Text>
              <Text style={styles.statLabel}>Jobs Posted</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.aboutText}>
            {neighborProfile.aboutMe || 'No information provided.'}
          </Text>
        </View>
        
        {reviews.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => setReviewsModalVisible(true)}
              >
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {reviews.slice(0, 2).map((review) => (
              <View key={review.id} style={styles.reviewPreview}>
                <View style={styles.reviewPreviewHeader}>
                  <Text style={styles.reviewerName}>{review.reviewerName}</Text>
                  <StarRating rating={review.rating} disabled size={14} />
                </View>
                
                {review.comment && (
                  <Text 
                    style={styles.reviewComment}
                    numberOfLines={2}
                  >
                    {review.comment}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.actionButtons}>
          <Button
            title="Send Message"
            icon="chatbubble-outline"
            onPress={handleOpenChat}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
      
      {/* Reviews Modal */}
      <Modal
        visible={reviewsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReviewsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reviews</Text>
              <TouchableOpacity onPress={() => setReviewsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {reviews.length > 0 ? (
              <FlatList
                data={reviews}
                renderItem={renderReviewItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.reviewsList}
              />
            ) : (
              <View style={styles.noReviewsContainer}>
                <Ionicons name="star-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
              </View>
            )}
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
  neighborName: {
    ...FONTS.heading,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 5,
  },
  neighborLocation: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 15,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    marginHorizontal: 15,
  },
  statValue: {
    ...FONTS.heading,
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  viewAllButton: {
    padding: 5,
  },
  viewAllButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontSize: 14,
  },
  aboutText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 24,
  },
  reviewPreview: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reviewerName: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: 'bold',
  },
  reviewComment: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    maxWidth: '80%',
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
  reviewsList: {
    paddingVertical: 10,
  },
  reviewItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewDate: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.textLight,
  },
  jobReference: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  noReviewsContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noReviewsText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default NeighborProfileScreen;