import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '../global.css';
import { Tabs } from "expo-router";
import { ActivityIndicator, Text, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "../src/store";
import { DatabaseProvider } from "../src/database/DatabaseProvider";
import { Suspense } from "react";
import { MaterialIcons } from '@expo/vector-icons';
import { AuthProvider } from "../src/context/AuthContext";
import { TabTransitionProvider } from "../src/context/TabTransitionContext";
import { useAppTheme } from "../src/theme/useAppTheme";

// Loading component while Redux state rehydrates
const LoadingScreen = () => {
  const { tokens } = useAppTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.colors.background }}>
      <ActivityIndicator size="large" color={tokens.colors.accent} />
      <Text style={{ marginTop: 16, color: tokens.colors.muted, fontSize: 14 }}>Loading your journal...</Text>
    </View>
  );
};

// Theme-aware tab navigator
const ThemedTabs = () => {
  const { tokens } = useAppTheme();

  return (
    <TabTransitionProvider order={['index','reports','settings']}>
      <Tabs
        screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tokens.tabBar.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: tokens.tabBar.border,
        },
        tabBarActiveTintColor: tokens.tabBar.active,
        tabBarInactiveTintColor: tokens.tabBar.inactive,
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
    </TabTransitionProvider>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
