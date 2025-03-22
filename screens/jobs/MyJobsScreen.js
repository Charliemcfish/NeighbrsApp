// screens/jobs/MyJobsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';

const MyJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // open, in-progress, completed

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      let statusFilter = [];
      if (filter === 'open') {
        statusFilter = ['open'];
      } else if (filter === 'in-progress') {
        statusFilter = ['accepted', 'in-progress'];
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'cancelled'];
      }

      const jobsQuery = query(
        collection(db, 'jobs'),
        where('createdBy', '==', user.uid),
        where('status', 'in', statusFilter),
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

  const renderJobItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.id })}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={[styles.statusBadge, styles[`status${item.status}`]]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
      
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
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'open' && styles.activeFilter]}
          onPress={() => setFilter('open')}
        >
          <Text style={[styles.filterText, filter === 'open' && styles.activeFilterText]}>
            Open
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'in-progress' && styles.activeFilter]}
          onPress={() => setFilter('in-progress')}
        >
          <Text style={[styles.filterText, filter === 'in-progress' && styles.activeFilterText]}>
            In Progress
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'completed' && styles.activeFilter]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      ) : (
        <>
          {jobs.length > 0 ? (
            <FlatList
              data={jobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubText}>
                {filter === 'open' ? 
                  "You don't have any open jobs. Post a new job to get started." :
                  filter === 'in-progress' ? 
                  "You don't have any jobs in progress." :
                  "You don't have any completed jobs yet."}
              </Text>
            </View>
          )}
          
          {filter === 'open' && (
            <TouchableOpacity 
              style={styles.fabButton}
              onPress={() => navigation.navigate('PostJob')}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
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
  filterContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeFilter: {
    borderBottomWidth: 2,
    borderBottomColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
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
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
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
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#4A90E2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default MyJobsScreen;