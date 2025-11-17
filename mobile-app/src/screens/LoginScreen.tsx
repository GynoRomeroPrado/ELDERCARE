/**
 * Pantalla de Login
 * Autenticación de usuarios
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { login } from '../store/slices/authSlice';

export const LoginScreen: React.FC = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);

    try {
      // Llamada a la API de autenticación
      const response = await fetch(`${process.env.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar token y datos del usuario en Redux
      dispatch(
        login({
          user: data.user,
          token: data.accessToken,
        })
      );

      // Navegar a la pantalla principal
      navigation.replace('MainTabs');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>ELDERCARE+</Text>
          <Text style={styles.subtitle}>Cuidado Inteligente para Adultos Mayores</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            onPress={handleForgotPassword}
            disabled={loading}
            style={styles.forgotPasswordButton}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes cuenta? </Text>
            <TouchableOpacity onPress={handleRegister} disabled={loading}>
              <Text style={styles.registerLink}>Regístrate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Versión */}
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2C3E50',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#3498DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3498DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#BDC3C7',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  registerLink: {
    fontSize: 14,
    color: '#3498DB',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#BDC3C7',
    fontSize: 12,
    marginTop: 32,
  },
});
