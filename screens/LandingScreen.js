// screens/LandingScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import { COLORS, FONTS } from '../styles/theme';

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.titleContainer}>
          <Text style={styles.welcomeText}>
            Welcome to
          </Text>
          <Text style={styles.titleText}>
            Neighbrs
          </Text>
        </View>
        
        <Text style={styles.slogan}>
          When neighbors help each other, everyone wins
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button 
            title="Sign Up" 
            onPress={() => navigation.navigate('SignUp')}
            size="large"
            style={styles.button}
          />
          
          <Button 
            title="Login" 
            onPress={() => navigation.navigate('Login')}
            type="secondary"
            size="large"
            style={styles.button}
          />
          
          <TouchableOpacity 
            style={styles.learnMoreContainer}
            onPress={() => {/* Handle Learn More */}}
          >
            <Text style={styles.learnMoreText}>
              Learn how to use Neighbrs
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 300,
    height: 300,
    marginTop: -50,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeText: {
    ...FONTS.subheading,
    fontSize: 24,
    color: COLORS.textDark,
    textAlign: 'center',
  },
  titleText: {
    ...FONTS.heading,
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
  },
  slogan: {
    ...FONTS.subheading,
    fontSize: 22,
    textAlign: 'center',
    color: COLORS.textDark,
    marginBottom: 50,
    lineHeight: 30,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 15,
  },
  learnMoreContainer: {
    marginTop: 20,
  },
  learnMoreText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    textDecorationLine: 'underline',
  },
});

export default LandingScreen;