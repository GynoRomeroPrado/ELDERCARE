/**
 * Falls Screen
 * Fall detection history and emergency response
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

interface FallEvent {
  id: string;
  detectedAt: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'ACKNOWLEDGED' | 'FALSE_ALARM' | 'EMERGENCY';
  location: string;
  confidence: number;
  timeOnGround?: number;
  acknowledgedBy?: string;
}

export const FallsScreen: React.FC = ({ navigation }: any) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED'>('ALL');
  const [falls, setFalls] = useState<FallEvent[]>([
    {
      id: '1',
      detectedAt: '2024-11-16T14:30:00Z',
      severity: 'LOW',
      status: 'FALSE_ALARM',
      location: 'Living Room',
      confidence: 0.72,
      acknowledgedBy: 'Sarah (Daughter)',
    },
    {
      id: '2',
      detectedAt: '2024-11-15T09:15:00Z',
      severity: 'MEDIUM',
      status: 'ACKNOWLEDGED',
      location: 'Bathroom',
      confidence: 0.89,
      timeOnGround: 12,
      acknowledgedBy: 'John (Son)',
    },
    {
      id: '3',
      detectedAt: '2024-11-10T22:45:00Z',
      severity: 'HIGH',
      status: 'EMERGENCY',
      location: 'Bedroom',
      confidence: 0.96,
      timeOnGround: 120,
      acknowledgedBy: 'Emergency Services',
    },
  ]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return '#F44336';
      case 'MEDIUM':
        return '#FF9800';
      case 'LOW':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#FF9800';
      case 'ACKNOWLEDGED':
        return '#4CAF50';
      case 'FALSE_ALARM':
        return '#9E9E9E';
      case 'EMERGENCY':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const handleAcknowledge = (fallId: string) => {
    Alert.alert(
      'Acknowledge Fall',
      'Confirm that you have checked on the elder and they are safe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Safe',
          onPress: () => {
            setFalls((prevFalls) =>
              prevFalls.map((fall) =>
                fall.id === fallId
                  ? { ...fall, status: 'ACKNOWLEDGED', acknowledgedBy: 'You' }
                  : fall,
              ),
            );
          },
        },
      ],
    );
  };

  const handleEmergency = (fallId: string) => {
    Alert.alert(
      'Call Emergency Services',
      'This will immediately contact 911 and notify all emergency contacts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call 911',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Emergency Services Called', 'Help is on the way!');
          },
        },
      ],
    );
  };

  const renderFallEvent = ({ item }: { item: FallEvent }) => (
    <View style={styles.fallCard}>
      <View style={styles.fallHeader}>
        <View style={styles.fallTimeContainer}>
          <Icon name="clock-outline" size={16} color="#757575" />
          <Text style={styles.fallTime}>
            {format(new Date(item.detectedAt), 'MMM d, h:mm a')}
          </Text>
        </View>
        <View
          style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(item.severity) },
          ]}
        >
          <Text style={styles.severityText}>{item.severity}</Text>
        </View>
      </View>

      <View style={styles.fallLocation}>
        <Icon name="map-marker" size={20} color="#4A90E2" />
        <Text style={styles.locationText}>{item.location}</Text>
      </View>

      <View style={styles.fallMetrics}>
        <View style={styles.metric}>
          <Icon name="chart-line" size={18} color="#666" />
          <Text style={styles.metricText}>
            Confidence: {(item.confidence * 100).toFixed(0)}%
          </Text>
        </View>
        {item.timeOnGround && (
          <View style={styles.metric}>
            <Icon name="timer" size={18} color="#666" />
            <Text style={styles.metricText}>
              On ground: {item.timeOnGround}s
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.statusContainer,
          { backgroundColor: `${getStatusColor(item.status)}20` },
        ]}
      >
        <Icon
          name={
            item.status === 'ACKNOWLEDGED'
              ? 'check-circle'
              : item.status === 'FALSE_ALARM'
              ? 'close-circle'
              : item.status === 'EMERGENCY'
              ? 'alert-circle'
              : 'clock-alert'
          }
          size={20}
          color={getStatusColor(item.status)}
        />
        <Text
          style={[styles.statusText, { color: getStatusColor(item.status) }]}
        >
          {item.status.replace('_', ' ')}
        </Text>
        {item.acknowledgedBy && (
          <Text style={styles.acknowledgedBy}>by {item.acknowledgedBy}</Text>
        )}
      </View>

      {item.status === 'PENDING' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acknowledgeButton]}
            onPress={() => handleAcknowledge(item.id)}
          >
            <Icon name="check" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Acknowledge</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.emergencyButton]}
            onPress={() => handleEmergency(item.id)}
          >
            <Icon name="phone" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call 911</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.viewDetails}
        onPress={() => navigation.navigate('FallDetails', { fallId: item.id })}
      >
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Icon name="chevron-right" size={20} color="#4A90E2" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>98.3%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {['ALL', 'PENDING', 'ACKNOWLEDGED'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.filterTab,
              filter === tab && styles.filterTabActive,
            ]}
            onPress={() => setFilter(tab as any)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Falls List */}
      <FlatList
        data={falls}
        renderItem={renderFallEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.emptyTitle}>No Falls Detected</Text>
            <Text style={styles.emptyText}>
              Great news! No fall events have been recorded.
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
    backgroundColor: '#F5F5F5',
  },
  statsHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#4A90E2',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  fallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fallTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallTime: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fallLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginLeft: 8,
  },
  fallMetrics: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  metricText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  acknowledgedBy: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  acknowledgeButton: {
    backgroundColor: '#4CAF50',
  },
  emergencyButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  viewDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
});
