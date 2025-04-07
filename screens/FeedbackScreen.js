// screens/FeedbackScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';

const FeedbackScreen = ({ navigation }) => {
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');

  const feedbackCategories = [
    'Bug Report',
    'Feature Request',
    'User Experience',
    'Other Suggestions'
  ];

  const handleSubmitFeedback = async () => {
    if (!feedbackMessage.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }

    if (!category) {
      Alert.alert('Error', 'Please select a feedback category');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;

      // Prepare feedback data
      const feedbackData = {
        userId: user.uid,
        userEmail: user.email,
        message: feedbackMessage,
        category,
        createdAt: new Date(),
        status: 'new'
      };

      // Store feedback in Firestore
      await addDoc(collection(db, 'feedback'), feedbackData);

      // Reset form
      setFeedbackMessage('');
      setCategory('');

      // Show success alert
      Alert.alert(
        'Thank You!', 
        'Your feedback has been submitted. We appreciate your help in improving Neighbrs.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Help Us Improve Neighbrs</Text>
            
            <Text style={styles.subtitle}>
              We value your feedback and are always looking to enhance your experience.
            </Text>
            
            <View style={styles.categoryContainer}>
              <Text style={styles.label}>Feedback Category</Text>
              <View style={styles.categoryButtonContainer}>
                {feedbackCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.selectedCategoryButton
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text 
                      style={[
                        styles.categoryButtonText,
                        category === cat && styles.selectedCategoryButtonText
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <Input
              label="Your Feedback"
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              placeholder="Share your thoughts, suggestions, or report any issues..."
              multiline
              numberOfLines={6}
              required
            />
            
            <Button 
              title="Submit Feedback"
              onPress={handleSubmitFeedback}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              size="large"
            />
          </View>
        </ScrollView>
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
    top: 50,
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
    marginTop: 80,
  },
  formContainer: {
    padding: 20,
  },
  title: {
    ...FONTS.heading,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  subtitle: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  label: {
    ...FONTS.subheading,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  categoryButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 5,
  },
  selectedCategoryButton: {
    backgroundColor: COLORS.primary,
  },
  categoryButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  selectedCategoryButtonText: {
    color: COLORS.white,
  },
  submitButton: {
    marginTop: 20,
  },
});

export default FeedbackScreen;