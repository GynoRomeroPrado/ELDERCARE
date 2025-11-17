/**
 * Dashboard Screen
 * Main overview screen for ELDERCARE+ mobile app
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DashboardStats {
  fallsToday: number;
  medicationAdherence: number;
  devicesOnline: number;
  totalDevices: number;
  pendingAlerts: number;
}

export const DashboardScreen: React.FC = ({ navigation }: any) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: any) => state.auth);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch dashboard stats from API
      // const response = await api.get('/dashboard/stats');
      // setStats(response.data);

      // Mock data for demonstration
      setStats({
        fallsToday: 0,
        medicationAdherence: 92,
        devicesOnline: 3,
        totalDevices: 3,
        pendingAlerts: 1,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  if (loading && !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome back, {user?.firstName || 'User'}
        </Text>
        <Text style={styles.subgreeting}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Falls Today"
          value={stats?.fallsToday || 0}
          icon="alert-circle"
          color={stats?.fallsToday === 0 ? '#4CAF50' : '#F44336'}
          onPress={() => navigation.navigate('Falls')}
        />
        <StatCard
          title="Medication"
          value={`${stats?.medicationAdherence || 0}%`}
          icon="pill"
          color="#4A90E2"
          onPress={() => navigation.navigate('Medication')}
        />
        <StatCard
          title="Devices"
          value={`${stats?.devicesOnline}/${stats?.totalDevices}`}
          icon="devices"
          color="#9C27B0"
          onPress={() => navigation.navigate('Devices')}
        />
        <StatCard
          title="Alerts"
          value={stats?.pendingAlerts || 0}
          icon="bell"
          color="#FF9800"
          onPress={() => navigation.navigate('Alerts')}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <ActionButton
            title="Call Elder"
            icon="phone"
            color="#4CAF50"
            onPress={() => {/* Handle call */}}
          />
          <ActionButton
            title="Video Call"
            icon="video"
            color="#4A90E2"
            onPress={() => navigation.navigate('Telemedicine')}
          />
          <ActionButton
            title="Send Message"
            icon="message"
            color="#9C27B0"
            onPress={() => navigation.navigate('Chat')}
          />
          <ActionButton
            title="Emergency"
            icon="alert"
            color="#F44336"
            onPress={() => {/* Handle emergency */}}
          />
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Activity')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ActivityItem
          icon="pill"
          iconColor="#4A90E2"
          title="Medication Taken"
          subtitle="Aspirin - 10:00 AM"
          time="2h ago"
        />
        <ActivityItem
          icon="walk"
          iconColor="#4CAF50"
          title="Daily Walk"
          subtitle="2,500 steps - Morning"
          time="4h ago"
        />
        <ActivityItem
          icon="sleep"
          iconColor="#9C27B0"
          title="Sleep Quality"
          subtitle="7.5 hours - Good"
          time="8h ago"
        />
      </View>

      {/* Device Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Status</Text>

        <DeviceStatusCard
          name="Pill Dispenser"
          location="Kitchen Counter"
          status="online"
          battery={85}
          lastHeartbeat="2 min ago"
        />
        <DeviceStatusCard
          name="Fall Sensor"
          location="Living Room"
          status="online"
          battery={null}
          lastHeartbeat="1 min ago"
        />
        <DeviceStatusCard
          name="Fall Sensor"
          location="Bedroom"
          status="online"
          battery={null}
          lastHeartbeat="30 sec ago"
        />
      </View>
    </ScrollView>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
  onPress: () => void;
}> = ({ title, value, icon, color, onPress }) => (
  <TouchableOpacity style={styles.statCard} onPress={onPress}>
    <Icon name={icon} size={32} color={color} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statTitle}>{title}</Text>
  </TouchableOpacity>
);

// Action Button Component
const ActionButton: React.FC<{
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}> = ({ title, icon, color, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}>
      <Icon name={icon} size={28} color="#FFFFFF" />
    </View>
    <Text style={styles.actionButtonText}>{title}</Text>
  </TouchableOpacity>
);

// Activity Item Component
const ActivityItem: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}> = ({ icon, iconColor, title, subtitle, time }) => (
  <View style={styles.activityItem}>
    <View style={[styles.activityIcon, { backgroundColor: `${iconColor}20` }]}>
      <Icon name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.activityContent}>
      <Text style={styles.activityTitle}>{title}</Text>
      <Text style={styles.activitySubtitle}>{subtitle}</Text>
    </View>
    <Text style={styles.activityTime}>{time}</Text>
  </View>
);

// Device Status Card Component
const DeviceStatusCard: React.FC<{
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  battery: number | null;
  lastHeartbeat: string;
}> = ({ name, location, status, battery, lastHeartbeat }) => (
  <View style={styles.deviceCard}>
    <View style={styles.deviceInfo}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{name}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                status === 'online'
                  ? '#4CAF50'
                  : status === 'warning'
                  ? '#FF9800'
                  : '#F44336',
            },
          ]}
        >
          <Text style={styles.statusText}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.deviceLocation}>{location}</Text>
      <View style={styles.deviceMetrics}>
        {battery !== null && (
          <View style={styles.metric}>
            <Icon name="battery" size={16} color="#666" />
            <Text style={styles.metricText}>{battery}%</Text>
          </View>
        )}
        <View style={styles.metric}>
          <Icon name="clock-outline" size={16} color="#666" />
          <Text style={styles.metricText}>{lastHeartbeat}</Text>
        </View>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  subgreeting: {
    fontSize: 16,
    color: '#757575',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  actionButton: {
    width: '23%',
    alignItems: 'center',
    margin: '1%',
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#212121',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  activityTime: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deviceLocation: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  deviceMetrics: {
    flexDirection: 'row',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});
