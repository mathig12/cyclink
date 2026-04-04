import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  SafeAreaView, TextInput, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';

export default function RiderManagementScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    ChakraPetch: ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  // All state & logic — UNCHANGED
  const [joinCode, setJoinCode] = useState('');
  const [sessionMode, setSessionMode] = useState<'idle' | 'hosting' | 'joined'>('idle');
  const [activeCode, setActiveCode] = useState('');

  const handleHostRide = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setActiveCode(code);
    setSessionMode('hosting');
  };

  const handleJoinRide = () => {
    if (joinCode.length === 6) {
      setActiveCode(joinCode);
      setSessionMode('joined');
    }
  };

  const handleDisconnect = () => {
    setSessionMode('idle');
    setActiveCode('');
    setJoinCode('');
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading comms...</Text>
      </View>
    );
  }

  // ── Idle state ──────────────────────────────────
  const renderIdleState = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.content}
    >
      {/* Host card */}
      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Host a Ride</Text>
        <Text style={styles.cardSub}>
          Generate a beacon code and let your squad link in.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.8}
          onPress={handleHostRide}
        >
          <Text style={styles.primaryBtnText}>Start Broadcasting</Text>
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
          onChangeText={setJoinCode}
          maxLength={6}
          autoCapitalize="characters"
          keyboardType="number-pad"
        />

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            joinCode.length === 6 && styles.secondaryBtnActive,
          ]}
          activeOpacity={0.8}
          onPress={handleJoinRide}
          disabled={joinCode.length !== 6}
        >
          <Text
            style={[
              styles.secondaryBtnText,
              joinCode.length === 6 && styles.secondaryBtnTextActive,
            ]}
          >
            Synchronize
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Active session ───────────────────────────────
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

      {/* Squad list */}
      <Text style={styles.sectionLabel}>Squad Network</Text>
      <View style={styles.squadCard}>
        <View style={styles.riderRow}>
          <View style={[styles.riderAvatar, { backgroundColor: '#2a1a0f' }]}>
            <Text style={styles.riderAvatarText}>Y</Text>
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>You</Text>
            <Text style={styles.riderHandle}>Node 01 · Hardware</Text>
          </View>
          <View style={styles.badgeOnline}>
            <Text style={styles.badgeOnlineText}>Online</Text>
          </View>
        </View>

        <View style={styles.rowDivider} />

        <View style={styles.riderRow}>
          <View style={[styles.riderAvatar, { backgroundColor: '#0f1a2a' }]}>
            <Text style={[styles.riderAvatarText, { color: '#5b9bd5' }]}>C</Text>
          </View>
          <View style={styles.riderInfo}>
            <Text style={styles.riderName}>CYCLINK_NODE_24</Text>
            <Text style={styles.riderHandle}>Node 02 · Mobile</Text>
          </View>
          <View style={styles.badgeSyncing}>
            <Text style={styles.badgeSyncingText}>Syncing</Text>
          </View>
        </View>
      </View>

      {/* Disconnect */}
      <TouchableOpacity
        style={styles.disconnectBtn}
        activeOpacity={0.8}
        onPress={handleDisconnect}
      >
        <Text style={styles.disconnectBtnText}>End Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Root render ──────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>
            Squad<Text style={styles.headerAccent}> · Comms</Text>
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {sessionMode === 'idle' ? renderIdleState() : renderActiveSession()}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────
import { StatusBar } from 'react-native';

const BRAND = '#FC4C02';
const BG = '#0f0f0f';
const SURFACE = '#1a1a1a';
const SURFACE2 = '#222';
const BORDER = '#2a2a2a';
const TEXT = '#f0f0f0';
const MUTED = '#666';

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1, backgroundColor: BG,
    justifyContent: 'center', alignItems: 'center',
  },
  loadingText: {
    color: BRAND, fontSize: 14, letterSpacing: 2, fontFamily: 'ChakraPetch',
  },

  // Root
  container: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40, height: 40,
    backgroundColor: SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { color: TEXT, fontSize: 18 },
  headerTitle: {
    fontFamily: 'BebasNeue',
    fontSize: 26,
    color: TEXT,
    letterSpacing: 0.5,
  },
  headerAccent: { color: MUTED },

  // Content
  content: { flex: 1, padding: 16 },

  // Action card
  actionCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 15,
    color: TEXT,
    marginBottom: 4,
  },
  cardSub: {
    fontFamily: 'ChakraPetch',
    fontSize: 12,
    color: MUTED,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 14,
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: {
    fontFamily: 'ChakraPetch',
    color: MUTED,
    fontSize: 12,
    marginHorizontal: 12,
  },

  // Code input
  codeInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    color: BRAND,
    fontFamily: 'BebasNeue',
    fontSize: 36,
    padding: 14,
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 12,
  },

  // Secondary button
  secondaryBtn: {
    backgroundColor: SURFACE2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryBtnActive: {
    borderColor: BRAND,
    backgroundColor: 'rgba(252,76,2,0.1)',
  },
  secondaryBtnText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 14,
    color: MUTED,
    letterSpacing: 0.5,
  },
  secondaryBtnTextActive: { color: BRAND },

  // Section label
  sectionLabel: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 8,
  },

  // Freq card
  freqCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  freqLabel: {
    fontFamily: 'ChakraPetch',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  freqCode: {
    fontFamily: 'BebasNeue',
    fontSize: 52,
    color: BRAND,
    letterSpacing: 10,
    lineHeight: 58,
  },
  rolePill: {
    marginTop: 12,
    backgroundColor: 'rgba(252,76,2,0.12)',
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rolePillText: {
    fontFamily: 'ChakraPetch',
    fontSize: 12,
    color: BRAND,
    letterSpacing: 0.3,
  },

  // Squad card
  squadCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 20,
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  riderAvatar: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderAvatarText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 15,
    color: BRAND,
  },
  riderInfo: { flex: 1 },
  riderName: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 13,
    color: TEXT,
  },
  riderHandle: {
    fontFamily: 'ChakraPetch',
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  rowDivider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // Badges
  badgeOnline: {
    backgroundColor: '#1a2e1a',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeOnlineText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 10,
    color: '#4caf50',
    letterSpacing: 0.3,
  },
  badgeSyncing: {
    backgroundColor: '#2a2a1a',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeSyncingText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 10,
    color: '#b8a000',
    letterSpacing: 0.3,
  },

  // Disconnect
  disconnectBtn: {
    backgroundColor: '#2a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d1a1a',
  },
  disconnectBtnText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 14,
    color: '#f44336',
    letterSpacing: 0.5,
  },
});