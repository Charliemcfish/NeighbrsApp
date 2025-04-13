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

const GOOGLE_PLACES_API_KEY = 'AIzaSyBSsjSyuqr-psiiONPCmGVAfoVUBkldapQ'; // Replace with your actual API key

const AddressAutocomplete = ({ 
  value,
  onSelect,
  label,
  placeholder = "Enter an address",
  required = false,
  style,
  error,
}) => {
  const [address, setAddress] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Update address when value prop changes
    if (value !== address) {
      setAddress(value || '');
    }
  }, [value]);

  const getPredictions = async (text) => {
    setAddress(text);
    
    if (!text || text.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsLoading(true);
      setShowDropdown(true);
      
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text
        )}&key=${GOOGLE_PLACES_API_KEY}&types=address&components=country:uk`
      );
      
      if (response.data.predictions) {
        setPredictions(response.data.predictions);
      }
    } catch (error) {
      console.error('Error fetching address predictions:', error);
    } finally {
      setIsLoading(false);
    }
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
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={getPredictions}
          placeholder={placeholder}
          placeholderTextColor="#999999"
        />
        {isLoading && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
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
    zIndex: 1, // Ensure dropdown appears above other elements
  },
  label: {
    fontFamily: 'Barlow-Medium',
    fontSize: 16,
    marginBottom: 6,
    color: '#333333',
  },
  required: {
    color: '#FF0000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 30,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  loader: {
    marginRight: 15,
  },
  dropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 2,
  },
  predictionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  predictionText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#333333',
  },
  errorInput: {
    borderColor: '#FF0000',
  },
  errorText: {
    fontFamily: 'Montserrat-Regular',
    color: '#FF0000',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default AddressAutocomplete;