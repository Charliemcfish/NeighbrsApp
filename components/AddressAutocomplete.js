// components/AddressAutocomplete.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import axios from 'axios';
import { COLORS, FONTS } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBSsjSyuqr-psiiONPCmGVAfoVUBkldapQ';

const AddressAutocomplete = ({ 
  value,
  onSelect,
  label,
  placeholder = "Enter a US address or ZIP code",
  required = false,
  style,
  error,
}) => {
  const [address, setAddress] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    if (value !== address) {
      setAddress(value || '');
    }
  }, [value]);

  const getPredictions = async (text) => {
    // Clear any existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    setAddress(text);
    
    // Ensure text is not empty and has at least 2 characters
    if (!text || text.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    // Set a new debounce timer
    const timer = setTimeout(async () => {
      try {
        setIsLoading(true);
        
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            text
          )}&key=${GOOGLE_PLACES_API_KEY}&types=address&components=country:us`
        );
        
        if (response.data.predictions && response.data.predictions.length > 0) {
          setPredictions(response.data.predictions);
          setShowDropdown(true);
        } else {
          // If no predictions, and input looks like a ZIP code, do a more specific search
          const zipCodeRegex = /^\d{5}(-\d{4})?$/;
          if (zipCodeRegex.test(text.replace(/\s/g, ''))) {
            const zipResponse = await axios.get(
              `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                text + ', US'
              )}&key=${GOOGLE_PLACES_API_KEY}&types=address&components=country:us`
            );
            
            if (zipResponse.data.predictions && zipResponse.data.predictions.length > 0) {
              setPredictions(zipResponse.data.predictions);
              setShowDropdown(true);
            } else {
              setPredictions([]);
              setShowDropdown(false);
            }
          } else {
            setPredictions([]);
            setShowDropdown(false);
          }
        }
      } catch (error) {
        console.error('Error fetching address predictions:', error);
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms delay to reduce API calls

    setDebounceTimer(timer);
  };

  const getPlaceDetails = async (placeId) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=formatted_address,geometry`
      );
      
      if (response.data.result) {
        const { formatted_address, geometry } = response.data.result;
        return {
          address: formatted_address,
          coordinates: {
            latitude: geometry.location.lat,
            longitude: geometry.location.lng
          }
        };
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
    return null;
  };

  const handleSelectAddress = async (prediction) => {
    setIsLoading(true);
    const placeDetails = await getPlaceDetails(prediction.place_id);
    setIsLoading(false);
    
    if (placeDetails) {
      setAddress(placeDetails.address);
      onSelect(placeDetails);
    }
    
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      
      <View style={[styles.inputContainer, error && styles.errorInput]}>
        <Ionicons 
          name="location-outline" 
          size={20} 
          color={error ? COLORS.error : COLORS.primary} 
          style={styles.locationIcon} 
        />
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={getPredictions}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
        />
        {isLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
        ) : (
          address.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setAddress('');
                setPredictions([]);
                setShowDropdown(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )
        )}
      </View>
      
      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handleSelectAddress(item)}
              >
                <Text style={styles.predictionText}>{item.description}</Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="always"
          />
        </View>
      )}
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
    zIndex: 1,
  },
  label: {
    ...FONTS.subheading,
    fontSize: 16,
    marginBottom: 6,
    color: COLORS.textDark,
  },
  required: {
    color: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 30,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  locationIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  loader: {
    marginLeft: 10,
  },
  clearButton: {
    marginLeft: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    maxHeight: 200,
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  predictionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  predictionText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  errorInput: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...FONTS.body,
    color: COLORS.error,
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  }
});

export default AddressAutocomplete;