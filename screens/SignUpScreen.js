// screens/SignUpScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  ImageBackground,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import Input from '../components/Input';
import Button from '../components/Button';
import { COLORS, FONTS } from '../styles/theme';
import { geocodeAddress } from '../utils/locationService';

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

      // Geocode the address to get coordinates
      const locationData = await geocodeAddress(address);

      // Prepare user data with location information
      const userData = {
        fullName,
        email,
        address: locationData?.formattedAddress || address,
        location: {
          address: locationData?.formattedAddress || address,
          coordinates: locationData?.coordinates || null
        },
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
        <ImageBackground
          source={require('../assets/logo.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
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
              <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                required
              />
              
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                required
              />
              
              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                required
              />
              
              <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                required
              />
              
              <Input
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
                required
              />
              
              <Input
                label="About Me"
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
                  trackColor={{ false: "#ccc", true: COLORS.primary }}
                  thumbColor={wantToBeHelper ? "#fff" : "#f4f3f4"}
                />
              </View>
              
              {/* Terms and Conditions */}
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>I agree to the Terms and Conditions</Text>
                <Switch
                  value={agreeToTerms}
                  onValueChange={setAgreeToTerms}
                  trackColor={{ false: "#ccc", true: COLORS.primary }}
                  thumbColor={agreeToTerms ? "#fff" : "#f4f3f4"}
                />
              </View>
              
              {/* Sign Up Button */}
              <Button 
                title="Sign Up"
                onPress={handleSignUp}
                loading={loading}
                disabled={loading}
                style={styles.button}
                size="large"
              />
              
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
        </ImageBackground>
      </SafeAreaView>
    </KeyboardAvoidingWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.1,
    resizeMode: 'cover',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    ...FONTS.heading,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: COLORS.white,
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
    borderColor: COLORS.white,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: COLORS.white,
    ...FONTS.body,
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    ...FONTS.body,
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
    ...FONTS.body,
    color: COLORS.textDark,
  },
  button: {
    width: '100%',
    marginTop: 10,
  },
  linkContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 16,
    color: COLORS.textDark,
    ...FONTS.body,
  },
  link: {
    color: COLORS.primary,
    fontWeight: 'bold',
    ...FONTS.bodyBold,
  },
});

export default SignUpScreen;