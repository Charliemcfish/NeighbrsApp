// screens/tabs/ProfileScreen.js - Updated with fixed authentication
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Image,
  ActivityIndicator
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  signOut, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import { logError } from '../../utils/errorLogger';
import { callFirebaseFunction } from '../../utils/firebaseFunctions';

const ProfileScreen = ({ route, navigation }) => {
  const { userType: initialUserType } = route.params || {};
  const [userProfile, setUserProfile] = useState(null);
  const [userType, setUserType] = useState(initialUserType || 'neighbor');
  const [loading, setLoading] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false);
  const [hasConnectAccount, setHasConnectAccount] = useState(false);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      checkPaymentStatus();
    }
  }, [userProfile]);

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        console.log('No authenticated user found');
        throw new Error('User not authenticated');
      }

      console.log('Loading profile for user:', user.uid);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data loaded successfully');
        setUserProfile(userData);
        setUserType(userData.isHelper ? 'helper' : 'neighbor');
      } else {
        console.log('User document does not exist');
      }
    } catch (error) {
      logError('loadUserProfile', error);
      Alert.alert('Error', 'Failed to load your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setCheckingPaymentStatus(true);
      const user = auth.currentUser;
      if (!user) {
        console.log('No authenticated user found during payment check');
        return;
      }
      
      // Check if user has payment method set up
      console.log('Checking payment method status...');
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setHasPaymentMethod(!!userData.hasPaymentMethod);
        console.log('Has payment method:', !!userData.hasPaymentMethod);
      }
      
      // Check if helper has Connect account
      if (userType === 'helper') {
        try {
          console.log('User is a helper, checking Connect account status...');
          
          const result = await callFirebaseFunction('checkConnectAccountStatus');
          console.log('Connect account status result:', result);
          setHasConnectAccount(result.hasAccount);
        } catch (error) {
          logError('checkConnectAccountStatus in Profile', error);
          console.log('Error checking Connect account, setting hasConnectAccount to false');
          setHasConnectAccount(false);
        }
      }
    } catch (error) {
      logError('checkPaymentStatus', error);
    } finally {
      setCheckingPaymentStatus(false);
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
        
        // Navigate to the Dashboard tab with updated params
        navigation.dispatch(
          CommonActions.navigate({
            name: 'Dashboard',
            params: { userType: 'neighbor', updatedAt: new Date().getTime() },
          })
        );
        
        Alert.alert('Success', 'Helper mode has been turned off');
      }
    } catch (error) {
      logError('handleToggleHelperMode', error);
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
      logError('handleSignOut', error);
      Alert.alert('Error', error.message);
    }
  };

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
              logError('handleChangePassword', error);
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
            <View style={styles.infoRowWithIcon}>
              <Ionicons name="location" size={22} color={COLORS.primary} style={styles.infoIcon} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoText}>{userProfile.address}</Text>
              </View>
            </View>
          </View>
          
          {userProfile.aboutMe && (
            <View style={styles.infoRow}>
              <View style={styles.infoRowWithIcon}>
                <Ionicons name="person" size={22} color={COLORS.primary} style={styles.infoIcon} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>About Me</Text>
                  <Text style={styles.infoText}>{userProfile.aboutMe}</Text>
                </View>
              </View>
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
        <Text style={styles.sectionTitle}>Payment Settings</Text>
        
        {checkingPaymentStatus ? (
          <View style={styles.loadingPaymentStatus}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingPaymentText}>Checking payment status...</Text>
          </View>
        ) : (
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentLabel}>Payment Method</Text>
                <Text style={styles.paymentStatus}>
                  {hasPaymentMethod ? 'Set up' : 'Not set up'}
                </Text>
              </View>
              <Button
                title={hasPaymentMethod ? "Update" : "Set Up"}
                onPress={() => navigation.navigate('PaymentMethod')}
                size="small"
                style={styles.paymentButton}
              />
            </View>
            
            <Text style={styles.paymentDescription}>
              {hasPaymentMethod ? 
                'Your payment method is set up and ready to use for jobs.' : 
                'Set up a payment method to pay for jobs.'}
            </Text>
            
            {userType === 'helper' && (
              <>
                <View style={[styles.paymentRow, {marginTop: 20}]}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Payment Account</Text>
                    <Text style={styles.paymentStatus}>
                      {hasConnectAccount ? 'Set up' : 'Not set up'}
                    </Text>
                  </View>
                  <Button
                    title={hasConnectAccount ? "Manage" : "Set Up"}
                    onPress={() => navigation.navigate('ConnectAccount')}
                    size="small"
                    style={styles.paymentButton}
                  />
                </View>
                
                <Text style={styles.paymentDescription}>
                  {hasConnectAccount ? 
                    'Your payment account is set up to receive payments for jobs.' : 
                    'Set up a payment account to receive payments for jobs.'}
                </Text>
              </>
            )}
          </View>
        )}
      </View>
      
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

          <View style={styles.section}>
    <Text style={styles.sectionTitle}>Developer Options</Text>
    
    <View style={styles.buttonContainer}>
      <Button 
        title="Firebase Debug Tools" 
        icon="bug-outline"
        onPress={() => navigation.navigate('FirebaseDebug')}
        style={styles.actionButton}
      />
    </View>
  </View>

        
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
  loadingPaymentStatus: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    ...SHADOWS.small,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingPaymentText: {
    ...FONTS.body,
    marginLeft: 10,
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
    marginBottom: 15,
    paddingVertical: 5,
  },
  infoRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    lineHeight: 22,
    flexWrap: 'wrap',
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
    flex: 1,
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
  // Payment-related styles
  paymentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    ...SHADOWS.small,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 5,
  },
  paymentStatus: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
  },
  paymentButton: {
    marginLeft: 10,
  },
  paymentDescription: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginTop: 5,
  },
});

export default ProfileScreen;