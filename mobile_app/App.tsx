// App.tsx
import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FirebaseService } from "./src/services/Firebaseservice";
import { DatabaseService } from "./src/services/DatabaseService";

import AuthScreen from "./src/screens/AuthScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import RiderManagementScreen from "./src/screens/RiderManagementScreen";
import MapScreen from "./src/screens/Mapscreen";

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    // Initialize SQLite database
    DatabaseService.initialize().catch(console.error);

    // Check Firebase auth state — determines first screen
    const unsub = FirebaseService.onAuthStateChanged((user) => {
      setInitialRoute(user ? "Dashboard" : "Auth");
    });

    return () => unsub();
  }, []);

  // Show spinner while checking auth state
  if (!initialRoute) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0f0f",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#FC4C02" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen
            name="RiderManagement"
            component={RiderManagementScreen}
          />
          <Stack.Screen name="Map" component={MapScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
