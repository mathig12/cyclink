import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { LocationService } from './src/services/LocationService';

export default function App() {
  useEffect(() => {
    LocationService.startTracking().catch(console.error);
  }, []);

  return <AppNavigator />;
}
