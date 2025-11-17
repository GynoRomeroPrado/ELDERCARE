/**
 * ELDERCARE+ Mobile App
 * Root Component
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';

import { store, persistor } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef } from './src/navigation/NavigationService';
import { initializeNotifications } from './src/services/NotificationService';
import LoadingScreen from './src/components/common/LoadingScreen';
import toastConfig from './src/config/toastConfig';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function App(): JSX.Element {
  useEffect(() => {
    // Initialize Firebase Crashlytics
    crashlytics().log('App mounted');

    // Request notification permissions
    requestUserPermission();

    // Initialize notification handlers
    initializeNotifications();

    // Handle foreground notifications
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground notification:', remoteMessage);

      // Show in-app notification
      Toast.show({
        type: remoteMessage.data?.type || 'info',
        text1: remoteMessage.notification?.title || 'Notification',
        text2: remoteMessage.notification?.body,
        visibilityTime: 5000,
        autoHide: true,
        topOffset: 60,
      });
    });

    return unsubscribe;
  }, []);

  const requestUserPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted:', authStatus);
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      // TODO: Send token to backend
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <SafeAreaProvider>
            <StatusBar
              barStyle="dark-content"
              backgroundColor="#FFFFFF"
            />
            <AppNavigator ref={navigationRef} />
            <Toast config={toastConfig} />
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
