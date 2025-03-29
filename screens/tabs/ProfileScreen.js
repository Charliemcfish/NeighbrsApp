// screens/tabs/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';

const ProfileScreen = ({ route, navigation }) => {
  const { userType: initialUserType } = route.params || {};
  const [userProfile, setUserProfile] = useState(null);
  const [userType, setUserType] = useState(initialUserType || 'neighbor');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserProfile(userData);
        setUserType(userData.isHelper ? 'helper' : 'neighbor');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleHelperMode = async (value) => {
    try {
      const user = auth.currentUser;
      
      if (value) {
        // If turning on helper mode, navigate to helper setup
        navigation.navigate('HelperSetup', { userId: user.uid });
      } else {
        // If turning off helper mode, update the user profile
        await updateDoc(doc(db, 'users', user.uid), {
          isHelper: false
        });
        
        setUserType('neighbor');
        Alert.alert('Success', 'Helper mode has been turned off');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Navigate to the landing screen or login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Landing' }]
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load user profile</Text>
        <Button 
          title="Sign Out" 
          onPress={handleSignOut} 
          style={styles.signOutButton}
        />
      </View>
    );
  }

  const handleEditProfile = () => {
    // Navigate to a new screen for profile editing
    navigation.navigate('EditProfile', { userProfile });
  };
  
  const handleChangePassword = () => {
    // Show password reset modal or navigate to reset screen
    Alert.alert(
      'Change Password',
      'We will send a password reset email to your registered email address.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send Email',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, userProfile.email);
              Alert.alert(
                'Success', 
                'Password reset email has been sent. Please check your inbox.'
              );
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          {userProfile.profileImage ? (
            <Image
              source={{ uri: userProfile.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.profileName}>{userProfile.fullName}</Text>
        <Text style={styles.profileEmail}>{userProfile.email}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={22} color={COLORS.primary} style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoText}>{userProfile.address}</Text>
          </View>
          
          {userProfile.aboutMe && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={22} color={COLORS.primary} style={styles.infoIcon} />
              <Text style={styles.infoLabel}>About Me:</Text>
              <Text style={styles.infoText}>{userProfile.aboutMe}</Text>
            </View>
          )}
        </View>
      </View>
      
      {userType === 'helper' && userProfile.jobTypes && userProfile.jobTypes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <View style={styles.servicesContainer}>
            {userProfile.jobTypes.map((jobType, index) => (
              <View key={index} style={styles.serviceItem}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
                <Text style={styles.serviceText}>{jobType}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.preferencesCard}>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Helper Mode</Text>
            <Switch
              value={userType === 'helper'}
              onValueChange={handleToggleHelperMode}
              trackColor={{ false: "#ccc", true: COLORS.primary }}
              thumbColor={userType === 'helper' ? "#fff" : "#f4f3f4"}
            />
          </View>
        </View>
      </View>
      
      {userType === 'helper' && (
        <Button 
          title="Edit Helper Settings"
          icon="settings-outline"
          onPress={() => navigation.navigate('HelperSetup', { userId: auth.currentUser.uid })}
          style={styles.helperSettingsButton}
        />
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
        <View style={styles.buttonContainer}>
          <Button 
            title="Edit Profile" 
            icon="create-outline"
            onPress={handleEditProfile}
            style={styles.actionButton}
          />
          
          <Button 
            title="Change Password" 
            icon="key-outline"
            onPress={handleChangePassword}
            style={styles.actionButton}
          />
          
          <Button 
            title="Sign Out" 
            icon="log-out-outline"
            type="secondary"
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </View>
      </View>
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
  loadingText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
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
  profileHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  profileImagePlaceholderText: {
    ...FONTS.heading,
    fontSize: 48,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  profileName: {
    ...FONTS.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: COLORS.white,
  },
  profileEmail: {
    ...FONTS.body,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: COLORS.textDark,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    ...SHADOWS.small,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoLabel: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: 'bold',
    width: 90,
  },
  infoText: {
    ...FONTS.body,
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
  },
  servicesContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    ...SHADOWS.small,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
  },
  serviceText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginLeft: 10,
  },
  preferencesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    ...SHADOWS.small,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  helperSettingsButton: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  buttonContainer: {
    marginBottom: 30,
  },
  actionButton: {
    marginBottom: 10,
  },
  signOutButton: {
    marginBottom: 10,
  },
});

export default ProfileScreen;