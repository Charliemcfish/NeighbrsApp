// screens/helpers/BrowseHelpersScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Image,
  ScrollView,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc 
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import { calculateDistance, getReadableDistance } from '../../utils/locationService';

// Default job types - same as in PostJobScreen
const DEFAULT_JOB_TYPES = [
  'Package Delivery', 
  'Car Buying Assistance', 
  'Running Errands',
  // Add more job types as needed
];

const BrowseHelpersScreen = ({ navigation }) => {
  const [helpers, setHelpers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false);
  const [filterApplied, setFilterApplied] = useState(false);
  const [maxDistance, setMaxDistance] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const user = auth.currentUser;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists() && userDoc.data().location && userDoc.data().location.coordinates) {
          setUserLocation(userDoc.data().location.coordinates);
        }
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };
    
    getUserLocation();
    loadHelpers();
  }, []);

  const loadHelpers = async () => {
    setLoading(true);
    try {
      // Query all users who are helpers
      const helpersQuery = query(
        collection(db, 'users'),
        where('isHelper', '==', true)
      );

      const querySnapshot = await getDocs(helpersQuery);
      const helpersList = [];

      querySnapshot.forEach((doc) => {
        const helperData = doc.data();
        // Add the document ID to the helper data
        helpersList.push({
          id: doc.id,
          ...helperData
        });
      });

      setHelpers(helpersList);
    } catch (error) {
      console.error('Error loading helpers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate distances for all helpers
  const helpersWithDistance = React.useMemo(() => {
    if (!userLocation) return helpers;
    
    return helpers.map(helper => {
      if (helper.location && helper.location.coordinates) {
        const distance = calculateDistance(userLocation, helper.location.coordinates);
        return {
          ...helper,
          distance
        };
      }
      return {
        ...helper,
        distance: null
      };
    });
  }, [helpers, userLocation]);

  // Filter helpers based on search query, selected job type, and distance
  const filteredHelpers = helpersWithDistance.filter(helper => {
    const matchesSearch = searchQuery === '' || 
      (helper.fullName && helper.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesJobType = !filterApplied || !selectedJobType || 
      (helper.jobTypes && helper.jobTypes.includes(selectedJobType));
    
    const matchesDistance = !filterApplied || !maxDistance || !helper.distance || 
      helper.distance.miles <= parseFloat(maxDistance);
    
    return matchesSearch && matchesJobType && matchesDistance;
  });

  const handleSelectJobType = (jobType) => {
    setSelectedJobType(jobType);
    setFilterApplied(true);
    setJobTypeModalVisible(false);
  };

  const handleSetMaxDistance = () => {
    setFilterApplied(true);
    setDistanceModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedJobType('');
    setMaxDistance('');
    setFilterApplied(false);
    setJobTypeModalVisible(false);
    setDistanceModalVisible(false);
  };

  const navigateToHelperProfile = (helperId) => {
    navigation.navigate('HelperProfile', { helperId });
  };

  const renderHelperItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.helperCard}
      onPress={() => navigateToHelperProfile(item.id)}
    >
      <View style={styles.helperHeader}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImagePlaceholderText}>
              {item.fullName ? item.fullName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.helperInfo}>
          <Text style={styles.helperName}>{item.fullName || 'Anonymous Helper'}</Text>
          <Text style={styles.helperLocation}>{item.address || 'Location unknown'}</Text>
          {item.distance && (
            <Text style={styles.distanceText}>
              {getReadableDistance(item.distance)}
            </Text>
          )}
        </View>
      </View>
      
      {item.jobTypes && item.jobTypes.length > 0 && (
        <View style={styles.jobTypesContainer}>
          <Text style={styles.sectionTitle}>Services Offered:</Text>
          <View style={styles.jobTypesList}>
            {item.jobTypes.map((jobType, index) => (
              <View key={index} style={styles.jobTypeTag}>
                <Text style={styles.jobTypeText}>{jobType}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      {item.aboutMe && (
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText} numberOfLines={2}>
            {item.aboutMe}
          </Text>
        </View>
      )}
      
      <View style={styles.cardFooter}>
        <Button 
          title="View Profile" 
          onPress={() => navigateToHelperProfile(item.id)}
          size="small"
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Helpers</Text>
        <View style={{ width: 40 }} /> {/* Empty view for spacing */}
      </View>
      
      <View style={styles.searchFiltersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search helpers by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.filtersRow}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setJobTypeModalVisible(true)}
          >
            <Text style={styles.filterButtonText}>
              {selectedJobType ? `Service: ${selectedJobType}` : 'Filter by service'}
            </Text>
            <Ionicons name="options-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setDistanceModalVisible(true)}
          >
            <Text style={styles.filterButtonText}>
              {maxDistance ? `Distance: ${maxDistance} mi` : 'Distance'}
            </Text>
            <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        {filterApplied && (
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
            <Ionicons name="close-circle" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          {filteredHelpers.length > 0 ? (
            <FlatList
              data={filteredHelpers}
              renderItem={renderHelperItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              refreshing={loading}
              onRefresh={loadHelpers}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={64} color="#000" />
              <Text style={styles.emptyText}>No helpers found</Text>
              <Text style={styles.emptySubText}>
                {filterApplied ? 
                  "Try adjusting your filters to see more helpers." : 
                  "There are no helpers available at the moment."}
              </Text>
              {filterApplied && (
                <Button
                  title="Reset Filters"
                  onPress={resetFilters}
                  style={styles.emptyResetButton}
                  size="medium"
                />
              )}
            </View>
          )}
        </>
      )}
      
      {/* Job Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={jobTypeModalVisible}
        onRequestClose={() => setJobTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Service Type</Text>
              <TouchableOpacity onPress={() => setJobTypeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {DEFAULT_JOB_TYPES.map((jobType) => (
                <TouchableOpacity
                  key={jobType}
                  style={[
                    styles.jobTypeOption,
                    selectedJobType === jobType && styles.selectedJobTypeOption
                  ]}
                  onPress={() => handleSelectJobType(jobType)}
                >
                  <Text 
                    style={[
                      styles.jobTypeOptionText,
                      selectedJobType === jobType && styles.selectedJobTypeOptionText
                    ]}
                  >
                    {jobType}
                  </Text>
                  {selectedJobType === jobType && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Clear Selection"
                onPress={() => {
                  setSelectedJobType('');
                  setFilterApplied(false);
                  setJobTypeModalVisible(false);
                }}
                type="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Distance Filter Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={distanceModalVisible}
        onRequestClose={() => setDistanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Maximum Distance</Text>
              <TouchableOpacity onPress={() => setDistanceModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.distanceFilterContainer}>
              <Text style={styles.distanceLabel}>Maximum distance (miles):</Text>
              <TextInput
                style={styles.distanceInput}
                value={maxDistance}
                onChangeText={setMaxDistance}
                placeholder="Enter distance"
                keyboardType="numeric"
              />
              
              {!userLocation && (
                <Text style={styles.locationWarning}>
                  Note: You need to set your address in your profile for accurate distance calculations.
                </Text>
              )}
              
              <View style={styles.distancePresets}>
                <TouchableOpacity
                  style={styles.distancePresetButton}
                  onPress={() => setMaxDistance('5')}
                >
                  <Text style={styles.distancePresetText}>5 mi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.distancePresetButton}
                  onPress={() => setMaxDistance('10')}
                >
                  <Text style={styles.distancePresetText}>10 mi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.distancePresetButton}
                  onPress={() => setMaxDistance('25')}
                >
                  <Text style={styles.distancePresetText}>25 mi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.distancePresetButton}
                  onPress={() => setMaxDistance('50')}
                >
                  <Text style={styles.distancePresetText}>50 mi</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <Button
                title="Clear"
                onPress={() => {
                  setMaxDistance('');
                  setDistanceModalVisible(false);
                }}
                type="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Apply"
                onPress={handleSetMaxDistance}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  searchFiltersContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 0.48,
    ...SHADOWS.small,
  },
  filterButtonText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    marginRight: 5,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    marginRight: 5,
  },
  listContainer: {
    padding: 15,
  },
  helperCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  helperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  profileImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileImagePlaceholderText: {
    ...FONTS.heading,
    fontSize: 24,
    color: COLORS.white,
  },
  helperInfo: {
    flex: 1,
  },
  helperName: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 5,
  },
  helperLocation: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  distanceText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  jobTypesContainer: {
    marginBottom: 15,
  },
  sectionTitle: {
    ...FONTS.bodyBold,
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  jobTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobTypeTag: {
    backgroundColor: '#f0f7ff',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    marginBottom: 8,
  },
  jobTypeText: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.primary,
  },
  aboutContainer: {
    marginBottom: 15,
  },
  aboutText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    ...FONTS.subheading,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    color: COLORS.black,
  },
  emptySubText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyResetButton: {
    marginTop: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  modalScroll: {
    marginBottom: 20,
  },
  jobTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedJobTypeOption: {
    backgroundColor: '#f0f7ff',
  },
  jobTypeOptionText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  selectedJobTypeOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  distanceFilterContainer: {
    padding: 10,
  },
  distanceLabel: {
    ...FONTS.body,
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  distanceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    ...FONTS.body,
    fontSize: 16,
  },
  locationWarning: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.warning,
    fontStyle: 'italic',
    marginBottom: 15,
  },
  distancePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  distancePresetButton: {
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  distancePresetText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
});

export default BrowseHelpersScreen;