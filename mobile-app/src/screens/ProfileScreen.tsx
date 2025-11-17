/**
 * Pantalla de Perfil de Usuario
 * Visualización y edición de datos del usuario
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const ProfileScreen: React.FC = ({ navigation }: any) => {
  const { user, token } = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch(`${process.env.API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar perfil');
      }

      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al actualizar perfil');
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      ELDER: 'Adulto Mayor',
      FAMILY_MEMBER: 'Familiar',
      CAREGIVER: 'Cuidador',
      HEALTHCARE_PROVIDER: 'Proveedor de Salud',
      ADMIN: 'Administrador',
    };
    return roles[role] || role;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="account" size={64} color="#FFFFFF" />
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="camera" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.name}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.role}>{getRoleLabel(user?.role)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="email" size={24} color="#3498DB" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="phone" size={24} color="#3498DB" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{user?.phone || 'No especificado'}</Text>
            </View>
          </View>

          {user?.dateOfBirth && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon name="cake-variant" size={24} color="#3498DB" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Fecha de Nacimiento</Text>
                  <Text style={styles.infoValue}>
                    {new Date(user.dateOfBirth).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              </View>
            </>
          )}

          {user?.address && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Icon name="map-marker" size={24} color="#3498DB" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{user.address}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditModalVisible(true)}
        >
          <Icon name="pencil" size={20} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Editar Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <Icon name="lock-reset" size={24} color="#3498DB" />
          <Text style={styles.menuItemText}>Cambiar Contraseña</Text>
          <Icon name="chevron-right" size={24} color="#BDC3C7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Icon name="bell" size={24} color="#3498DB" />
          <Text style={styles.menuItemText}>Notificaciones</Text>
          <Icon name="chevron-right" size={24} color="#BDC3C7" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Icon name="shield-check" size={24} color="#3498DB" />
          <Text style={styles.menuItemText}>Privacidad</Text>
          <Icon name="chevron-right" size={24} color="#BDC3C7" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Icon name="logout" size={24} color="#E74C3C" />
          <Text style={[styles.menuItemText, styles.logoutText]}>Cerrar Sesión</Text>
          <Icon name="chevron-right" size={24} color="#BDC3C7" />
        </TouchableOpacity>
      </View>

      {/* Modal de Edición */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre"
              value={firstName}
              onChangeText={setFirstName}
            />

            <TextInput
              style={styles.input}
              placeholder="Apellido"
              value={lastName}
              onChangeText={setLastName}
            />

            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#3498DB',
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2980B9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2C3E50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#ECF0F1',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECF0F1',
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 16,
    fontWeight: '600',
  },
  logoutText: {
    color: '#E74C3C',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ECF0F1',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#3498DB',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
