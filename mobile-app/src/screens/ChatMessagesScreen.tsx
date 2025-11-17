/**
 * Pantalla de Mensajes de Chat
 * Vista de conversación en tiempo real
 */

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
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import io from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  content: string;
  type: string;
  createdAt: string;
  readBy: string[];
}

export const ChatMessagesScreen: React.FC = ({ route, navigation }: any) => {
  const { room } = route.params;
  const { user, token } = useSelector((state: any) => state.auth);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const socketRef = useRef<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Configurar título de navegación
    navigation.setOptions({ title: room.name });

    // Conectar a WebSocket
    socketRef.current = io(`${process.env.API_URL}/chat`, {
      auth: { token },
    });

    socketRef.current.on('connect', () => {
      console.log('Socket conectado');
      // Unirse a la sala
      socketRef.current.emit('join_room', {
        roomId: room.id,
        userId: user.id,
      });
    });

    // Escuchar nuevos mensajes
    socketRef.current.on('new_message', (message: Message) => {
      setMessages((prev) => [message, ...prev]);

      // Marcar como leído si no es mensaje propio
      if (message.senderId !== user.id) {
        markAsRead(message.id);
      }
    });

    // Escuchar indicador de escritura
    socketRef.current.on('user_typing', (data: any) => {
      // Mostrar indicador de "escribiendo..."
      console.log('Usuario escribiendo:', data);
    });

    // Cargar mensajes iniciales
    fetchMessages();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_room', {
          roomId: room.id,
          userId: user.id,
        });
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/family/chat/messages?roomId=${room.id}&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setMessages(data.data.reverse() || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    setSending(true);

    try {
      // Enviar mensaje vía WebSocket
      socketRef.current.emit('send_message', {
        roomId: room.id,
        senderId: user.id,
        content: messageText.trim(),
        type: 'TEXT',
      });

      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await fetch(
        `${process.env.API_URL}/family/chat/messages/${messageId}/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
      });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId === user.id;
    const previousMessage = index < messages.length - 1 ? messages[index + 1] : null;
    const showDateSeparator =
      !previousMessage ||
      formatDate(item.createdAt) !== formatDate(previousMessage.createdAt);

    return (
      <>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageContainer,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.senderName}>
              {item.sender.firstName} {item.sender.lastName}
            </Text>
          )}

          <View
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.content}
            </Text>

            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                ]}
              >
                {formatTime(item.createdAt)}
              </Text>

              {isOwnMessage && (
                <Icon
                  name={
                    item.readBy && item.readBy.length > 1
                      ? 'check-all'
                      : 'check'
                  }
                  size={16}
                  color={
                    item.readBy && item.readBy.length > 1 ? '#3498DB' : '#FFFFFF'
                  }
                  style={styles.readIcon}
                />
              )}
            </View>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton}>
          <Icon name="attachment" size={24} color="#7F8C8D" />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Icon name="send" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ECF0F1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    marginLeft: 12,
    fontWeight: '600',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ownMessageBubble: {
    backgroundColor: '#3498DB',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#2C3E50',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#7F8C8D',
  },
  readIcon: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#3498DB',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
});
