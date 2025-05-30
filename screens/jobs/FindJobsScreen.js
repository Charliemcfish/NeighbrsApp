import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  getDocs,
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import { calculateDistance, getReadableDistance } from '../../utils/locationService';

const FindJobsScreen = ({ navigation, route }) => {
  const { initialTabName } = route.params || {};
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userJobTypes, setUserJobTypes] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  
  // Filter states
  const [selectedJobTypes, setSelectedJobTypes] = useState([]);
  const [minPaymentAmount, setMinPaymentAmount] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState({
    fixed: true,
    tip: true,
    free: true
  });
  const [filtersApplied, setFiltersApplied] = useState(false);
  
  console.log('FindJobsScreen - initialTabName:', initialTabName);
  console.log('FindJobsScreen - route.params:', route.params);
  
  // Set active tab state - use 'available' as default if initialTabName is not provided
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTabName && ['available', 'current', 'completed'].includes(initialTabName)) {
      console.log('Setting initial tab to:', initialTabName);
      return initialTabName;
    }
    return 'available';
  });
  
  // Watch for changes to initialTabName and reset jobs state when tab changes
  useEffect(() => {
    if (initialTabName && ['available', 'current', 'completed'].includes(initialTabName)) {
      console.log('Updating tab to:', initialTabName);
      console.log('Previous tab was:', activeTab);
      
      // Reset jobs and loading state when switching tabs
      if (activeTab !== initialTabName) {
        setJobs([]);
        setLoading(true);
        setActiveTab(initialTabName);
      }
    }
  }, [initialTabName, route.params]);

  // Reset search and filters when tab changes
  useEffect(() => {
    console.log('Active tab changed to:', activeTab);
    // Reset search and filters when switching tabs
    setSearchQuery('');
    setFiltersApplied(false);
    setSelectedJobTypes([...userJobTypes]);
    setMinPaymentAmount('');
    setMaxDistance('');
    setPaymentTypeFilter({
      fixed: true,
      tip: true,
      free: true
    });
    
    // Load jobs for the new tab
    loadJobs();
  }, [activeTab]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Get user's job types for filtering
            if (userData.jobTypes) {
              setUserJobTypes(userData.jobTypes);
              // Initially set all user job types as selected
              setSelectedJobTypes([...userData.jobTypes]);
            }
            
            // Get user's location for distance calculation
            if (userData.location && userData.location.coordinates) {
              setUserLocation(userData.location.coordinates);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    loadUserData();
  }, []); // Only run once on component mount

  const loadJobs = async () => {
    console.log('Loading jobs for tab:', activeTab);
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      let jobsQuery;
      
      if (activeTab === 'available') {
        // Available jobs (open jobs that the helper hasn't been assigned to)
        jobsQuery = query(
          collection(db, 'jobs'),
          where('status', '==', 'open'),
          orderBy('createdAt', 'desc')
        );
      } else if (activeTab === 'current') {
        // Current jobs (jobs where this helper is assigned and status is accepted, in-progress, or completion-requested)
        jobsQuery = query(
          collection(db, 'jobs'),
          where('helperAssigned', '==', user.uid),
          where('status', 'in', ['accepted', 'in-progress', 'completion-requested']),
          orderBy('createdAt', 'desc')
        );
      } else if (activeTab === 'completed') {
        // Completed jobs (jobs where this helper is assigned and status is completed or cancelled)
        jobsQuery = query(
          collection(db, 'jobs'),
          where('helperAssigned', '==', user.uid),
          where('status', 'in', ['completed', 'cancelled']),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(jobsQuery);
      const jobsList = [];
      
      // Get all jobs
      for (const doc of querySnapshot.docs) {
        const jobData = doc.data();
        
        // Only add appropriate jobs to each tab
        if (activeTab === 'available') {
          // Skip jobs where the current user is already the assigned helper
          if (jobData.helperAssigned !== user.uid) {
            jobsList.push({
              id: doc.id,
              ...jobData,
              createdAt: jobData.createdAt.toDate(),
            });
          }
        } else {
          // For current and completed tabs, add all jobs from the query
          // (they're already filtered by the query conditions)
          jobsList.push({
            id: doc.id,
            ...jobData,
            createdAt: jobData.createdAt.toDate(),
          });
        }
      }

      // Enhance jobs with creator/helper info
      const enhancedJobsList = await Promise.all(
        jobsList.map(async (job) => {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', job.createdBy));
            let distance = null;
            
            // Calculate distance if both user and job have location coordinates
            if (userLocation && job.locationCoordinates) {
              distance = calculateDistance(userLocation, job.locationCoordinates);
            }
            
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data();
              return {
                ...job,
                creatorName: creatorData.fullName || 'Unknown User',
                creatorImage: creatorData.profileImage || null,
                distance: distance
              };
            }
            return {
              ...job,
              distance: distance
            };
          } catch (error) {
            console.error('Error getting job creator info:', error);
            return job;
          }
        })
      );

      console.log(`Loaded ${enhancedJobsList.length} jobs for ${activeTab} tab`);
      setJobs(enhancedJobsList);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const toggleJobTypeFilter = (jobType) => {
    setSelectedJobTypes(prev => {
      if (prev.includes(jobType)) {
        return prev.filter(type => type !== jobType);
      } else {
        return [...prev, jobType];
      }
    });
  };

  const togglePaymentTypeFilter = (type) => {
    setPaymentTypeFilter(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const applyFilters = () => {
    setFiltersApplied(true);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedJobTypes([...userJobTypes]);
    setMinPaymentAmount('');
    setMaxDistance('');
    setPaymentTypeFilter({
      fixed: true,
      tip: true,
      free: true
    });
    setFiltersApplied(false);
    setFilterModalVisible(false);
  };

  const filteredJobs = jobs.filter(job => {
    // Only apply search and job type filters for available jobs
    if (activeTab === 'available') {
      // Filter based on search query
      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.jobType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.location && job.location.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter based on selected job types
      const matchesJobTypes = !filtersApplied || 
        (selectedJobTypes.length === 0 || selectedJobTypes.includes(job.jobType));
      
      // Filter based on payment type
      const matchesPaymentType = !filtersApplied || 
        (paymentTypeFilter[job.paymentType] || false);
      
      // Filter based on min payment amount (only for fixed payment type)
      const matchesMinPayment = !filtersApplied || 
        !minPaymentAmount || 
        (job.paymentType !== 'fixed') || 
        (job.paymentAmount >= parseFloat(minPaymentAmount || 0));
      
      // Filter based on maximum distance
      const matchesDistance = !filtersApplied || 
        !maxDistance || 
        !job.distance || 
        job.distance.miles <= parseFloat(maxDistance);
      
      return matchesSearch && matchesJobTypes && matchesPaymentType && matchesMinPayment && matchesDistance;
    }
    
    // For current and completed tabs, show all jobs without filtering
    return true;
  });

  const renderJobItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
    >
      <View style={styles.jobCardHeader}>
        {item.creatorImage ? (
          <Image source={{ uri: item.creatorImage }} style={styles.creatorImage} />
        ) : (
          <View style={styles.creatorImagePlaceholder}>
            <Text style={styles.creatorImagePlaceholderText}>
              {item.creatorName ? item.creatorName.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        )}
        <View style={styles.jobCardHeaderText}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCreator}>{item.creatorName}</Text>
          {item.distance && (
            <Text style={styles.distanceText}>
              {getReadableDistance(item.distance)}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.jobInfoRow}>
        <View style={styles.jobInfoItem}>
          <Ionicons name="briefcase-outline" size={18} color={COLORS.primary} />
          <Text style={styles.jobType}>{item.jobType}</Text>
        </View>
        
        {item.location && (
          <View style={styles.jobInfoItem}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.jobLocation}>{item.location}</Text>
          </View>
        )}
      </View>
      
      <Text 
        style={styles.jobDesc}
        numberOfLines={2}
      >
        {item.description}
      </Text>
      
      <View style={styles.jobFooter}>
        <Text style={styles.paymentInfo}>
          {item.paymentType === 'fixed' ? 
            `$${item.paymentAmount.toFixed(2)}` : 
            item.paymentType === 'tip' ? 
              'Tip Only' : 'No Payment'}
        </Text>
        
        <Text style={styles.dateInfo}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      {activeTab !== 'available' && (
        <View style={styles.statusContainer}>
          <Text style={[styles.statusBadge, styles[`status${item.status.replace('-', '')}`]]}>
            {item.status === 'completion-requested' ? 'Completion Requested' : 
             item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Jobs</Text>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Current
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Search box - only show for available jobs */}
      {activeTab === 'available' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.primary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoComplete="off"
            textContentType="none"
          />
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterModalVisible(true)}
          >
            <Ionicons 
              name="options" 
              size={22} 
              color={filtersApplied ? COLORS.primary : '#666'} 
            />
            {filtersApplied && (
              <View style={styles.filterActiveDot} />
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* Add jobs count display */}
      {activeTab === 'available' && (
        <Text style={styles.resultCountText}>
          {filteredJobs.length} Job{filteredJobs.length !== 1 ? 's' : ''} Found
        </Text>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          {filteredJobs.length > 0 ? (
            <FlatList
              data={filteredJobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              refreshing={loading}
              onRefresh={loadJobs}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#000" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'available' 
                  ? "Try adjusting your search or filters, or wait for new jobs to be posted."
                  : activeTab === 'current'
                    ? "You don't have any active jobs. Browse available jobs to find work."
                    : "You haven't completed any jobs yet."}
              </Text>
              {filtersApplied && activeTab === 'available' && (
                <Button
                  title="Reset Filters"
                  onPress={resetFilters}
                  style={styles.resetButton}
                  size="medium"
                />
              )}
            </View>
          )}
        </>
      )}

      {/* Filter Modal - Same as before */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Jobs</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Job Types Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Job Types</Text>
                {userJobTypes.length > 0 ? (
                  <View style={styles.jobTypesContainer}>
                    {userJobTypes.map((jobType) => (
                      <TouchableOpacity
                        key={jobType}
                        style={[
                          styles.jobTypeButton,
                          selectedJobTypes.includes(jobType) && styles.selectedJobType
                        ]}
                        onPress={() => toggleJobTypeFilter(jobType)}
                      >
                        <Text 
                          style={[
                            styles.jobTypeButtonText,
                            selectedJobTypes.includes(jobType) && styles.selectedJobTypeText
                          ]}
                        >
                          {jobType}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noJobTypesText}>
                    You haven't set up your job types yet. Go to Profile to select the types of jobs you want to offer.
                  </Text>
                )}
              </View>

              {/* Payment Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Payment Type</Text>
                <View style={styles.paymentTypesContainer}>
                  <View style={styles.paymentTypeRow}>
                    <Text style={styles.paymentTypeLabel}>Fixed Amount</Text>
                    <Switch
                      value={paymentTypeFilter.fixed}
                      onValueChange={() => togglePaymentTypeFilter('fixed')}
                      trackColor={{ false: "#ccc", true: COLORS.primary }}
                      thumbColor={paymentTypeFilter.fixed ? "#fff" : "#f4f3f4"}
                    />
                  </View>
                  <View style={styles.paymentTypeRow}>
                    <Text style={styles.paymentTypeLabel}>Tip Only</Text>
                    <Switch
                      value={paymentTypeFilter.tip}
                      onValueChange={() => togglePaymentTypeFilter('tip')}
                      trackColor={{ false: "#ccc", true: COLORS.primary }}
                      thumbColor={paymentTypeFilter.tip ? "#fff" : "#f4f3f4"}
                    />
                  </View>
                  <View style={styles.paymentTypeRow}>
                    <Text style={styles.paymentTypeLabel}>No Payment</Text>
                    <Switch
                      value={paymentTypeFilter.free}
                      onValueChange={() => togglePaymentTypeFilter('free')}
                      trackColor={{ false: "#ccc", true: COLORS.primary }}
                      thumbColor={paymentTypeFilter.free ? "#fff" : "#f4f3f4"}
                    />
                  </View>
                </View>
              </View>

              {/* Min Payment Amount Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Minimum Payment Amount</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={minPaymentAmount}
                  onChangeText={setMinPaymentAmount}
                  placeholder="Enter minimum amount ($)"
                  keyboardType="numeric"
                />
                <Text style={styles.filterNote}>
                  Only applies to jobs with fixed payment amounts
                </Text>
              </View>
              
              {/* Distance Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Maximum Distance (miles)</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={maxDistance}
                  onChangeText={setMaxDistance}
                  placeholder="Enter maximum distance"
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
                    <Text style={styles.distancePresets}>50 mi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Reset"
                onPress={resetFilters}
                type="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Apply Filters"
                onPress={applyFilters}
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
  resultCountText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingTop: 45,
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    margin: 15,
    padding: 5,
    ...SHADOWS.small,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 25,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
  },
  activeTabText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    margin: 15,
    marginTop: 5,
    paddingHorizontal: 15,
    height: 50,
    ...SHADOWS.small,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    ...FONTS.body,
    color: COLORS.textDark,
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  listContainer: {
    padding: 15,
    paddingTop: 5,
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  jobCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  creatorImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  creatorImagePlaceholderText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontWeight: 'bold',
    fontSize: 18,
  },
  jobCardHeaderText: {
    flex: 1,
  },
  jobTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    color: COLORS.textDark,
  },
  jobCreator: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
  },
  distanceText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginTop: 2,
  },
  jobInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  jobInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  jobType: {
    ...FONTS.body,
    color: COLORS.textMedium,
    fontSize: 14,
    marginLeft: 5,
  },
  jobLocation: {
    ...FONTS.body,
    color: COLORS.textMedium,
    fontSize: 14,
    marginLeft: 5,
  },
  jobDesc: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 15,
    lineHeight: 22,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    ...FONTS.bodyBold,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  dateInfo: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.textLight,
  },
  statusContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 14,
    ...FONTS.bodyBold,
    fontWeight: 'bold',
  },
  statusopen: {
    backgroundColor: '#e3f2fd',
    color: '#2196f3',
  },
  statusaccepted: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  'statusin-progress': {
    backgroundColor: '#fff8e1',
    color: '#ffc107',
  },
  statuscompleted: {
    backgroundColor: '#e8f5e9',
    color: '#4caf50',
  },
  statuscancelled: {
    backgroundColor: '#ffebee',
    color: '#f44336',
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
    fontSize: 18,
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
    paddingHorizontal: 20,
  },
  resetButton: {
    marginTop: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    ...FONTS.heading,
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    marginVertical: 10,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    marginBottom: 10,
    color: COLORS.textDark,
  },
  jobTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  jobTypeButton: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 5,
  },
  selectedJobType: {
    backgroundColor: COLORS.primary,
  },
  jobTypeButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
  },
  selectedJobTypeText: {
    color: COLORS.white,
  },
  noJobTypesText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textMedium,
    fontStyle: 'italic',
  },
  paymentTypesContainer: {
    marginVertical: 10,
  },
  paymentTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentTypeLabel: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
  },
  paymentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    ...FONTS.body,
    fontSize: 16,
  },
  filterNote: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.textMedium,
    marginTop: 5,
    fontStyle: 'italic',
  },
  locationWarning: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.warning,
    fontStyle: 'italic',
    marginTop: 5,
    marginBottom: 10,
  },
  distancePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
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
    marginTop: 10,
  },
  modalButton: {
    flex: 0.48,
  },
  'statuscompletion-requested': {
  backgroundColor: '#e8f5e9',
  color: '#4caf50',
},
});

export default FindJobsScreen;