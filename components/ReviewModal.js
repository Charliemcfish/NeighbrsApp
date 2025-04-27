// components/ReviewModal.js
import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import Button from './Button';
import StarRating from './StarRating';

const ReviewModal = ({ 
  visible, 
  onClose, 
  onSubmit,
  title = "Leave Review",
  recipient,
  initialRating = 0,
  initialComment = ""
}) => {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(rating, comment);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review. Please try again.');
      setLoading(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {recipient && (
            <Text style={styles.recipientText}>
              Rate your experience with {recipient}
            </Text>
          )}
          
          <View style={styles.ratingContainer}>
            <StarRating 
              rating={rating} 
              setRating={setRating} 
              size={36}
            />
            <Text style={styles.ratingText}>
              {rating === 0 ? 'Tap to rate' : 
               rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Very Good' : 'Excellent'}
            </Text>
          </View>
          
          <Text style={styles.commentLabel}>Comments</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          
          <Button
            title={loading ? "Submitting..." : "Submit Review"}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || rating === 0}
            style={styles.submitButton}
            size="large"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  closeButton: {
    padding: 5,
  },
  recipientText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
    marginBottom: 20,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 10,
  },
  commentLabel: {
    ...FONTS.subheading,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    ...FONTS.body,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 100,
  },
  submitButton: {
    marginTop: 10,
  },
});

export default ReviewModal;