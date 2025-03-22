// screens/messages/ChatsListScreen.js
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
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ChatsListScreen = ({ navigation }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Query chats where the current user is a participant
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid),
          orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(chatsQuery, async (querySnapshot) => {
          const chatsList = [];
          
          for (const chatDoc of querySnapshot.docs) {
            const chatData = chatDoc.data();
            
            // Get the other participant's info
            const otherParticipantId = chatData.participants.find(id => id !== user.uid);
            let otherParticipantName = 'Unknown User';
            
            if (otherParticipantId) {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                otherParticipantName = userDoc.data().fullName;
              }
            }
            
            // Get job info if this chat is associated with a job
            let jobInfo = null;
            if (chatData.jobId) {
              const jobDoc = await getDoc(doc(db, 'jobs', chatData.jobId));
              if (jobDoc.exists()) {
                jobInfo = {
                  title: jobDoc.data().title,
                  status: jobDoc.data().status,
                };
              }
            }
            
            chatsList.push({
              id: chatDoc.id,
              ...chatData,
              otherParticipantName,
              jobInfo,
              updatedAt: chatData.updatedAt.toDate(),
              lastMessage: chatData.lastMessage || 'No messages yet',
            });
          }
          
          setChats(chatsList);
          setLoading(false);

          // screens/messages/ChatsListScreen.js (continued)
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading chats:', error);
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => navigation.navigate('ChatDetails', { 
        chatId: item.id,
        chatName: item.otherParticipantName,
        otherUserId: item.participants.find(id => id !== auth.currentUser.uid)
      })}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {item.otherParticipantName.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName}>{item.otherParticipantName}</Text>
          <Text style={styles.chatTime}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        
        {item.jobInfo && (
          <Text style={styles.jobTitle}>
            Re: {item.jobInfo.title}
          </Text>
        )}
        
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      ) : (
        <>
          {chats.length > 0 ? (
            <FlatList
              data={chats}
              renderItem={renderChatItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>
                Messages will appear here when you start chatting with helpers or neighbors
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 0,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  jobTitle: {
    fontSize: 14,
    color: '#4A90E2',
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
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

export default ChatsListScreen;