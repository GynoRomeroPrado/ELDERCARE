/**
 * Medication Screen
 * Medication adherence tracking and schedule management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  color: string;
}

interface MedicationLog {
  id: string;
  medicationName: string;
  scheduledTime: string;
  takenAt: string | null;
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED';
  dosage: string;
}

export const MedicationScreen: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: '1',
      name: 'Aspirin',
      dosage: '81mg',
      frequency: 'Once daily',
      times: ['08:00'],
      color: '#4A90E2',
    },
    {
      id: '2',
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily',
      times: ['08:00', '20:00'],
      color: '#4CAF50',
    },
    {
      id: '3',
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      times: ['08:00'],
      color: '#9C27B0',
    },
  ]);

  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([
    {
      id: '1',
      medicationName: 'Aspirin 81mg',
      scheduledTime: '08:00 AM',
      takenAt: '08:05 AM',
      status: 'TAKEN',
      dosage: '81mg',
    },
    {
      id: '2',
      medicationName: 'Metformin 500mg',
      scheduledTime: '08:00 AM',
      takenAt: '08:10 AM',
      status: 'TAKEN',
      dosage: '500mg',
    },
    {
      id: '3',
      medicationName: 'Lisinopril 10mg',
      scheduledTime: '08:00 AM',
      takenAt: null,
      status: 'MISSED',
      dosage: '10mg',
    },
    {
      id: '4',
      medicationName: 'Metformin 500mg',
      scheduledTime: '08:00 PM',
      takenAt: null,
      status: 'PENDING',
      dosage: '500mg',
    },
  ]);

  const adherenceRate = 92; // Calculate from logs

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'MISSED':
        return { name: 'close-circle', color: '#F44336' };
      case 'PENDING':
        return { name: 'clock-outline', color: '#FF9800' };
      case 'SKIPPED':
        return { name: 'minus-circle', color: '#9E9E9E' };
      default:
        return { name: 'help-circle', color: '#9E9E9E' };
    }
  };

  const handleMarkAsTaken = (logId: string) => {
    Alert.alert(
      'Confirm',
      'Mark this medication as taken?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setTodayLogs((logs) =>
              logs.map((log) =>
                log.id === logId
                  ? { ...log, status: 'TAKEN' as const, takenAt: format(new Date(), 'hh:mm a') }
                  : log,
              ),
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with adherence rate */}
      <View style={styles.header}>
        <View style={styles.adherenceCircle}>
          <Text style={styles.adherencePercent}>{adherenceRate}%</Text>
          <Text style={styles.adherenceLabel}>Adherence</Text>
        </View>
        <View style={styles.headerStats}>
          <StatItem label="Taken Today" value="3/4" color="#4CAF50" />
          <StatItem label="On Time" value="2/3" color="#4A90E2" />
          <StatItem label="Missed" value="1" color="#F44336" />
        </View>
      </View>

      {/* Today's Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.dateText}>
            {format(selectedDate, 'EEEE, MMMM d')}
          </Text>
        </View>

        {todayLogs.map((log) => {
          const statusIcon = getStatusIcon(log.status);
          return (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logIcon}>
                <Icon name={statusIcon.name} size={32} color={statusIcon.color} />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logMedication}>{log.medicationName}</Text>
                <Text style={styles.logTime}>
                  Scheduled: {log.scheduledTime}
                  {log.takenAt && ` • Taken: ${log.takenAt}`}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusIcon.color}20` }]}>
                  <Text style={[styles.statusText, { color: statusIcon.color }]}>
                    {log.status}
                  </Text>
                </View>
              </View>
              {log.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMarkAsTaken(log.id)}
                >
                  <Icon name="check" size={24} color="#4CAF50" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Active Medications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Medications</Text>
          <TouchableOpacity>
            <Icon name="plus-circle" size={28} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        {medications.map((med) => (
          <View key={med.id} style={styles.medicationCard}>
            <View style={[styles.medicationColor, { backgroundColor: med.color }]} />
            <View style={styles.medicationInfo}>
              <Text style={styles.medicationName}>{med.name}</Text>
              <Text style={styles.medicationDosage}>{med.dosage}</Text>
              <Text style={styles.medicationFrequency}>{med.frequency}</Text>
              <View style={styles.medicationTimes}>
                {med.times.map((time, index) => (
                  <View key={index} style={styles.timeChip}>
                    <Icon name="clock-outline" size={14} color="#666" />
                    <Text style={styles.timeText}>{time}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.medicationAction}>
              <Icon name="dots-vertical" size={24} color="#9E9E9E" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Weekly Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Overview</Text>
        <View style={styles.weeklyChart}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <View key={day} style={styles.chartBar}>
              <View style={styles.chartBarContainer}>
                <View
                  style={[
                    styles.chartBarFill,
                    {
                      height: `${[95, 100, 88, 92, 90, 85, 92][index]}%`,
                      backgroundColor: index < 5 ? '#4CAF50' : '#4A90E2',
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Reminders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <TouchableOpacity>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reminderCard}>
          <Icon name="bell-ring" size={24} color="#4A90E2" />
          <View style={styles.reminderContent}>
            <Text style={styles.reminderText}>15 minutes before scheduled time</Text>
            <Text style={styles.reminderSubtext}>Push notification + Device alert</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#9E9E9E" />
        </View>
      </View>
    </ScrollView>
  );
};

const StatItem: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View style={styles.statItem}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={[styles.statIndicator, { backgroundColor: color }]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adherenceCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
  },
  adherencePercent: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  headerStats: {
    flex: 1,
  },
  statItem: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statIndicator: {
    width: 40,
    height: 3,
    borderRadius: 2,
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
  },
  dateText: {
    fontSize: 14,
    color: '#757575',
  },
  editText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  logIcon: {
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logMedication: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  medicationColor: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationFrequency: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  medicationTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  medicationAction: {
    padding: 4,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 150,
    marginTop: 16,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  chartBarContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  reminderContent: {
    flex: 1,
    marginLeft: 12,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  reminderSubtext: {
    fontSize: 14,
    color: '#757575',
  },
});
