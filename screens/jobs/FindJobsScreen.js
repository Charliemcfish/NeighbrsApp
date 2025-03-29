// screens/jobs/FindJobsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image
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

const FindJobsScreen = ({ navigation, route }) => {
  const { initialTabName } = route.params || {};
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userJobTypes, setUserJobTypes] = useState([]);
  
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
  
  // Watch for changes to initialTabName (in case user navigates to this screen multiple times)
  useEffect(() => {
    if (initialTabName && ['available', 'current', 'completed'].includes(initialTabName)) {
      console.log('Updating tab to:', initialTabName);
      setActiveTab(initialTabName);
    }
  }, [initialTabName, route.params]);

  useEffect(() => {
    const getUserJobTypes = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.jobTypes) {
              setUserJobTypes(userData.jobTypes);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user job types:', error);
      }
    };

    getUserJobTypes();
    loadJobs();
  }, [activeTab]);

  const loadJobs = async () => {
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
        // Current jobs (jobs where this helper is assigned and status is accepted or in-progress)
        jobsQuery = query(
          collection(db, 'jobs'),
          where('helperAssigned', '==', user.uid),
          where('status', 'in', ['accepted', 'in-progress']),
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
      
      querySnapshot.forEach((doc) => {
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
      });

      // Add user information for each job
      const enhancedJobsList = await Promise.all(
        jobsList.map(async (job) => {
          try {
            const creatorDoc = await getDoc(doc(db, 'users', job.createdBy));
            if (creatorDoc.exists()) {
              const creatorData = creatorDoc.data();
              return {
                ...job,
                creatorName: creatorData.fullName || 'Unknown User',
                creatorImage: creatorData.profileImage || null
              };
            }
            return job;
          } catch (error) {
            console.error('Error getting job creator info:', error);
            return job;
          }
        })
      );

      setJobs(enhancedJobsList);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
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
      
      // If user has set job types, filter based on those
      const matchesJobTypes = userJobTypes.length === 0 || userJobTypes.includes(job.jobType);
      
      return matchesSearch && matchesJobTypes;
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
          <Text style={[styles.statusBadge, styles[`status${item.status}`]]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
        </View>
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
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'available' 
                  ? "Try adjusting your search or wait for new jobs to be posted."
                  : activeTab === 'current'
                    ? "You don't have any active jobs. Browse available jobs to find work."
                    : "You haven't completed any jobs yet."}
              </Text>
            </View>
          )}
        </>
      )}
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
    color: COLORS.textMedium,
  },
  emptySubText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
  },
});

export default FindJobsScreen;