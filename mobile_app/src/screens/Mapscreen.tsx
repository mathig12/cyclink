// src/screens/MapScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
// ✅ IMPORT MOVED HERE
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { FirebaseService, RiderNode } from '../services/Firebaseservice';

export default function MapScreen({ navigation, route }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue:       BebasNeue_400Regular,
    ChakraPetch:     ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  const rideId: string = route?.params?.ride_id || '';

  const [nodes,   setNodes]   = useState<RiderNode[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRef  = useRef<MapView>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // ── Firebase listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;

    unsubRef.current = FirebaseService.listenToNodes(rideId, (updatedNodes) => {
      setNodes(updatedNodes);
      setLoading(false);
    });

    return () => { unsubRef.current?.(); };
  }, [rideId]);

  // ── Fit map to all markers ────────────────────────────────────────────────
  useEffect(() => {
    const validNodes = nodes.filter(n => n.lat !== 0 && n.lon !== 0);
    if (validNodes.length === 0) return;

    mapRef.current?.fitToCoordinates(
      validNodes.map(n => ({ latitude: n.lat, longitude: n.lon })),
      { edgePadding: { top: 80, bottom: 80, left: 40, right: 40 }, animated: true }
    );
  }, [nodes]);

  if (!fontsLoaded) return null;

  // ── Marker color per source ───────────────────────────────────────────────
  const markerColor = (source: RiderNode['source'], mode: number): string => {
    if (mode >= 3) return '#f44336'; // emergency/SOS — red
    if (mode === 2) return '#FFA500'; // confirmation — orange
    switch (source) {
      case 'esp32':              return '#FC4C02'; // brand orange
      case 'mobile_host':        return '#FC4C02';
      case 'mobile_participant': return '#4caf50'; // green
      default:                   return '#888';
    }
  };

  const markerIcon = (source: RiderNode['source']): string => {
    switch (source) {
      case 'esp32':              return '🔩';
      case 'mobile_host':        return '👑';
      case 'mobile_participant': return '🚴';
      default:                   return '📍';
    }
  };

  const isOffline = (node: RiderNode): boolean =>
    Date.now() - node.last_updated > 10000;

  const validNodes = nodes.filter(n => n.lat !== 0 && n.lon !== 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Live <Text style={styles.headerAccent}>Map</Text>
        </Text>
        <View style={styles.riderCount}>
          <Text style={styles.riderCountText}>{validNodes.length} online</Text>
        </View>
      </View>

      {/* Map */}
      {loading ? (
        <View style={styles.loadingMap}>
          <ActivityIndicator color="#FC4C02" size="large" />
          <Text style={styles.loadingText}>Fetching riders...</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          mapType="standard"
          customMapStyle={darkMapStyle}
          showsUserLocation={false}
          showsCompass={true}
          initialRegion={{
            latitude:      validNodes[0]?.lat || 11.0168,
            longitude:     validNodes[0]?.lon || 76.9558,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {validNodes.map((node) => (
            <Marker
              key={node.node_id}
              coordinate={{ latitude: node.lat, longitude: node.lon }}
              title={node.user_name}
              description={`${node.source} · G: ${node.impact.toFixed(1)} · Mode: ${node.mode}`}
              pinColor={markerColor(node.source, node.mode)}
              opacity={isOffline(node) ? 0.4 : 1}
            >
              {/* Custom callout marker */}
              <View style={[
                styles.markerBubble,
                { borderColor: markerColor(node.source, node.mode) },
                isOffline(node) && { opacity: 0.5 },
              ]}>
                <Text style={styles.markerIcon}>{markerIcon(node.source)}</Text>
                <Text style={styles.markerName} numberOfLines={1}>
                  {node.user_name.split(' ')[0]}
                </Text>
                {node.mode >= 2 && (
                  <View style={styles.markerAlert}>
                    <Text style={styles.markerAlertText}>!</Text>
                  </View>
                )}
              </View>
            </Marker>
          ))}

          {/* Connect host ESP32 and mobile with a line */}
          {(() => {
            const esp32  = validNodes.find(n => n.source === 'esp32');
            const mobile = validNodes.find(n => n.source === 'mobile_host');
            if (!esp32 || !mobile) return null;
            return (
              <Polyline
                coordinates={[
                  { latitude: esp32.lat,  longitude: esp32.lon },
                  { latitude: mobile.lat, longitude: mobile.lon },
                ]}
                strokeColor="rgba(252,76,2,0.4)"
                strokeWidth={2}
                lineDashPattern={[6, 4]}
              />
            );
          })()}
        </MapView>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FC4C02' }]} />
          <Text style={styles.legendText}>ESP32 / Host</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.legendText}>Participant</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f44336' }]} />
          <Text style={styles.legendText}>Emergency</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Dark map style (Google Maps) ──────────────────────────────────────────────

const darkMapStyle = [
  { elementType: 'geometry',            stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#212121' }] },
  { featureType: 'road',                elementType: 'geometry',        stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway',        elementType: 'geometry',        stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'water',               elementType: 'geometry',        stylers: [{ color: '#000000' }] },
  { featureType: 'poi',                 elementType: 'geometry',        stylers: [{ color: '#181818' }] },
];

// ── Tokens ────────────────────────────────────────────────────────────────────

const BRAND   = '#FC4C02';
const BG      = '#0f0f0f';
const SURFACE = '#1a1a1a';
const BORDER  = '#2a2a2a';
const TEXT    = '#f0f0f0';
const MUTED   = '#666';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: BG },
  backBtn:      { width: 40, height: 40, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  backIcon:     { color: TEXT, fontSize: 18 },
  headerTitle:  { fontFamily: 'BebasNeue', fontSize: 26, color: TEXT, letterSpacing: 0.5 },
  headerAccent: { color: BRAND },
  riderCount:   { backgroundColor: 'rgba(76,175,80,0.15)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(76,175,80,0.3)' },
  riderCountText: { fontFamily: 'ChakraPetchBold', fontSize: 11, color: '#4caf50' },

  loadingMap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontFamily: 'ChakraPetch', color: MUTED, fontSize: 13 },

  map: { flex: 1 },

  // Marker
  markerBubble: { backgroundColor: '#1a1a1a', borderRadius: 10, borderWidth: 2, padding: 6, alignItems: 'center', minWidth: 52 },
  markerIcon:   { fontSize: 16 },
  markerName:   { fontFamily: 'ChakraPetchBold', fontSize: 9, color: TEXT, marginTop: 2, maxWidth: 48 },
  markerAlert:  { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#f44336', alignItems: 'center', justifyContent: 'center' },
  markerAlertText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  // Legend
  legend:      { flexDirection: 'row', backgroundColor: BG, borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 20, paddingVertical: 12, gap: 20 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontFamily: 'ChakraPetch', fontSize: 11, color: MUTED },
});