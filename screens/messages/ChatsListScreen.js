// screens/messages/ChatsListScreen.js
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
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  limit,
  updateDoc,
  arrayRemove
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';

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
          where('participants', 'array-contains', user.uid)
        );

        // Use onSnapshot for real-time updates
        const unsubscribe = onSnapshot(chatsQuery, async (querySnapshot) => {
          const chatsList = [];
          
          // Process each chat document
          for (const chatDoc of querySnapshot.docs) {
            const chatData = chatDoc.data();
            
            // Skip chats without participants
            if (!chatData.participants) {
              continue;
            }
            
            // Get the other participant's info
            const otherParticipantId = chatData.participants.find(id => id !== user.uid);
            let otherParticipantName = 'Unknown User';
            let otherParticipantImage = null;
            
            if (otherParticipantId) {
              const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                otherParticipantName = userData.fullName;
                // Also get the profile image
                otherParticipantImage = userData.profileImage || null;
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
            
            // Get the most recent message
            let lastMessage = 'No messages yet';
            try {
              const messagesQuery = query(
                collection(db, 'chats', chatDoc.id, 'messages'),
                orderBy('createdAt', 'desc'),
                limit(1)
              );
              
              const messagesSnapshot = await getDocs(messagesQuery);
              
              if (!messagesSnapshot.empty) {
                const messageData = messagesSnapshot.docs[0].data();
                lastMessage = messageData.text || 'No text';
              }
            } catch (error) {
              console.error('Error fetching messages:', error);
              // Continue with default lastMessage value
            }
            
            // Check if there are unread messages
            const hasUnread = chatData.unreadBy && chatData.unreadBy.includes(user.uid);
            
            const chatObject = {
              id: chatDoc.id,
              ...chatData,
              otherParticipantName,
              otherParticipantImage,
              jobInfo,
              updatedAt: chatData.updatedAt ? 
                (chatData.updatedAt.toDate ? chatData.updatedAt.toDate() : chatData.updatedAt) 
                : new Date(),
              lastMessage: chatData.lastMessage || lastMessage,
              hasUnread
            };
            
            chatsList.push(chatObject);
          }
          
          // Sort chats by most recent first
          chatsList.sort((a, b) => b.updatedAt - a.updatedAt);
          
          setChats(chatsList);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading chats:', error);
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const handleOpenChat = async (chat) => {
    // Mark the chat as read when opened
    if (chat.hasUnread) {
      try {
        await updateDoc(doc(db, 'chats', chat.id), {
          unreadBy: arrayRemove(auth.currentUser.uid)
        });
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    }
    
    // Navigate to the chat
    navigation.navigate('ChatDetails', { 
      chatId: chat.id,
      chatName: chat.otherParticipantName,
      otherUserId: chat.participants.find(id => id !== auth.currentUser.uid),
      jobId: chat.jobId
    });
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.chatItem, item.hasUnread && styles.unreadChatItem]}
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.otherParticipantImage ? (
          <Image 
            source={{ uri: item.otherParticipantImage }} 
            style={styles.avatarImage} 
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {item.otherParticipantName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {item.hasUnread && <View style={styles.unreadDot} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.chatName, item.hasUnread && styles.unreadText]}>
            {item.otherParticipantName}
          </Text>
          <Text style={styles.chatTime}>
            {item.updatedAt.toLocaleDateString()}
          </Text>
        </View>
        
        {item.jobInfo && (
          <Text style={styles.jobTitle}>
            Re: {item.jobInfo.title}
          </Text>
        )}
        
        <Text 
          style={[styles.lastMessage, item.hasUnread && styles.unreadText]} 
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
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
              <Ionicons name="chatbubbles-outline" size={80} color="#000" />
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 10,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    marginBottom: 10,
    ...SHADOWS.small,
  },
  unreadChatItem: {
    backgroundColor: '#f0f7ff', // Light blue background for unread chats
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  avatarContainer: {
    marginRight: 15,
    position: 'relative', // For positioning the unread dot
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...FONTS.heading,
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'red',
    borderWidth: 2,
    borderColor: 'white',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  chatName: {
    ...FONTS.subheading,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  unreadText: {
    ...FONTS.bodyBold,
    fontWeight: 'bold',
    color: COLORS.textDark, // Darker text for unread messages
  },
  chatTime: {
    ...FONTS.body,
    fontSize: 12,
    color: COLORS.textLight,
  },
  jobTitle: {
    ...FONTS.body,
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 5,
  },
  lastMessage: {
    ...FONTS.body,
    fontSize: 16,
    color: COLORS.textMedium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    ...FONTS.subheading,
    fontSize: 22,
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
    paddingHorizontal: 20,
  },
});

export default ChatsListScreen;