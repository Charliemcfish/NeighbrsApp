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
import { db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';

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

  useEffect(() => {
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

  // Filter helpers based on search query and selected job type
  const filteredHelpers = helpers.filter(helper => {
    const matchesSearch = searchQuery === '' || 
      (helper.fullName && helper.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesJobType = !filterApplied || !selectedJobType || 
      (helper.jobTypes && helper.jobTypes.includes(selectedJobType));
    
    return matchesSearch && matchesJobType;
  });

  const handleSelectJobType = (jobType) => {
    setSelectedJobType(jobType);
    setFilterApplied(true);
    setJobTypeModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedJobType('');
    setFilterApplied(false);
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
        
        <TouchableOpacity 
          style={styles.jobTypeFilterButton}
          onPress={() => setJobTypeModalVisible(true)}
        >
          <Text style={[
            styles.jobTypeFilterText,
            selectedJobType ? styles.activeFilterText : styles.placeholderText
          ]}>
            {selectedJobType || 'Filter by job type'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={selectedJobType ? COLORS.primary : '#666'} />
        </TouchableOpacity>
        
        {filterApplied && (
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetFilters}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
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
                  "Try a different job type or remove filters to see all helpers." : 
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
              <Text style={styles.modalTitle}>Select Job Type</Text>
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
                  setJobTypeModalVisible(false);
                  setFilterApplied(false);
                }}
                type="secondary"
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
  jobTypeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
    ...SHADOWS.small,
  },
  jobTypeFilterText: {
    ...FONTS.body,
    fontSize: 16,
  },
  activeFilterText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#999',
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
  modalFooter: {
    alignItems: 'center',
  },
  modalButton: {
    width: '100%',
  },
});

export default BrowseHelpersScreen;