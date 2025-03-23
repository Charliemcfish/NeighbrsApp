// screens/jobs/FindJobsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  getDocs,  // Make sure this is imported
  query, 
  where, 
  orderBy, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

const FindJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userJobTypes, setUserJobTypes] = useState([]);
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'current', 'completed'
  
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

  // screens/jobs/FindJobsScreen.js
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

    setJobs(jobsList);
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
        job.jobType.toLowerCase().includes(searchQuery.toLowerCase());
      
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
      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.jobType}>{item.jobType}</Text>
      
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
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
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
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
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
    backgroundColor: '#f8f8f8',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    margin: 15,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  listContainer: {
    padding: 15,
    paddingTop: 5,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  jobType: {
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  jobDesc: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  dateInfo: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#666',
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default FindJobsScreen;