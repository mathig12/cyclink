import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Easing, SafeAreaView, StatusBar } from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { LinearGradient } from 'expo-linear-gradient';

import { BLEService, BLESensorData } from '../services/BLEService';
import { MobileSensorService, MobileSensorData } from '../services/MobileSensorService';
import { getDistance } from '../utils/GeoMath';

export default function DashboardScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    ChakraPetch: ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  const [connected, setConnected] = useState(false);
  
  // Rider States
  const [hardwareNode, setHardwareNode] = useState<BLESensorData | null>(null);
  const [mobileNode, setMobileNode] = useState<MobileSensorData | null>(null);
  
  // UI toggles
  const [activeRiderIndex, setActiveRiderIndex] = useState(0); // 0 = hardware, 1 = mobile
  
  const pulseAnim = useRef(new Animated.Value(connected ? 1 : 0)).current;

  // Pulse animation logic
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Connect BLE and Mobile Sensors
  const handleConnect = async () => {
    if (connected) {
      BLEService.disconnect();
      MobileSensorService.stopListening();
      setConnected(false);
      return;
    }
    
    // Request BLE Perms
    const blePerms = await BLEService.requestPermissions();
    if (blePerms) {
      BLEService.scanAndConnect(
        (data) => setHardwareNode(data),
        (status) => setConnected(status) // only tracks true BLE status
      );
    }

    // Start Mobile Services locally even if BLE doesn't connect
    MobileSensorService.startListening((data) => setMobileNode(data));
    setConnected(true); 
  };
  
  // Clean up
  useEffect(() => {
    return () => {
      BLEService.disconnect();
      MobileSensorService.stopListening();
    };
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>INITIALIZING...</Text>
      </View>
    );
  }

  // Derived calculations
  const maxImpact = Math.max(hardwareNode?.impact || 0, mobileNode?.impact || 0).toFixed(1);
  const distance = getDistance(
    hardwareNode?.lat || 0, 
    hardwareNode?.lon || 0, 
    mobileNode?.lat || 0, 
    mobileNode?.lon || 0
  );

  const activeRiderData = activeRiderIndex === 0 
    ? { name: 'NODE 01 (HARDWARE)', lat: hardwareNode?.lat || 0, lon: hardwareNode?.lon || 0, mode: hardwareNode?.mode || 0, impact: hardwareNode?.impact || 0 }
    : { name: 'NODE 02 (MOBILE)', lat: mobileNode?.lat || 0, lon: mobileNode?.lon || 0, mode: mobileNode?.mode || 0, impact: mobileNode?.impact || 0 };

  const systemStatus = activeRiderData.mode === 0 ? "SYSTEM :: ONLINE" : "SYSTEM :: ALERT/EMERGENCY";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#040404" />
      
      <View style={styles.gridOverlay} />

      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>CYCLINK <Text style={styles.brandSub}>// CORE</Text></Text>
          <Text style={[styles.systemStatusText, { color: activeRiderData.mode > 0 ? '#ff003c' : '#666' }]}>{systemStatus}</Text>
        </View>
        <TouchableOpacity style={styles.connectButton} onPress={handleConnect}>
          <Animated.View style={[
            styles.statusDot, 
            { backgroundColor: connected ? '#ccff00' : '#ff003c', opacity: pulseAnim }
          ]} />
          <Text style={styles.connectText}>{connected ? 'LINKED' : 'SEARCHING'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>GROUP DISTANCE</Text>
          <Text style={styles.metricValue}>{connected && hardwareNode && mobileNode ? distance : '0.00'} <Text style={styles.metricUnit}>KM</Text></Text>
        </View>
        <View style={styles.metricBlockDark}>
          <Text style={styles.metricLabelAlt}>MAX G-FORCE</Text>
          <Text style={styles.metricValueAlt}>{connected ? maxImpact : '0.00'} <Text style={styles.metricUnitAlt}>G</Text></Text>
        </View>
      </View>

      <View style={styles.telemetryBox}>
        <LinearGradient
          colors={['rgba(204, 255, 0, 0.1)', 'transparent']}
          style={styles.telemetryGradient}
        >
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
            <Text style={styles.telemetryTitle}>{activeRiderData.name}</Text>
            <TouchableOpacity onPress={() => setActiveRiderIndex(activeRiderIndex === 0 ? 1 : 0)}>
             <Text style={styles.toggleText}>[ TOGGLE RIDER ]</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel}>LAT</Text>
            <Text style={styles.telemetryData}>{activeRiderData.lat !== 0 ? activeRiderData.lat.toFixed(5) : 'STANDBY'}° N</Text>
          </View>
          <View style={styles.telemetryRow}>
            <Text style={styles.telemetryLabel}>LON</Text>
            <Text style={styles.telemetryData}>{activeRiderData.lon !== 0 ? activeRiderData.lon.toFixed(5) : 'STANDBY'}° W</Text>
          </View>
          <View style={styles.telemetryRow}>
             <Text style={styles.telemetryLabel}>TEAM</Text>
             <TouchableOpacity onPress={() => navigation.navigate('RiderManagement')}>
               <Text style={[styles.telemetryData, { color: '#ccff00', textDecorationLine: 'underline' }]}>MANAGE RIDE -{'>'} </Text>
             </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.sosWrapper}>
        <TouchableOpacity style={styles.sosButton} activeOpacity={0.8}>
          <View style={styles.sosBorder}>
            <Text style={styles.sosText}>S O S</Text>
            <Text style={styles.sosSub}>BROADCAST EMERGENCY</Text>
          </View>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#040404', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ccff00', fontSize: 14, letterSpacing: 4, fontFamily: 'monospace' },
  container: { flex: 1, backgroundColor: '#040404' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.05, borderWidth: 1, borderColor: '#ffffff', transform: [{ scale: 1.5 }, { rotate: '45deg' }] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#222' },
  brandTitle: { fontFamily: 'BebasNeue', fontSize: 36, color: '#ffffff', letterSpacing: 2 },
  brandSub: { color: '#ccff00' },
  systemStatusText: { fontFamily: 'ChakraPetch', fontSize: 10, letterSpacing: 2, marginTop: 4 },
  connectButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#333' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  connectText: { fontFamily: 'ChakraPetchBold', color: '#fff', fontSize: 12, letterSpacing: 1 },
  metricsContainer: { flexDirection: 'row', padding: 16, gap: 16 },
  metricBlock: { flex: 1, backgroundColor: '#ccff00', padding: 20, borderWidth: 1, borderColor: '#ccff00' },
  metricLabel: { fontFamily: 'ChakraPetchBold', fontSize: 10, color: '#000', letterSpacing: 1.5, marginBottom: 8 },
  metricValue: { fontFamily: 'BebasNeue', fontSize: 48, color: '#000', lineHeight: 52 },
  metricUnit: { fontSize: 24 },
  metricBlockDark: { flex: 1, backgroundColor: '#111', padding: 20, borderWidth: 1, borderColor: '#333' },
  metricLabelAlt: { fontFamily: 'ChakraPetchBold', fontSize: 10, color: '#999', letterSpacing: 1.5, marginBottom: 8 },
  metricValueAlt: { fontFamily: 'BebasNeue', fontSize: 48, color: '#fff', lineHeight: 52 },
  metricUnitAlt: { fontSize: 24, color: '#666' },
  telemetryBox: { margin: 16, borderWidth: 1, borderColor: '#ccff00', backgroundColor: '#0a0a0a' },
  telemetryGradient: { padding: 24 },
  telemetryTitle: { fontFamily: 'BebasNeue', color: '#ccff00', fontSize: 24, letterSpacing: 2 },
  toggleText: { fontFamily: 'ChakraPetch', color: '#fff', fontSize: 10, letterSpacing: 1, alignSelf: 'center' },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(204, 255, 0, 0.2)' },
  telemetryLabel: { fontFamily: 'ChakraPetchBold', color: '#ccff00', fontSize: 12, letterSpacing: 2 },
  telemetryData: { fontFamily: 'ChakraPetch', color: '#fff', fontSize: 14, letterSpacing: 1 },
  sosWrapper: { flex: 1, justifyContent: 'flex-end', padding: 24 },
  sosButton: { backgroundColor: '#ff003c', padding: 4 },
  sosBorder: { borderWidth: 2, borderColor: '#000', paddingVertical: 24, alignItems: 'center', justifyContent: 'center' },
  sosText: { fontFamily: 'BebasNeue', fontSize: 64, color: '#000', lineHeight: 64, letterSpacing: 8 },
  sosSub: { fontFamily: 'ChakraPetchBold', fontSize: 14, color: '#000', letterSpacing: 3, marginTop: 8 },
});
