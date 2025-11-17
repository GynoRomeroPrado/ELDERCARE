import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptTransform } from 'redux-persist-transform-encrypt';

// Reducers
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import devicesReducer from './slices/devicesSlice';
import fallsReducer from './slices/fallsSlice';
import medicationReducer from './slices/medicationSlice';
import familyReducer from './slices/familySlice';
import alertsReducer from './slices/alertsSlice';
import telemedicineReducer from './slices/telemedicineSlice';
import offlineReducer from './slices/offlineSlice';

// API
import { api } from './api';

const encryptor = encryptTransform({
  secretKey: 'eldercare-secure-key-2025', // TODO: Use device-specific key
  onError: (error) => {
    console.error('Encryption error:', error);
  },
});

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  devices: devicesReducer,
  falls: fallsReducer,
  medication: medicationReducer,
  family: familyReducer,
  alerts: alertsReducer,
  telemedicine: telemedicineReducer,
  offline: offlineReducer,
  [api.reducerPath]: api.reducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'user', 'devices', 'offline'], // Only persist these reducers
  transforms: [encryptor],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(api.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
