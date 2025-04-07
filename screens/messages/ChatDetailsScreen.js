// screens/messages/ChatDetailsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { COLORS, FONTS, SHADOWS } from '../../styles/theme';

const ChatDetailsScreen = ({ route, navigation }) => {
  const { chatId, otherUserId, jobId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  
  const flatListRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleShowDeleteOptions}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, currentChatId]);

  useEffect(() => {
    const setupChat = async () => {
      try {
        // Get current user's info
        if (user) {
          const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
          if (currentUserDoc.exists()) {
            setCurrentUser(currentUserDoc.data());
          }
        }
        
        // Get other user's info
        if (otherUserId) {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            setOtherUser(userDoc.data());
            navigation.setOptions({ title: userDoc.data().fullName });
          }
        }
        
        let chatDocRef;
        let messagesQuery;
        
        // If we already have a chat ID
        if (chatId) {
          chatDocRef = doc(db, 'chats', chatId);
          setCurrentChatId(chatId);
          
          // Mark the chat as read by the current user
          try {
            const chatSnapshot = await getDoc(chatDocRef);
            if (chatSnapshot.exists()) {
              const chatData = chatSnapshot.data();
              
              // If the current user is in the unreadBy array, remove them
              if (chatData.unreadBy && chatData.unreadBy.includes(user.uid)) {
                await updateDoc(chatDocRef, {
                  unreadBy: arrayRemove(user.uid)
                });
              }
            }
          } catch (error) {
            console.error('Error marking chat as read:', error);
          }
          
          // Check if chat exists and has job info
          const chatDoc = await getDoc(chatDocRef);
          if (chatDoc.exists() && chatDoc.data().jobId) {
            const jobDoc = await getDoc(doc(db, 'jobs', chatDoc.data().jobId));
            if (jobDoc.exists()) {
              setJobData({
                id: jobDoc.id,
                ...jobDoc.data()
              });
            }
          }
          
          messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('createdAt', 'asc')
          );
        } 
        // If we don't have a chat ID, we need to check if a chat exists between these users
        else if (otherUserId) {
          const chatsQuery = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
          );
          
          const querySnapshot = await getDocs(chatsQuery);
          let existingChat = null;
          
          querySnapshot.forEach((doc) => {
            const chatData = doc.data();
            if (chatData.participants.includes(otherUserId)) {
              if (jobId) {
                if (chatData.jobId === jobId) {
                  existingChat = {
                    id: doc.id,
                    ...chatData
                  };
                }
              } else if (!chatData.jobId) {
                existingChat = {
                  id: doc.id,
                  ...chatData
                };
              }
            }
          });
          
          // Use existing chat or create a new one
          if (existingChat) {
            chatDocRef = doc(db, 'chats', existingChat.id);
            setCurrentChatId(existingChat.id);
            
            // Mark the chat as read by the current user
            try {
              await updateDoc(chatDocRef, {
                unreadBy: arrayRemove(user.uid)
              });
            } catch (error) {
              console.error('Error marking existing chat as read:', error);
            }
            
            messagesQuery = query(
              collection(db, 'chats', existingChat.id, 'messages'),
              orderBy('createdAt', 'asc')
            );
            
            // If chat has job info, fetch job details
            if (existingChat.jobId) {
              const jobDoc = await getDoc(doc(db, 'jobs', existingChat.jobId));
              if (jobDoc.exists()) {
                setJobData({
                  id: jobDoc.id,
                  ...jobDoc.data()
                });
              }
            }
          } else {
            // Create a new chat
            const newChatData = {
              participants: [user.uid, otherUserId],
              createdAt: new Date(),
              updatedAt: new Date(),
              unreadBy: [] // Initialize with empty unreadBy array
            };
            
            // If this chat is associated with a job, include the jobId
            if (jobId) {
              newChatData.jobId = jobId;
              
              // Fetch job data
              const jobDoc = await getDoc(doc(db, 'jobs', jobId));
              if (jobDoc.exists()) {
                setJobData({
                  id: jobDoc.id,
                  ...jobDoc.data()
                });
              }
            }
            
            const newChatRef = await addDoc(collection(db, 'chats'), newChatData);
            setCurrentChatId(newChatRef.id);
            
            chatDocRef = newChatRef;
            messagesQuery = query(
              collection(db, 'chats', newChatRef.id, 'messages'),
              orderBy('createdAt', 'asc')
            );
          }
        }
        
        // Listen for messages
        const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
          const messagesList = [];
          
          querySnapshot.forEach((doc) => {
            const messageData = doc.data();
            messagesList.push({
              id: doc.id,
              ...messageData,
              createdAt: messageData.createdAt ? 
                (messageData.createdAt.toDate ? messageData.createdAt.toDate() : messageData.createdAt) 
                : new Date(),
            });
          });
          
          setMessages(messagesList);
          setLoading(false);
          
          // Scroll to bottom on new messages
          if (messagesList.length > 0 && flatListRef.current) {
            setTimeout(() => {
              flatListRef.current.scrollToEnd({ animated: false });
            }, 200);
          }
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up chat:', error);
        setLoading(false);
      }
    };
    
    setupChat();
  }, [chatId, otherUserId, jobId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    try {
      let localChatId = currentChatId;
      
      // If we don't have a chat ID but have otherUserId, find or create a chat
      if (!localChatId && otherUserId) {
        // Try to find an existing chat between these users
        const chatsQuerySnapshot = await getDocs(
          query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid)
          )
        );
        
        let existingChat = null;
        
        chatsQuerySnapshot.forEach((doc) => {
          const chatData = doc.data();
          if (chatData.participants.includes(otherUserId)) {
            if (jobId) {
              if (chatData.jobId === jobId) {
                existingChat = { id: doc.id, ...chatData };
              }
            } else if (!chatData.jobId) {
              existingChat = { id: doc.id, ...chatData };
            }
          }
        });
        
        if (existingChat) {
          localChatId = existingChat.id;
          setCurrentChatId(localChatId);
        } else {
          // Create a new chat
          const newChatData = {
            participants: [user.uid, otherUserId],
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessage: inputText.trim(),
            // Initialize with unread for the recipient
            unreadBy: [otherUserId]
          };
          
          if (jobId) {
            newChatData.jobId = jobId;
          }
          
          const newChatRef = await addDoc(collection(db, 'chats'), newChatData);
          localChatId = newChatRef.id;
          setCurrentChatId(localChatId);
        }
      }
  
      if (localChatId) {
        // Add the message
        await addDoc(collection(db, 'chats', localChatId, 'messages'), {
          text: inputText.trim(),
          senderId: user.uid,
          createdAt: new Date(),
        });
        
        // Update the chat's last message, timestamp, and unread status
        // Get current chat data to check the unreadBy array
        const chatDoc = await getDoc(doc(db, 'chats', localChatId));
        const chatData = chatDoc.exists() ? chatDoc.data() : {};
        
        // Get the other participant ID
        const otherParticipantId = chatData.participants?.find(id => id !== user.uid);
        
        // Simple direct approach: set unreadBy to include only the other user
        if (otherParticipantId) {
          await updateDoc(doc(db, 'chats', localChatId), {
            lastMessage: inputText.trim(),
            updatedAt: new Date(),
            unreadBy: [otherParticipantId]
          });
        } else {
          await updateDoc(doc(db, 'chats', localChatId), {
            lastMessage: inputText.trim(),
            updatedAt: new Date()
          });
        }
        
        setInputText('');
      } else {
        console.error('No chat ID available');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleShowDeleteOptions = () => {
    Alert.alert(
      'Chat Options',
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete Chat',
          style: 'destructive',
          onPress: confirmDeleteChat
        }
      ]
    );
  };

  const confirmDeleteChat = () => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this conversation? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteChat
        }
      ]
    );
  };

  const handleDeleteChat = async () => {
    try {
      if (!currentChatId) {
        throw new Error('No chat to delete');
      }

      // First, delete all messages in the chat
      const messagesQuery = query(collection(db, 'chats', currentChatId, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const messageDeletions = messagesSnapshot.docs.map(messageDoc => 
        deleteDoc(doc(db, 'chats', currentChatId, 'messages', messageDoc.id))
      );
      
      // Wait for all message deletions to complete
      await Promise.all(messageDeletions);
      
      // Then delete the chat document itself
      await deleteDoc(doc(db, 'chats', currentChatId));
      
      // Navigate back to the chat list
      navigation.navigate('ChatsList', { refresh: true });

    } catch (error) {
      console.error('Error deleting chat:', error);
      Alert.alert('Error', 'Failed to delete chat. Please try again.');
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === user.uid;
    const messageUser = isMyMessage ? currentUser : otherUser;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && (
          <View style={styles.messageAvatar}>
            {messageUser?.profileImage ? (
              <Image 
                source={{ uri: messageUser.profileImage }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {messageUser?.fullName ? messageUser.fullName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={styles.messageContent}>
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
          ]}>
            <Text style={[
              styles.messageText, 
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.text}
            </Text>
          </View>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        
        {isMyMessage && (
          <View style={styles.messageAvatar}>
            {messageUser?.profileImage ? (
              <Image 
                source={{ uri: messageUser.profileImage }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {messageUser?.fullName ? messageUser.fullName.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 125 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {otherUser?.fullName || 'Chat'}
        </Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleShowDeleteOptions}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      
      {jobData && (
        <TouchableOpacity 
          style={styles.jobBanner}
          onPress={() => navigation.navigate('Jobs', { 
            screen: 'JobDetails', 
            params: { jobId: jobData.id } 
          })}
        >
          <Text style={styles.jobBannerText}>
            Job: {jobData.title}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      ) : (
        <ImageBackground
          source={require('../../assets/logo.png')}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => 
              messages.length > 0 && flatListRef.current.scrollToEnd({ animated: false })
            }
          />
        </ImageBackground>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          autoComplete="off"
          textContentType="none"
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons 
            name="send" 
            size={24} 
            color={inputText.trim() ? COLORS.primary : "#ccc"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingTop: 50, // Increased for notch/speaker
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    ...FONTS.heading,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  jobBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e8fc',
    ...SHADOWS.small,
  },
  jobBannerText: {
    ...FONTS.bodyBold,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.05,
    resizeMode: 'contain',
  },
  messagesContainer: {
    padding: 10,
    paddingHorizontal: 5, // Reduced horizontal padding
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
    paddingHorizontal: 0, // Remove horizontal padding
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 36,
    height: 36,
    marginLeft: 2, // Reduced margin
    marginRight: 2, // Reduced margin
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    ...FONTS.bodyBold,
    fontSize: 16,
  },
  messageContent: {
    maxWidth: '70%',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    ...SHADOWS.small,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    ...FONTS.body,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.white,
  },
  otherMessageText: {
    color: COLORS.textDark,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 5,
    alignSelf: 'flex-end',
    ...FONTS.body,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white, // Changed from background to white
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    ...FONTS.body,
    color: COLORS.textDark,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  sendButton: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 25,
    ...SHADOWS.small,
  },
});

export default ChatDetailsScreen;