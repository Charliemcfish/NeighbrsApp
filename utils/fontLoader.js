import * as Font from 'expo-font';

export const loadFonts = async () => {
  await Font.loadAsync({
    'Barlow-Regular': require('../assets/fonts/Barlow-Regular.ttf'),
    'Barlow-Medium': require('../assets/fonts/Barlow-Medium.ttf'),
    'Barlow-Bold': require('../assets/fonts/Barlow-Bold.ttf'),
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });
};