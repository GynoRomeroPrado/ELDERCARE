/**
 * Pantalla de Lista de Chats
 * Muestra todas las salas de chat del usuario
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface ChatRoom {
  id: string;
  name: string;
  type: string;
  avatarUrl?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    sender: { firstName: string; lastName: string };
  };
  unreadCount?: number;
}

export const ChatListScreen: React.FC = ({ navigation }: any) => {
  const { user, token } = useSelector((state: any) => state.auth);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/family/chat/rooms?participantId=${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setRooms(data.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRooms();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  };

  const renderRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => navigation.navigate('ChatMessages', { room: item })}
    >
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="account-group" size={28} color="#FFFFFF" />
          </View>
        )}
        {item.unreadCount && item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.roomContent}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessage && (
            <Text style={styles.timestamp}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>

        {item.lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            <Text style={styles.senderName}>
              {item.lastMessage.sender.firstName}:{' '}
            </Text>
            {item.lastMessage.content}
          </Text>
        ) : (
          <Text style={styles.noMessages}>No hay mensajes aún</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats Familiares</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => navigation.navigate('NewChat')}
        >
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3498DB']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-outline" size={64} color="#BDC3C7" />
            <Text style={styles.emptyText}>No tienes chats aún</Text>
            <Text style={styles.emptySubtext}>
              Crea un nuevo chat para comenzar a conversar con tu familia
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  newChatButton: {
    backgroundColor: '#3498DB',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  roomCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  roomContent: {
    flex: 1,
    justifyContent: 'center',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  senderName: {
    fontWeight: '600',
    color: '#34495E',
  },
  noMessages: {
    fontSize: 14,
    color: '#BDC3C7',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});
