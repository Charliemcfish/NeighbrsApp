import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Image 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS, FONTS, SHADOWS } from '../styles/theme';
import AddressAutocomplete from '../components/AddressAutocomplete';

const EditProfileScreen = ({ route, navigation }) => {
  const { userProfile } = route.params;
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [locationData, setLocationData] = useState({
    address: userProfile.address || '',
    coordinates: userProfile.location?.coordinates || null
  });
  const [aboutMe, setAboutMe] = useState(userProfile.aboutMe || '');
  const [profileImage, setProfileImage] = useState(userProfile.profileImage || null);
  const [loading, setLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need camera roll permissions to upload a profile picture');
      return;
    }
  
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', // Changed to 'images' (plural)
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
  
      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('ImagePicker Error: ', error);
    }
  };

  const handleAddressSelect = (place) => {
    setLocationData({
      address: place.address,
      coordinates: place.coordinates
    });
    setAddressError(null);
  };

  const handleUpdateProfile = async () => {
    if (!fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!locationData.address) {
      setAddressError('Please select an address from the dropdown');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare updated profile data
      const updatedProfile = {
        fullName,
        address: locationData.address,
        aboutMe,
        location: {
          address: locationData.address,
          coordinates: locationData.coordinates
        }
      };

      // Only update profileImage if it's changed
      if (profileImage && profileImage !== userProfile.profileImage) {
        updatedProfile.profileImage = profileImage;
      }

      // Update user document in Firestore
      await updateDoc(doc(db, 'users', user.uid), updatedProfile);
      
      Alert.alert(
        'Success',
        'Your profile has been updated!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>X</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          {/* Profile Image Picker */}
          <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Form Fields */}
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            required
          />
          
          <AddressAutocomplete
            label="Address"
            value={locationData.address}
            onSelect={handleAddressSelect}
            placeholder="Enter your address"
            required
            error={addressError}
          />
          
          <Input
            label="About Me"
            value={aboutMe}
            onChangeText={setAboutMe}
            placeholder="Tell your neighbors a bit about yourself"
            multiline
            numberOfLines={4}
          />
          
          {/* Update Button */}
          <Button 
            title={loading ? 'Updating...' : 'Update Profile'}
            onPress={handleUpdateProfile}
            disabled={loading}
            style={styles.updateButton}
            size="large"
          />
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
    width: 50,
  },
  backButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontSize: 24,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  imagePickerContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: COLORS.primary,
    ...FONTS.body,
    fontSize: 16,
  },
  updateButton: {
    marginTop: 20,
    marginBottom: 30,
  },
});

export default EditProfileScreen;