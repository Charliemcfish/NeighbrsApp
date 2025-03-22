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
  ActivityIndicator
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
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../../firebase';

const ChatDetailsScreen = ({ route, navigation }) => {
  const { chatId, otherUserId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [jobData, setJobData] = useState(null);
  
  const flatListRef = useRef(null);
  const user = auth.currentUser;

  useEffect(() => {
    const setupChat = async () => {
      try {
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
              existingChat = {
                id: doc.id,
                ...chatData
              };
            }
          });
          
          // Use existing chat or create a new one
          if (existingChat) {
            chatDocRef = doc(db, 'chats', existingChat.id);
            messagesQuery = query(
              collection(db, 'chats', existingChat.id, 'messages'),
              orderBy('createdAt', 'asc')
            );
          } else {
            // Create a new chat
            const newChatRef = await addDoc(collection(db, 'chats'), {
              participants: [user.uid, otherUserId],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            
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
              createdAt: messageData.createdAt ? messageData.createdAt.toDate() : new Date(),
            });
          });
          
          setMessages(messagesList);
          setLoading(false);
          
          // Scroll to bottom on new messages
          if (messagesList.length > 0 && flatListRef.current) {
            setTimeout(() => {
              flatListRef.current.scrollToEnd({ animated: true });
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
  }, [chatId, otherUserId]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    try {
      const currentChatId = chatId || 
        (await getDocs(
          query(
            collection(db, 'chats'),
            where('participants', '==', [user.uid, otherUserId].sort())
          )
        )).docs[0]?.id;

      // If we have a current chat ID
      if (currentChatId) {
        // Add the message
        await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
          text: inputText.trim(),
          senderId: user.uid,
          createdAt: serverTimestamp(),
        });
        
        // Update the chat's last message and timestamp
        await updateDoc(doc(db, 'chats', currentChatId), {
          lastMessage: inputText.trim(),
          updatedAt: serverTimestamp(),
        });
      } 
      // If we need to create a new chat
      else if (otherUserId) {
        const newChatRef = await addDoc(collection(db, 'chats'), {
          participants: [user.uid, otherUserId],
          lastMessage: inputText.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        await addDoc(collection(db, 'chats', newChatRef.id, 'messages'), {
          text: inputText.trim(),
          senderId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      
      setInputText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === user.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
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
          <Ionicons name="chevron-forward" size={20} color="#4A90E2" />
        </TouchableOpacity>
      )}
      
      {loading ? (
        <ActivityIndicator size="large" color="#4A90E2" style={styles.loader} />
      ) : (
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
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={inputText.trim() ? "#4A90E2" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#d0e8fc',
  },
  jobBannerText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: '#4A90E2',
    borderBottomRightRadius: 5,
  },
  otherMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  myMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatDetailsScreen;