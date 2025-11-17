/**
 * Pantalla de Calendario Compartido
 * Vista mensual y lista de eventos familiares
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Calendar } from 'react-native-calendars';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  priority: string;
  startTime: string;
  endTime: string;
  location?: string;
  allDay: boolean;
  participants: any[];
}

export const CalendarScreen: React.FC = ({ navigation }: any) => {
  const { user, token } = useSelector((state: any) => state.auth);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(1); // Primer día del mes
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2); // Hasta 2 meses después

      const response = await fetch(
        `${process.env.API_URL}/family/calendar/events?participantId=${user.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      setEvents(data.data || []);
      markEventDates(data.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markEventDates = (eventsList: CalendarEvent[]) => {
    const marked: any = {};

    eventsList.forEach((event) => {
      const date = event.startTime.split('T')[0];
      if (!marked[date]) {
        marked[date] = {
          marked: true,
          dots: [],
        };
      }

      // Color según tipo de evento
      const color = getEventTypeColor(event.eventType);
      marked[date].dots.push({ color });
    });

    // Marcar fecha seleccionada
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#3498DB',
    };

    setMarkedDates(marked);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const getEventTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      MEDICAL_APPOINTMENT: '#E74C3C',
      MEDICATION_SCHEDULE: '#9B59B6',
      FAMILY_VISIT: '#3498DB',
      ACTIVITY: '#F39C12',
      REMINDER: '#16A085',
      CUSTOM: '#95A5A6',
    };
    return colors[type] || '#95A5A6';
  };

  const getEventTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      MEDICAL_APPOINTMENT: 'hospital-box',
      MEDICATION_SCHEDULE: 'pill',
      FAMILY_VISIT: 'account-group',
      ACTIVITY: 'soccer',
      REMINDER: 'bell',
      CUSTOM: 'calendar',
    };
    return icons[type] || 'calendar';
  };

  const getEventTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      MEDICAL_APPOINTMENT: 'Cita Médica',
      MEDICATION_SCHEDULE: 'Medicación',
      FAMILY_VISIT: 'Visita Familiar',
      ACTIVITY: 'Actividad',
      REMINDER: 'Recordatorio',
      CUSTOM: 'Personalizado',
    };
    return labels[type] || type;
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      LOW: '#95A5A6',
      MEDIUM: '#F39C12',
      HIGH: '#E74C3C',
    };
    return colors[priority] || '#95A5A6';
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
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEventsForSelectedDate = () => {
    return events.filter((event) => {
      const eventDate = event.startTime.split('T')[0];
      return eventDate === selectedDate;
    });
  };

  const handleEventPress = (event: CalendarEvent) => {
    navigation.navigate('EventDetails', { event });
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro que deseas eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(
                `${process.env.API_URL}/family/calendar/events/${eventId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              fetchEvents();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  };

  const renderEvent = ({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
    >
      <View
        style={[
          styles.eventTypeIndicator,
          { backgroundColor: getEventTypeColor(item.eventType) },
        ]}
      />

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Icon
            name={getEventTypeIcon(item.eventType)}
            size={24}
            color={getEventTypeColor(item.eventType)}
          />
          <View style={styles.eventHeaderText}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.eventType}>
              {getEventTypeLabel(item.eventType)}
            </Text>
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) },
            ]}
          >
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Icon name="clock-outline" size={16} color="#7F8C8D" />
            <Text style={styles.eventDetailText}>
              {item.allDay
                ? 'Todo el día'
                : `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`}
            </Text>
          </View>

          {item.location && (
            <View style={styles.eventDetailRow}>
              <Icon name="map-marker-outline" size={16} color="#7F8C8D" />
              <Text style={styles.eventDetailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}

          {item.participants && item.participants.length > 0 && (
            <View style={styles.eventDetailRow}>
              <Icon name="account-group-outline" size={16} color="#7F8C8D" />
              <Text style={styles.eventDetailText}>
                {item.participants.length} participantes
              </Text>
            </View>
          )}
        </View>
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

  const selectedDateEvents = getEventsForSelectedDate();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendario Familiar</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() =>
              setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')
            }
          >
            <Icon
              name={viewMode === 'calendar' ? 'format-list-bulleted' : 'calendar'}
              size={24}
              color="#2C3E50"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('NewEvent')}
          >
            <Icon name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'calendar' ? (
        <>
          <Calendar
            current={selectedDate}
            onDayPress={(day: any) => {
              setSelectedDate(day.dateString);
              markEventDates(events);
            }}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              todayTextColor: '#3498DB',
              selectedDayBackgroundColor: '#3498DB',
              dotColor: '#3498DB',
              arrowColor: '#3498DB',
            }}
          />

          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateTitle}>
              {formatDate(selectedDate)}
            </Text>
            <Text style={styles.eventCount}>
              {selectedDateEvents.length}{' '}
              {selectedDateEvents.length === 1 ? 'evento' : 'eventos'}
            </Text>
          </View>

          <FlatList
            data={selectedDateEvents}
            renderItem={renderEvent}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.eventsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#3498DB']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="calendar-blank" size={64} color="#BDC3C7" />
                <Text style={styles.emptyText}>
                  No hay eventos para esta fecha
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3498DB']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-blank" size={64} color="#BDC3C7" />
              <Text style={styles.emptyText}>No hay eventos próximos</Text>
            </View>
          }
        />
      )}
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
  headerButtons: {
    flexDirection: 'row',
  },
  viewModeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#3498DB',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECF0F1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  eventCount: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  eventsList: {
    padding: 16,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  eventTypeIndicator: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 16,
  },
});
