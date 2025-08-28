import { Tabs } from "expo-router";
import { ActivityIndicator, Text, View, Appearance } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider, useSelector } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "../src/store";
import { DatabaseProvider } from "../src/database/DatabaseProvider";
import { Suspense, useState, useEffect } from "react";
import { MaterialIcons } from '@expo/vector-icons';
import type { RootState } from "../src/store";
import { AuthProvider } from "../src/context/AuthContext";

// Loading component while Redux state rehydrates
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }}>
    <ActivityIndicator size="large" color="#007AFF" />
    <Text style={{ marginTop: 16, color: '#666', fontSize: 14 }}>Loading your journal...</Text>
  </View>
);

// Theme-aware tab navigator
const ThemedTabs = () => {
  const { personalization } = useSelector((state: RootState) => state.settings);
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription?.remove();
  }, []);

  const getActualTheme = () => {
    if (personalization.theme === 'auto') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return personalization.theme;
  };

  const actualTheme = getActualTheme();
  const tabBarBackgroundColor = actualTheme === 'dark' ? '#000000' : '#FFFFFF';
  const tabBarBorderColor = actualTheme === 'dark' ? '#38383A' : '#E5E5E7';
  const tabBarActiveTint = actualTheme === 'dark' ? '#0A84FF' : '#007AFF';
  const tabBarInactiveTint = actualTheme === 'dark' ? '#8E8E93' : '#8E8E93';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 1,
          borderTopColor: tabBarBorderColor,
        },
        tabBarActiveTintColor: tabBarActiveTint,
        tabBarInactiveTintColor: tabBarInactiveTint,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="assessment" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <Suspense fallback={<LoadingScreen />}>
            <DatabaseProvider>
              <AuthProvider>
                <ThemedTabs />
              </AuthProvider>
            </DatabaseProvider>
          </Suspense>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}
