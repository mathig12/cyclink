import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { UrlTile, Marker, Polyline, Region } from 'react-native-maps';
import { LocationService, LocationData } from '../services/LocationService';
import { RoutingService, Coordinate } from '../services/RoutingService';

// Fallback coordinate if location services aren't ready
const DEFAULT_COORD: Coordinate = { latitude: 37.7749, longitude: -122.4194 };

// Mock data for other riders
const MOCK_OTHER_RIDERS: Coordinate[] = [
  { latitude: 37.7755, longitude: -122.4180 },
  { latitude: 37.7740, longitude: -122.4210 }
];

export default function MapScreen({ route }: any) {
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinate[]>([]);
  const mapRef = useRef<MapView>(null);

  // Auto-route if triggered from Dashboard
  useEffect(() => {
    if (route?.params?.autoRoute && userLocation) {
      handleFetchRoute();
    }
  }, [route?.params?.autoRoute, !!userLocation]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initializeLocation = () => {
      try {
        unsubscribe = LocationService.subscribe((loc: LocationData) => {
          setUserLocation(loc);
        });
      } catch (err) {
        console.log('[Map] Location init error:', err);
      }
    };

    initializeLocation();

    return () => {
      // ✅ ONLY unsubscribe (DO NOT stop tracking globally)
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleFetchRoute = async () => {
    if (!userLocation) return;

    const destination = MOCK_OTHER_RIDERS[0];
    const coords = await RoutingService.getRoute(userLocation, destination);
    setRouteCoords(coords);

    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // Use a state for region to avoid resetting on every userLocation update
  const [region] = useState<Region>({
    latitude: DEFAULT_COORD.latitude,
    longitude: DEFAULT_COORD.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        // Use standard provider (Google on Android)
        initialRegion={region}
        // mapType="none" ensures Google's tiles don't load behind your OSM tiles
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
      >
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />

        {/* User Location */}
        {userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="You"
            pinColor="blue"
          />
        )}

        {/* Other Riders */}
        {MOCK_OTHER_RIDERS.map((rider, index) => (
          <Marker
            key={`rider-${index}`}
            coordinate={rider}
            title={`Rider ${index + 1}`}
            pinColor="green"
          />
        ))}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#FF0000"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Buttons */}
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.button} onPress={handleFetchRoute}>
          <Text style={styles.buttonText}>Route to Rider 1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (userLocation && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }
          }}
        >
          <Text style={styles.buttonText}>Center</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
    gap: 10,
  },
  button: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  }
});