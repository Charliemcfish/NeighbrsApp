// screens/jobs/MyJobsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';
import Button from '../../components/Button';
import { calculateDistance, getReadableDistance } from '../../utils/locationService';

const MyJobsScreen = ({ navigation }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open'); // open, in-progress, completed
  const [userLocation, setUserLocation] = useState(null);

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
      
      // Get all jobs
      for (const doc of querySnapshot.docs) {
        jobsList.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate(),
        });
      }

      // For each job, get helper data if assigned
      const enhancedJobsList = await Promise.all(
        jobsList.map(async (job) => {
          // Add helper info if assigned
          let helperData = null;
          if (job.helperAssigned) {
            try {
              const helperDoc = await getDoc(doc(db, 'users', job.helperAssigned));
              if (helperDoc.exists()) {
                helperData = helperDoc.data();
              }
            } catch (error) {
              console.error('Error getting helper info:', error);
            }
          }
          
          // Calculate distance if job has coordinates and user has location
          let distance = null;
          if (userLocation && job.locationCoordinates) {
            distance = calculateDistance(userLocation, job.locationCoordinates);
          }
          
          return {
            ...job,
            helperName: helperData?.fullName,
            helperImage: helperData?.profileImage,
            distance: distance
          };
        })
      );

      setJobs(enhancedJobsList);
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
        <View style={styles.titleContainer}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={[styles.statusBadge, styles[`status${item.status}`]]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
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
      
      {item.distance && (
        <View style={styles.distanceContainer}>
          <Ionicons name="navigate" size={18} color={COLORS.primary} />
          <Text style={styles.distanceText}>
            {getReadableDistance(item.distance)}
          </Text>
        </View>
      )}
      
      <Text 
        style={styles.jobDesc}
        numberOfLines={2}
      >
        {item.description}
      </Text>
      
      {/* If there's a helper assigned, show their info */}
      {item.helperAssigned && (
        <View style={styles.helperContainer}>
          <Text style={styles.helperLabel}>Helper:</Text>
          <View style={styles.helperInfo}>
            {item.helperImage ? (
              <Image source={{ uri: item.helperImage }} style={styles.helperImage} />
            ) : (
              <View style={styles.helperImagePlaceholder}>
                <Text style={styles.helperImageText}>
                  {item.helperName ? item.helperName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <Text style={styles.helperName}>{item.helperName || 'Unknown Helper'}</Text>
          </View>
        </View>
      )}
      
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </View>
      
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
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <>
          {jobs.length > 0 ? (
            <FlatList
              data={jobs}
              renderItem={renderJobItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              refreshing={loading}
              onRefresh={loadJobs}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#000" />
              <Text style={styles.emptyText}>No jobs found</Text>
              <Text style={styles.emptySubText}>
                {filter === 'open' ? 
                  "You don't have any open jobs. Post a new job to get started." :
                  filter === 'in-progress' ? 
                  "You don't have any jobs in progress." :
                  "You don't have any completed jobs yet."}
              </Text>
              
              {filter === 'open' && (
                <Button
                  title="Post a New Job"
                  onPress={() => navigation.navigate('PostJob')}
                  style={styles.emptyButton}
                  size="large"
                />
              )}
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
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    margin: 15,
    padding: 5,
    ...SHADOWS.small,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 25,
  },
  activeFilter: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.textDark,
  },
  activeFilterText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80, // Extra padding for FAB
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    ...SHADOWS.small,
  },
  jobHeader: {
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobTitle: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: COLORS.textDark,
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 14,
    ...FONTS.bodyBold,
    fontWeight: 'bold',
    marginLeft: 10,
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
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  distanceText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  jobDesc: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 15,
    lineHeight: 22,
  },
  helperContainer: {
    marginTop: 5,
    marginBottom: 10,
    backgroundColor: COLORS.white, // Changed from background to white
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  helperLabel: {
    ...FONTS.bodyBold,
    color: COLORS.textDark,
    fontSize: 14,
    marginBottom: 5,
  },
  helperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helperImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  helperImagePlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  helperImageText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontSize: 14,
  },
  helperName: {
    ...FONTS.body,
    color: COLORS.textDark,
    fontSize: 14,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
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
    color: COLORS.black, // Changed from textDark to black
  },
  emptySubText: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.black, // Changed from textMedium to black
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  emptyButton: {
    marginTop: 20,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
});

export default MyJobsScreen;