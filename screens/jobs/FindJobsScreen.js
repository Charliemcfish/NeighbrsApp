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
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const FindJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userJobTypes, setUserJobTypes] = useState([]);
  
  useEffect(() => {
    const getUserJobTypes = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {

            // screens/jobs/FindJobsScreen.js (continued)
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
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    try {
      // We'll only show jobs that are 'open' for helpers to find
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'open'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(jobsQuery);
      const jobsList = [];
      
      querySnapshot.forEach((doc) => {
        jobsList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        });
      });

      setJobs(jobsList);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    // Filter based on search query
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobType.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If user has set job types, filter based on those
    const matchesJobTypes = userJobTypes.length === 0 || userJobTypes.includes(job.jobType);
    
    return matchesSearch && matchesJobTypes;
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
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
                Try adjusting your search or wait for new jobs to be posted.
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