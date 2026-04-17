import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import RiderManagementScreen from '../screens/RiderManagementScreen';
import MapScreen from '../screens/MapScreen';
import HotspotsScreen from '../screens/HotspotsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        id={undefined}
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#040404' }
        }}
      >
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen 
          name="RiderManagement" 
          component={RiderManagementScreen} 
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Hotspots"
          component={HotspotsScreen}
          options={{
            animation: 'fade',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
