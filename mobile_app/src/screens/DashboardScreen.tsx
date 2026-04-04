import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  ChakraPetch_400Regular,
  ChakraPetch_700Bold,
} from '@expo-google-fonts/chakra-petch';
import { LinearGradient } from 'expo-linear-gradient';

import { BLEService, BLESensorData } from '../services/BLEService';
import { MobileSensorService, MobileSensorData } from '../services/MobileSensorService';
import { getDistance } from '../utils/GeoMath';

export default function DashboardScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue:      BebasNeue_400Regular,
    ChakraPetch:    ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  // ── Connection state ───────────────────────────────────────────────────────
  const [connected, setConnected]       = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bleError, setBleError]         = useState<string | null>(null);

  // ── Node states ────────────────────────────────────────────────────────────
  const [hardwareNode, setHardwareNode] = useState<BLESensorData | null>(null);
  const [mobileNode, setMobileNode]     = useState<MobileSensorData | null>(null);

  // ── UI toggle ──────────────────────────────────────────────────────────────
  const [activeRiderIndex, setActiveRiderIndex] = useState(0); // 0 = hardware, 1 = mobile

  // ── Pulse animation ────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // ── Connect / Disconnect ───────────────────────────────────────────────────
  const handleConnect = async () => {
    // Prevent double tap while connecting
    if (isConnecting) return;

    // Disconnect flow
    if (connected) {
      BLEService.disconnect();
      MobileSensorService.stopListening();
      setConnected(false);
      setHardwareNode(null);
      setBleError(null);
      return;
    }

    // Connect flow
    setBleError(null);
    setIsConnecting(true);

    const blePerms = await BLEService.requestPermissions();

    if (blePerms) {
      BLEService.scanAndConnect(
        // onDataUpdate
        (data) => setHardwareNode(data),
        // onConnectStatusChange
        (status) => {
          setConnected(status);
          setIsConnecting(false);
          if (!status) {
            setBleError(
              'Could not connect to CYCLINK_NODE.\nMake sure Bluetooth is on and the device is nearby.'
            );
          } else {
            setBleError(null);
          }
        }
      );
    } else {
      setIsConnecting(false);
      setBleError('Bluetooth permissions denied. Please allow Bluetooth access in Settings.');
    }

    // Start mobile sensors regardless of BLE result
    MobileSensorService.startListening((data) => setMobileNode(data));
  };

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      BLEService.disconnect();
      MobileSensorService.stopListening();
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const maxImpact = Math.max(
    hardwareNode?.impact || 0,
    mobileNode?.impact   || 0
  ).toFixed(1);

  const hasValidGPS =
    (hardwareNode?.lat ?? 0) !== 0 &&
    (mobileNode?.lat  ?? 0) !== 0;

  const distance = hasValidGPS
    ? getDistance(
        hardwareNode!.lat, hardwareNode!.lon,
        mobileNode!.lat,   mobileNode!.lon
      )
    : null;

  const activeRiderData =
    activeRiderIndex === 0
      ? {
          name:   'Node 01 · Hardware',
          lat:    hardwareNode?.lat    || 0,
          lon:    hardwareNode?.lon    || 0,
          mode:   hardwareNode?.mode   || 0,
          impact: hardwareNode?.impact || 0,
        }
      : {
          name:   'Node 02 · Mobile',
          lat:    mobileNode?.lat    || 0,
          lon:    mobileNode?.lon    || 0,
          mode:   mobileNode?.mode   || 0,
          impact: mobileNode?.impact || 0,
        };

  const isAlert = activeRiderData.mode > 0;

  const modeLabel: Record<number, string> = {
    0: 'System Online',
    1: 'Alert',
    2: 'Confirmation — Waiting',
    3: 'Emergency — Accident Confirmed',
    4: 'SOS — Manual Trigger',
  };

  // ── Dot color ──────────────────────────────────────────────────────────────
  const dotColor = connected
    ? '#FC4C02'
    : isConnecting
      ? '#FFA500'
      : '#555';

  const connectLabel = connected
    ? 'Linked'
    : isConnecting
      ? 'Connecting...'
      : 'Connect';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            CYCL<Text style={styles.brandAccent}>INK</Text>
          </Text>
          <View
            style={[
              styles.statusPill,
              isAlert && styles.statusPillAlert,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                isAlert && styles.statusPillTextAlert,
              ]}
            >
              {modeLabel[activeRiderData.mode] ?? 'Unknown'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.connectBtn,
            isConnecting && styles.connectBtnDisabled,
          ]}
          onPress={handleConnect}
          disabled={isConnecting}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.connectDot,
              { backgroundColor: dotColor, opacity: pulseAnim },
            ]}
          />
          <Text style={styles.connectBtnText}>{connectLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* ── BLE Error ── */}
      {bleError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{bleError}</Text>
        </View>
      )}

      {/* ── Hero metric strip ── */}
      <LinearGradient
        colors={['#1a1a1a', '#111']}
        style={styles.heroStrip}
      >
        <View style={styles.heroMetric}>
          <Text style={styles.heroValue}>
            {distance !== null ? distance : '—'}
          </Text>
          <Text style={styles.heroUnit}>km</Text>
          <Text style={styles.heroLabel}>Group Distance</Text>
        </View>

        <View style={styles.heroSep} />

        <View style={styles.heroMetric}>
          <Text style={styles.heroValue}>
            {connected ? maxImpact : '—'}
          </Text>
          <Text style={styles.heroUnit}>G</Text>
          <Text style={styles.heroLabel}>Max G-Force</Text>
        </View>
      </LinearGradient>

      {/* ── Telemetry card ── */}
      <View style={styles.telemetryCard}>
        {/* Card header */}
        <View style={styles.telemetryCardHeader}>
          <Text style={styles.telemetryCardTitle}>
            {activeRiderData.name}
          </Text>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() =>
              setActiveRiderIndex(activeRiderIndex === 0 ? 1 : 0)
            }
          >
            <Text style={styles.toggleBtnText}>Switch Node</Text>
          </TouchableOpacity>
        </View>

        {/* Latitude */}
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Latitude</Text>
          <Text style={styles.telemetryValue}>
            {activeRiderData.lat !== 0
              ? `${activeRiderData.lat.toFixed(5)}° N`
              : 'Standby'}
          </Text>
        </View>

        {/* Longitude */}
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Longitude</Text>
          <Text style={styles.telemetryValue}>
            {activeRiderData.lon !== 0
              ? `${activeRiderData.lon.toFixed(5)}° W`
              : 'Standby'}
          </Text>
        </View>

        {/* Impact */}
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>G-Force</Text>
          <Text
            style={[
              styles.telemetryValue,
              activeRiderData.impact > 2
                ? styles.telemetryValueAlert
                : null,
            ]}
          >
            {activeRiderData.impact.toFixed(2)} G
          </Text>
        </View>

        {/* Squad link */}
        <View style={[styles.telemetryRow, styles.telemetryRowLast]}>
          <Text style={styles.telemetryLabel}>Squad</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('RiderManagement')}
          >
            <Text style={styles.telemetryLink}>Manage Ride →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Node status pills ── */}
      <View style={styles.nodeRow}>
        <View
          style={[
            styles.nodePill,
            hardwareNode ? styles.nodePillActive : styles.nodePillInactive,
          ]}
        >
          <Text style={styles.nodePillText}>
            {hardwareNode ? '🔩 Node 01 · Live' : '🔩 Node 01 · Standby'}
          </Text>
        </View>

        <View
          style={[
            styles.nodePill,
            mobileNode ? styles.nodePillActive : styles.nodePillInactive,
          ]}
        >
          <Text style={styles.nodePillText}>
            {mobileNode ? '📱 Node 02 · Live' : '📱 Node 02 · Standby'}
          </Text>
        </View>
      </View>

      {/* ── SOS button ── */}
      <View style={styles.sosWrapper}>
        <TouchableOpacity
          style={styles.sosBtn}
          activeOpacity={0.85}
          onPress={() => {
            // TODO: Fire SOS event to Firebase
            console.log('[SOS] Broadcast triggered');
          }}
        >
          <Text style={styles.sosText}>🚨  Broadcast SOS</Text>
          <Text style={styles.sosSub}>Alert your squad immediately</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Tokens
// ─────────────────────────────────────────────────────────────────────────────
const BRAND   = '#FC4C02';
const BG      = '#0f0f0f';
const SURFACE = '#1a1a1a';
const SURFACE2= '#222';
const BORDER  = '#2a2a2a';
const TEXT    = '#f0f0f0';
const MUTED   = '#666';

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: BRAND,
    fontSize: 14,
    letterSpacing: 2,
    fontFamily: 'ChakraPetch',
  },

  // Root
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 30,
    color: TEXT,
    letterSpacing: 1,
  },
  brandAccent: { color: BRAND },

  // Status pill
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a2e1a',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusPillAlert: { backgroundColor: '#2e1a1a' },
  statusPillText: {
    fontFamily: 'ChakraPetch',
    fontSize: 10,
    color: '#4caf50',
    letterSpacing: 0.5,
  },
  statusPillTextAlert: { color: '#f44336' },

  // Connect button
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectBtnDisabled: { opacity: 0.5 },
  connectDot: { width: 8, height: 8, borderRadius: 4 },
  connectBtnText: {
    fontFamily: 'ChakraPetchBold',
    color: TEXT,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Error banner
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#2e1a1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3d1a1a',
  },
  errorText: {
    fontFamily: 'ChakraPetch',
    color: '#f44336',
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },

  // Hero strip
  heroStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroMetric: {
    flex: 1,
    paddingVertical: 24,
    alignItems: 'center',
  },
  heroValue: {
    fontFamily: 'BebasNeue',
    fontSize: 44,
    color: TEXT,
    lineHeight: 46,
  },
  heroUnit: {
    fontFamily: 'ChakraPetch',
    fontSize: 14,
    color: BRAND,
    marginTop: 2,
  },
  heroLabel: {
    fontFamily: 'ChakraPetch',
    fontSize: 10,
    color: MUTED,
    letterSpacing: 0.5,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  heroSep: {
    width: 1,
    backgroundColor: BORDER,
    marginVertical: 16,
  },

  // Telemetry card
  telemetryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  telemetryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  telemetryCardTitle: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 13,
    color: TEXT,
    letterSpacing: 0.5,
  },
  toggleBtn: {
    backgroundColor: SURFACE2,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnText: {
    fontFamily: 'ChakraPetch',
    fontSize: 11,
    color: BRAND,
    letterSpacing: 0.3,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  telemetryRowLast: { borderBottomWidth: 0 },
  telemetryLabel: {
    fontFamily: 'ChakraPetch',
    fontSize: 12,
    color: MUTED,
    letterSpacing: 0.3,
  },
  telemetryValue: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 13,
    color: TEXT,
    letterSpacing: 0.3,
  },
  telemetryValueAlert: { color: '#f44336' },
  telemetryLink: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 13,
    color: BRAND,
    letterSpacing: 0.3,
  },

  // Node pills
  nodeRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  nodePill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  nodePillActive: {
    backgroundColor: 'rgba(252,76,2,0.08)',
    borderColor: 'rgba(252,76,2,0.3)',
  },
  nodePillInactive: {
    backgroundColor: SURFACE,
    borderColor: BORDER,
  },
  nodePillText: {
    fontFamily: 'ChakraPetch',
    fontSize: 11,
    color: TEXT,
    letterSpacing: 0.3,
  },

  // SOS
  sosWrapper: { flex: 1, justifyContent: 'flex-end', padding: 16 },
  sosBtn: {
    backgroundColor: BRAND,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.5,
  },
  sosSub: {
    fontFamily: 'ChakraPetch',
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 0.3,
  },
});