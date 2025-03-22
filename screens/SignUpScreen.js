// screens/SignUpScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput,
  Alert,
  Switch,
  KeyboardAvoidingView,

  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';

// Make sure to install this:
// expo install expo-image-picker

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [wantToBeHelper, setWantToBeHelper] = useState(false);
  const [loading, setLoading] = useState(false);

 // screens/SignUpScreen.js
// Update the pickImage function

// screens/SignUpScreen.js
// Update the pickImage function

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

  // In your SignUpScreen.js file
const handleSignUp = async () => {
  // Validate inputs
  if (!email || !password || !confirmPassword || !fullName || !address) {
    Alert.alert('Error', 'Please fill in all required fields');
    return;
  }

  if (password !== confirmPassword) {
    Alert.alert('Error', 'Passwords do not match');
    return;
  }

  if (!agreeToTerms) {
    Alert.alert('Error', 'You must agree to the terms and conditions');
    return;
  }

  setLoading(true);

  try {
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Prepare user data - only include profileImage if it exists
    const userData = {
      fullName,
      email,
      address,
      aboutMe: aboutMe || "", // Use empty string instead of undefined
      isHelper: wantToBeHelper,
      createdAt: new Date(),
    };

    // Only add profileImage if it's not null
    if (profileImage) {
      userData.profileImage = profileImage;
    }

    // Store user data in Firestore
    await setDoc(doc(db, 'users', user.uid), userData);

    // If user wants to be a helper, they'll need to complete more info
    if (wantToBeHelper) {
      navigation.navigate('HelperSetup', { userId: user.uid });
    } else {
      navigation.navigate('Home');
    }
  } catch (error) {
    Alert.alert('Error', error.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <KeyboardAvoidingWrapper>
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create an Account</Text>
        
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
        <View style={styles.formContainer}>
          <Text style={styles.label}>Full Name*</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
          />
          
          <Text style={styles.label}>Email*</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.label}>Password*</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry
          />
          
          <Text style={styles.label}>Confirm Password*</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
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
          
          {/* Helper Option */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>I want to offer help to neighbors</Text>
            <Switch
              value={wantToBeHelper}
              onValueChange={setWantToBeHelper}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
            />
          </View>
          
          {/* Terms and Conditions */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>I agree to the Terms and Conditions</Text>
            <Switch
              value={agreeToTerms}
              onValueChange={setAgreeToTerms}
              trackColor={{ false: '#ccc', true: '#4A90E2' }}
            />
          </View>
          
          {/* Sign Up Button */}
          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
          
          {/* Login Link */}
          <TouchableOpacity 
            style={styles.linkContainer} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.link}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
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
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    flex: 1,
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
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    color: '#333',
  },
  link: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});

export default SignUpScreen;