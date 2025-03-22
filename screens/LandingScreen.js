// screens/LandingScreen.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LandingScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/logo.png')} // You'll need to add a logo image to your assets folder
          style={styles.logo}
          resizeMode="contain"
        />

<Text style={styles.title}>
          Welcome to Neighbrs
        </Text>
        
        <Text style={styles.slogan}>
          When neighbors help each other, everyone wins
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logo: {
    width: 450,
    height: 450
    
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 50,
  },

  slogan: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 50,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    backgroundColor: '#4A90E2', // You can change this to match your brand color
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A90E2',
    fontSize: 16,
  },
});

export default LandingScreen;