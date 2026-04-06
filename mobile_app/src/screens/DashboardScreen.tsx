// src/screens/DashboardScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Alert,
} from "react-native";
// ✅ FIXED: Using the correct Safe Area Context to remove the warning
import { SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  ChakraPetch_400Regular,
  ChakraPetch_700Bold,
} from "@expo-google-fonts/chakra-petch";

import { BLEService, BLESensorData } from "../services/BLEService";
import {
  MobileSensorService,
  MobileSensorData,
} from "../services/MobileSensorService";
import { FirebaseService, RiderNode } from "../services/Firebaseservice";
import { DatabaseService } from "../services/DatabaseService";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}

export default function DashboardScreen({ navigation, route }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    ChakraPetch: ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  const rideId: string = route?.params?.ride_id || "";
  const userRole: string = route?.params?.role || "participant";

  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hardwareNode, setHardwareNode] = useState<BLESensorData | null>(null);
  const [mobileNode, setMobileNode] = useState<MobileSensorData | null>(null);
  const [localRideId, setLocalRideId] = useState<string | null>(null);
  const [activeRiderIndex, setActiveRiderIndex] = useState(0);

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
      ]),
    ).start();
    return () => {
      BLEService.disconnect();
      MobileSensorService.stopListening();
    };
  }, []);

  const handleConnect = async () => {
    if (isConnecting) return;
    if (connected) {
      BLEService.disconnect();
      MobileSensorService.stopListening();
      if (localRideId) await DatabaseService.endRide(localRideId);
      setConnected(false);
      setHardwareNode(null);
      return;
    }

    setIsConnecting(true);
    const newLocalRideId = await DatabaseService.createRide();
    setLocalRideId(newLocalRideId);

    if (userRole === "host") {
      const perms = await BLEService.requestPermissions();
      if (perms) {
        BLEService.scanAndConnect(
          (data) => setHardwareNode(data),
          (status) => {
            setConnected(status);
            setIsConnecting(false);
          },
        );
      } else {
        setIsConnecting(false);
      }
    }

    await MobileSensorService.startListening((data) => setMobileNode(data));
    if (userRole !== "host") {
      setConnected(true);
      setIsConnecting(false);
    }
  };

  const handleSOS = async () => {
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user || !rideId) return;
      await FirebaseService.writeEvent({
        type: "SOS",
        source: userRole === "host" ? "mobile_host" : "mobile_participant",
        user_id: user.uid,
        user_name: user.displayName || "Rider",
        ride_id: rideId,
        lat: mobileNode?.lat || 0,
        lon: mobileNode?.lon || 0,
        timestamp: Date.now(),
        status: "active",
      });
      Alert.alert("🚨 SOS SENT", "Emergency alert broadcasted.");
    } catch (error: any) {
      Alert.alert("Failed to send SOS", error.message);
    }
  };

  if (!fontsLoaded) return null;

  const maxImpact = Math.max(
    hardwareNode?.impact || 0,
    mobileNode?.impact || 0,
  ).toFixed(1);
  const hasValidGPS =
    (hardwareNode?.lat ?? 0) !== 0 && (mobileNode?.lat ?? 0) !== 0;
  const distance = hasValidGPS
    ? getDistance(
        hardwareNode!.lat,
        hardwareNode!.lon,
        mobileNode!.lat,
        mobileNode!.lon,
      )
    : null;
  const activeRiderData =
    activeRiderIndex === 0
      ? {
          name: "Node 01 · Hardware",
          lat: hardwareNode?.lat || 0,
          lon: hardwareNode?.lon || 0,
          mode: hardwareNode?.mode || 0,
          impact: hardwareNode?.impact || 0,
          tilt: hardwareNode?.tilt || 0,
        }
      : {
          name: "Node 02 · Mobile",
          lat: mobileNode?.lat || 0,
          lon: mobileNode?.lon || 0,
          mode: mobileNode?.mode || 0,
          impact: mobileNode?.impact || 0,
          tilt: mobileNode?.tilt || 0,
        };

  const dotColor = connected ? BRAND : isConnecting ? "#CBA135" : "#555";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>
            CYCL<Text style={styles.brandAccent}>INK</Text>
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>System Online</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.connectBtn}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          <Animated.View
            style={[
              styles.connectDot,
              { backgroundColor: dotColor, opacity: pulseAnim },
            ]}
          />
          <Text style={styles.connectBtnText}>
            {connected ? "Linked" : isConnecting ? "Connecting..." : "Connect"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroStrip}>
        <View style={styles.heroMetric}>
          <Text style={styles.heroValue}>
            {distance !== null ? distance : "—"}
          </Text>
          <Text style={styles.heroUnit}>km</Text>
          <Text style={styles.heroLabel}>Node Distance</Text>
        </View>
        <View style={styles.heroSep} />
        <View style={styles.heroMetric}>
          <Text style={styles.heroValue}>{connected ? maxImpact : "—"}</Text>
          <Text style={styles.heroUnit}>G</Text>
          <Text style={styles.heroLabel}>Max G-Force</Text>
        </View>
        <View style={styles.heroSep} />
        <View style={styles.heroMetric}>
          <Text style={styles.heroValue}>
            {connected ? activeRiderData.tilt.toFixed(0) : "—"}
          </Text>
          <Text style={styles.heroUnit}>°</Text>
          <Text style={styles.heroLabel}>Tilt</Text>
        </View>
      </View>

      <View style={styles.telemetryCard}>
        <View style={styles.telemetryCardHeader}>
          <Text style={styles.telemetryCardTitle}>{activeRiderData.name}</Text>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setActiveRiderIndex((i) => (i === 0 ? 1 : 0))}
          >
            <Text style={styles.toggleBtnText}>Switch Node</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Latitude</Text>
          <Text style={styles.telemetryValue}>
            {activeRiderData.lat !== 0
              ? `${activeRiderData.lat.toFixed(5)}° N`
              : "Standby"}
          </Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>Longitude</Text>
          <Text style={styles.telemetryValue}>
            {activeRiderData.lon !== 0
              ? `${activeRiderData.lon.toFixed(5)}° E`
              : "Standby"}
          </Text>
        </View>
        <View style={styles.telemetryRow}>
          <Text style={styles.telemetryLabel}>G-Force</Text>
          <Text style={styles.telemetryValue}>
            {activeRiderData.impact.toFixed(2)} G
          </Text>
        </View>
        <View style={[styles.telemetryRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.telemetryLabel}>Squad</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("RiderManagement")}
          >
            <Text style={styles.telemetryLink}>Manage Ride →</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.nodeRow}>
        <View
          style={[
            styles.nodePill,
            hardwareNode ? styles.nodePillActive : styles.nodePillInactive,
          ]}
        >
          <Text style={styles.nodePillText}>
            {hardwareNode ? "🔩 ESP32 · Live" : "🔩 ESP32 · Standby"}
          </Text>
        </View>
        <View
          style={[
            styles.nodePill,
            mobileNode ? styles.nodePillActive : styles.nodePillInactive,
          ]}
        >
          <Text style={styles.nodePillText}>
            {mobileNode ? "📱 Mobile · Live" : "📱 Mobile · Standby"}
          </Text>
        </View>
      </View>

      <View style={styles.sosWrapper}>
        <TouchableOpacity
          style={styles.sosBtn}
          activeOpacity={0.85}
          onPress={handleSOS}
        >
          <Text style={styles.sosText}>🚨 Broadcast SOS</Text>
          <Text style={styles.sosSub}>Alert your squad immediately</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Theme: Machine Cutting Tools ───────────────────────────────────────────────
const BRAND = "#E3C29F";
const BG = "#121212";
const SURFACE = "#1E1E1E";
const BORDER = "#2E2E2E";
const TEXT = "#EAEAEA";
const MUTED = "#888888";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  brandTitle: {
    fontFamily: "BebasNeue",
    fontSize: 30,
    color: TEXT,
    letterSpacing: 1,
  },
  brandAccent: { color: BRAND },
  statusPill: {
    backgroundColor: "rgba(227, 194, 159, 0.1)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontFamily: "ChakraPetch",
    fontSize: 10,
    color: BRAND,
    letterSpacing: 0.5,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectDot: { width: 8, height: 8, borderRadius: 4 },
  connectBtnText: {
    fontFamily: "ChakraPetchBold",
    color: TEXT,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  heroStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
  },
  heroMetric: { flex: 1, paddingVertical: 24, alignItems: "center" },
  heroValue: {
    fontFamily: "BebasNeue",
    fontSize: 36,
    color: TEXT,
    lineHeight: 38,
  },
  heroUnit: {
    fontFamily: "ChakraPetch",
    fontSize: 12,
    color: BRAND,
    marginTop: 2,
  },
  heroLabel: {
    fontFamily: "ChakraPetch",
    fontSize: 9,
    color: MUTED,
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: "uppercase",
  },
  heroSep: { width: 1, backgroundColor: BORDER, marginVertical: 16 },
  telemetryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  telemetryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  telemetryCardTitle: {
    fontFamily: "ChakraPetchBold",
    fontSize: 13,
    color: TEXT,
  },
  toggleBtn: {
    backgroundColor: "#2E2E2E",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnText: { fontFamily: "ChakraPetch", fontSize: 11, color: BRAND },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  telemetryLabel: { fontFamily: "ChakraPetch", fontSize: 12, color: MUTED },
  telemetryValue: { fontFamily: "ChakraPetchBold", fontSize: 13, color: TEXT },
  telemetryLink: { fontFamily: "ChakraPetchBold", fontSize: 13, color: BRAND },
  nodeRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
  },
  nodePill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  nodePillActive: {
    backgroundColor: "rgba(227, 194, 159, 0.1)",
    borderColor: BRAND,
  },
  nodePillInactive: { backgroundColor: SURFACE, borderColor: BORDER },
  nodePillText: { fontFamily: "ChakraPetch", fontSize: 11, color: TEXT },
  sosWrapper: { flex: 1, justifyContent: "flex-end", padding: 16 },
  sosBtn: {
    backgroundColor: BRAND,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  sosText: {
    fontFamily: "ChakraPetchBold",
    fontSize: 18,
    color: "#121212",
    letterSpacing: 0.5,
  },
  sosSub: {
    fontFamily: "ChakraPetch",
    fontSize: 12,
    color: "rgba(18, 18, 18, 0.7)",
    marginTop: 4,
  },
});
