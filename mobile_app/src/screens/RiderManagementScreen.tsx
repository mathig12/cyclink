// src/screens/RiderManagementScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { FirebaseService } from '../services/Firebaseservice';

export default function RiderManagementScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue:       BebasNeue_400Regular,
    ChakraPetch:     ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  // Session state
  const [joinCode,     setJoinCode]     = useState('');
  const [sessionMode,  setSessionMode]  = useState<'idle' | 'hosting' | 'joined'>('idle');
  const [activeCode,   setActiveCode]   = useState('');
  const [userRole,     setUserRole]     = useState<'host' | 'participant'>('participant');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Host ride ─────────────────────────────────────────────────────────────
  const handleHostRide = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = FirebaseService.getCurrentUser();
      if (!user) throw new Error('Not logged in');

      const ride_id = await FirebaseService.createRide(
        user.uid,
        user.displayName || 'Host',
      );

      setActiveCode(ride_id);
      setUserRole('host');
      setSessionMode('hosting');
    } catch (e: any) {
      setError(e.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  // ── Join ride ─────────────────────────────────────────────────────────────
  const handleJoinRide = async () => {
    if (joinCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const exists = await FirebaseService.joinRide(joinCode);
      if (!exists) {
        setError('Ride not found. Check the code and try again.');
        return;
      }
      setActiveCode(joinCode);
      setUserRole('participant');
      setSessionMode('joined');
    } catch (e: any) {
      setError(e.message || 'Failed to join ride');
    } finally {
      setLoading(false);
    }
  };

  // ── Go to dashboard ───────────────────────────────────────────────────────
  const handleStartRide = () => {
    navigation.navigate('Dashboard', {
      ride_id: activeCode,
      role:    userRole,
    });
  };

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (userRole === 'host' && activeCode) {
      await FirebaseService.endRide(activeCode);
    }
    setSessionMode('idle');
    setActiveCode('');
    setJoinCode('');
    setError(null);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading comms...</Text>
      </View>
    );
  }

  // ── Idle state ────────────────────────────────────────────────────────────
  const renderIdleState = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.content}
    >
      {/* Host card */}
      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Host a Ride</Text>
        <Text style={styles.cardSub}>
          Generate a beacon code and share it with your squad.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          activeOpacity={0.8}
          onPress={handleHostRide}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Start Broadcasting</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Join card */}
      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Join a Squad</Text>
        <Text style={styles.cardSub}>Enter the 6-digit beacon frequency.</Text>

        <TextInput
          style={styles.codeInput}
          placeholder="------"
          placeholderTextColor="#333"
          value={joinCode}
          onChangeText={(t) => { setJoinCode(t.replace(/[^0-9]/g, '')); setError(null); }}
          maxLength={6}
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            joinCode.length === 6 && styles.secondaryBtnActive,
            loading && { opacity: 0.6 },
          ]}
          activeOpacity={0.8}
          onPress={handleJoinRide}
          disabled={joinCode.length !== 6 || loading}
        >
          {loading
            ? <ActivityIndicator color={joinCode.length === 6 ? '#FC4C02' : '#666'} />
            : <Text style={[styles.secondaryBtnText, joinCode.length === 6 && styles.secondaryBtnTextActive]}>
                Synchronize
              </Text>
          }
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  // ── Active session ────────────────────────────────────────────────────────
  const renderActiveSession = () => (
    <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>

      {/* Frequency card */}
      <View style={styles.freqCard}>
        <Text style={styles.freqLabel}>Active Frequency</Text>
        <Text style={styles.freqCode}>{activeCode}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>
            {sessionMode === 'hosting' ? '📡  Host · Broadcasting' : '🔗  Participant · Linked'}
          </Text>
        </View>
      </View>

      {/* Instruction */}
      <Text style={styles.sectionLabel}>What to do next</Text>
      <View style={styles.instructCard}>
        {sessionMode === 'hosting'
          ? <>
              <Text style={styles.instructText}>1. Share code <Text style={{ color: '#FC4C02' }}>{activeCode}</Text> with your riders via WhatsApp</Text>
              <Text style={styles.instructText}>2. Ask them to open Cyclink → Join Ride → enter the code</Text>
              <Text style={styles.instructText}>3. Tap Start Ride below to begin tracking</Text>
            </>
          : <>
              <Text style={styles.instructText}>You have joined ride <Text style={{ color: '#FC4C02' }}>{activeCode}</Text></Text>
              <Text style={styles.instructText}>Tap Start Ride below to begin tracking your location</Text>
            </>
        }
      </View>

      {/* Start ride */}
      <TouchableOpacity style={styles.startBtn} onPress={handleStartRide} activeOpacity={0.85}>
        <Text style={styles.startBtnText}>Start Ride →</Text>
      </TouchableOpacity>

      {/* Disconnect */}
      <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.8}>
        <Text style={styles.disconnectBtnText}>
          {sessionMode === 'hosting' ? 'Cancel & End Ride' : 'Leave Ride'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Root ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Squad<Text style={styles.headerAccent}> · Comms</Text>
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {sessionMode === 'idle' ? renderIdleState() : renderActiveSession()}
    </SafeAreaView>
  );
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const BRAND   = '#FC4C02';
const BG      = '#0f0f0f';
const SURFACE = '#1a1a1a';
const SURFACE2= '#222';
const BORDER  = '#2a2a2a';
const TEXT    = '#f0f0f0';
const MUTED   = '#666';

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { color: BRAND, fontSize: 14, letterSpacing: 2, fontFamily: 'ChakraPetch' },
  container:        { flex: 1, backgroundColor: BG },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:      { width: 40, height: 40, backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  backIcon:     { color: TEXT, fontSize: 18 },
  headerTitle:  { fontFamily: 'BebasNeue', fontSize: 26, color: TEXT, letterSpacing: 0.5 },
  headerAccent: { color: MUTED },

  content:    { flex: 1, padding: 16 },

  actionCard: { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 20, marginBottom: 8 },
  cardTitle:  { fontFamily: 'ChakraPetchBold', fontSize: 15, color: TEXT, marginBottom: 4 },
  cardSub:    { fontFamily: 'ChakraPetch', fontSize: 12, color: MUTED, marginBottom: 16, lineHeight: 18 },

  primaryBtn:     { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'ChakraPetchBold', fontSize: 14, color: '#fff', letterSpacing: 0.5 },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontFamily: 'ChakraPetch', color: MUTED, fontSize: 12, marginHorizontal: 12 },

  codeInput: { backgroundColor: '#111', borderWidth: 1, borderColor: BORDER, borderRadius: 12, color: BRAND, fontFamily: 'BebasNeue', fontSize: 36, padding: 14, textAlign: 'center', letterSpacing: 10, marginBottom: 12 },

  secondaryBtn:          { backgroundColor: SURFACE2, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  secondaryBtnActive:    { borderColor: BRAND, backgroundColor: 'rgba(252,76,2,0.1)' },
  secondaryBtnText:      { fontFamily: 'ChakraPetchBold', fontSize: 14, color: MUTED, letterSpacing: 0.5 },
  secondaryBtnTextActive:{ color: BRAND },

  errorBox:  { backgroundColor: '#2e1a1a', borderRadius: 10, borderWidth: 1, borderColor: '#3d1a1a', padding: 12, marginTop: 12 },
  errorText: { fontFamily: 'ChakraPetch', color: '#f44336', fontSize: 12 },

  sectionLabel: { fontFamily: 'ChakraPetchBold', fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },

  freqCard:    { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 24, alignItems: 'center', marginBottom: 20 },
  freqLabel:   { fontFamily: 'ChakraPetch', fontSize: 11, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  freqCode:    { fontFamily: 'BebasNeue', fontSize: 52, color: BRAND, letterSpacing: 10, lineHeight: 58 },
  rolePill:    { marginTop: 12, backgroundColor: 'rgba(252,76,2,0.12)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  rolePillText:{ fontFamily: 'ChakraPetch', fontSize: 12, color: BRAND, letterSpacing: 0.3 },

  instructCard: { backgroundColor: SURFACE, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 18, marginBottom: 16 },
  instructText: { fontFamily: 'ChakraPetch', fontSize: 13, color: TEXT, lineHeight: 22, marginBottom: 6 },

  startBtn:     { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  startBtnText: { fontFamily: 'ChakraPetchBold', fontSize: 15, color: '#fff', letterSpacing: 0.5 },

  disconnectBtn:     { backgroundColor: '#2a1a1a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#3d1a1a' },
  disconnectBtnText: { fontFamily: 'ChakraPetchBold', fontSize: 14, color: '#f44336', letterSpacing: 0.5 },
});