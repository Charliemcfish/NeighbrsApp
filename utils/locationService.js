// utils/locationService.js
import axios from 'axios';

const GEOCODING_API_KEY = 'AIzaSyBSsjSyuqr-psiiONPCmGVAfoVUBkldapQ'; // Replace with your actual API key

export const geocodeAddress = async (address) => {
  if (!address || address.trim() === '') {
    throw new Error('Address cannot be empty');
  }
  
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GEOCODING_API_KEY}`
    );
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        coordinates: {
          latitude: location.lat,
          longitude: location.lng
        },
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    
    if (response.data.status === 'ZERO_RESULTS') {
      throw new Error('No address found for the given input. Please try a more specific address.');
    }
    
    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error('Geocoding request was denied. Please check your API key.');
    }
    
    throw new Error(`Geocoding failed: ${response.data.status}`);
  } catch (error) {
    console.error('Geocoding error:', error);
    
    // If error is from our throw statements above
    if (error.message.includes('Geocoding failed') || 
        error.message.includes('No address found') || 
        error.message.includes('Address cannot be empty') ||
        error.message.includes('Geocoding request was denied')) {
      throw error;
    }
    
    // General network or other error
    throw new Error('Unable to geocode address. Please check your internet connection and try again.');
  }
};

export const calculateDistance = (coords1, coords2) => {
  // If either coordinate is missing, return null
  if (!coords1 || !coords2 || !coords1.latitude || !coords2.latitude) {
    return null;
  }
  
  const R = 6371; // Earth's radius in km
  
  const lat1 = coords1.latitude * Math.PI / 180;
  const lat2 = coords2.latitude * Math.PI / 180;
  
  const latDiff = (coords2.latitude - coords1.latitude) * Math.PI / 180;
  const lngDiff = (coords2.longitude - coords1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(latDiff/2) * Math.sin(latDiff/2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(lngDiff/2) * Math.sin(lngDiff/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Distance in kilometers
  const distance = R * c;
  
  // Convert to miles
  const distanceMiles = distance * 0.621371;
  
  return {
    kilometers: distance,
    miles: distanceMiles
  };
};

// Get distance in a readable format with unit
export const getReadableDistance = (distance, unit = 'miles') => {
  if (!distance) return 'Distance unknown';
  
  const value = unit === 'miles' ? distance.miles : distance.kilometers;
  
  if (value < 0.1) {
    return `${Math.round(value * 1000)} ${unit === 'miles' ? 'yards' : 'meters'} away`;
  }
  
  return `${value.toFixed(1)} ${unit} away`;
};