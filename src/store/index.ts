import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import journalReducer from './slices/journalSlice';
import settingsReducer from './slices/settingsSlice';

// Redux Persist configuration
const persistConfig = {
  key: 'journal-app',
  storage: AsyncStorage,
  whitelist: ['journal', 'settings'], // Persist journal and settings state
  version: 1,
};

// Create persisted reducers
const persistedJournalReducer = persistReducer({...persistConfig, key: 'journal'}, journalReducer);
const persistedSettingsReducer = persistReducer({...persistConfig, key: 'settings'}, settingsReducer);

// Configure store
export const store = configureStore({
  reducer: {
    journal: persistedJournalReducer,
    settings: persistedSettingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: __DEV__, // Enable Redux DevTools in development
});

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
