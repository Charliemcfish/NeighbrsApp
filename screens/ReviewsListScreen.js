// screens/ReviewsListScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import StarRating from '../components/StarRating';

const ReviewsListScreen = ({ route, navigation }) => {
  const { userId, userName } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    loadReviews();
  }, [userId]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('reviewedUid', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(reviewsQuery);
      const reviewsList = [];
      let totalRating = 0;
      
      querySnapshot.forEach((doc) => {
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
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
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
        <StarRating rating={item.rating} disabled size={16} />
        <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
      </View>
      
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
      
      <Text style={styles.jobReference}>
        For job: {item.jobTitle}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Reviews for {userName}
        </Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.averageRating}>
          <Text style={styles.averageRatingValue}>{averageRating.toFixed(1)}</Text>
          <StarRating rating={averageRating} disabled size={24} />
          <Text style={styles.totalReviews}>
            Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.reviewsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="star-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          )}
        </>
      )}
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
    flex: 1,
  },
  statsContainer: {
    padding: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  averageRating: {
    alignItems: 'center',
  },
  averageRatingValue: {
    ...FONTS.heading,
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  totalReviews: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginTop: 10,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewsList: {
    padding: 15,
  },
  reviewItem: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerName: {
    ...FONTS.subheading,
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  reviewDate: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textLight,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginLeft: 10,
  },
  reviewComment: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 10,
    lineHeight: 22,
  },
  jobReference: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    ...FONTS.body,
    fontSize: 18,
    color: COLORS.textMedium,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default ReviewsListScreen;