// screens/EditProfileScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Image 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';


const EditProfileScreen = ({ route, navigation }) => {
  const { userProfile } = route.params;
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [address, setAddress] = useState(userProfile.address || '');
  const [aboutMe, setAboutMe] = useState(userProfile.aboutMe || '');
  const [profileImage, setProfileImage] = useState(userProfile.profileImage || null);
  const [loading, setLoading] = useState(false);

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

  const handleUpdateProfile = async () => {
    if (!fullName || !address) {
      Alert.alert('Error', 'Please fill in all required fields');
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
        address,
        aboutMe,
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

    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Edit Profile</Text>
        
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
        <Text style={styles.label}>Full Name*</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
        />
        
        <Text style={styles.label}>Address*</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your address"
        />
        
        <Text style={styles.label}>About Me</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={aboutMe}
          onChangeText={setAboutMe}
          placeholder="Tell your neighbors a bit about yourself"
          multiline
          numberOfLines={4}
        />
        
        {/* Update Button */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={handleUpdateProfile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Text>
        </TouchableOpacity>
        
        {/* Cancel Button */}
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingWrapper>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  imagePickerContainer: {
    alignSelf: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#555',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a0c8f0',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default EditProfileScreen;