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
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

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
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Could not load user profile</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
        
        <View style={styles.profileInfo}>
          <Ionicons name="location" size={20} color="#666" style={styles.infoIcon} />
          <Text style={styles.infoText}>{userProfile.address}</Text>
        </View>
        
        {userProfile.aboutMe && (
          <View style={styles.profileInfo}>
            <Ionicons name="person" size={20} color="#666" style={styles.infoIcon} />
            <Text style={styles.infoText}>{userProfile.aboutMe}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.switchItem}>
          <Text style={styles.switchLabel}>Helper Mode</Text>
          <Switch
            value={userType === 'helper'}
            onValueChange={handleToggleHelperMode}
            trackColor={{ false: "#ccc", true: "#4A90E2" }}
          />
        </View>
      </View>
      
      {userType === 'helper' && (
        <TouchableOpacity 
          style={styles.helperSettingsButton}
          onPress={() => navigation.navigate('HelperSetup', { userId: auth.currentUser.uid })}
        >
          <Text style={styles.helperSettingsText}>Edit Helper Settings</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        
       
<TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
  <Ionicons name="create-outline" size={20} color="#666" style={styles.actionIcon} />
  <Text style={styles.actionText}>Edit Profile</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
  <Ionicons name="key-outline" size={20} color="#666" style={styles.actionIcon} />
  <Text style={styles.actionText}>Change Password</Text>
</TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#f44336" style={styles.actionIcon} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#f44336',
    marginBottom: 20,
  },
  profileHeader: {
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  helperSettingsButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  helperSettingsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionIcon: {
    marginRight: 10,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    borderBottomWidth: 0,
  },
  signOutButtonText: {
    fontSize: 16,
    color: '#f44336',
  },
  signOutText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;