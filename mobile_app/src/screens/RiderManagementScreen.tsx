import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';

export default function RiderManagementScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    ChakraPetch: ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

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
        <Text style={styles.loadingText}>LOADING COMMS...</Text>
      </View>
    );
  }

  const renderIdleState = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.content}
    >
      <Text style={styles.sectionTitle}>[ HOST A SESSION ]</Text>
      <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8} onPress={handleHostRide}>
        <View style={styles.primaryButtonBorder}>
          <Text style={styles.primaryButtonText}>INITIATE RIDE</Text>
          <Text style={styles.primaryButtonSub}>BROADCAST BEACON TO SQUAD</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <Text style={styles.sectionTitle}>[ JOIN SQUAD ]</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>ENTER 6-DIGIT BEACON FREQUENCY</Text>
        <TextInput
          style={styles.input}
          placeholder="XXXXXX"
          placeholderTextColor="#333"
          value={joinCode}
          onChangeText={setJoinCode}
          maxLength={6}
          autoCapitalize="characters"
        />
      </View>
      <TouchableOpacity 
        style={[styles.secondaryButton, joinCode.length === 6 ? styles.secondaryButtonActive : null]} 
        activeOpacity={0.8}
        onPress={handleJoinRide}
        disabled={joinCode.length !== 6}
      >
        <Text style={[styles.secondaryButtonText, joinCode.length === 6 ? styles.secondaryButtonTextActive : null]}>SYNCHRONIZE</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );

  const renderActiveSession = () => (
    <View style={styles.content}>
      <View style={styles.activeSessionHeader}>
        <Text style={styles.activeSessionLabel}>ACTIVE FREQUENCY</Text>
        <Text style={styles.activeSessionCode}>{activeCode}</Text>
        <Text style={styles.activeSessionRole}>
          ROLE: {sessionMode === 'hosting' ? 'HOST DEPLOYED' : 'PARTICIPANT LINKED'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>[ SQUAD NETWORK ]</Text>
      <ScrollView style={styles.squadList}>
        {/* Mocked Rider List */}
        <View style={styles.riderItem}>
          <Text style={styles.riderName}>YOU</Text>
          <Text style={styles.riderStatus}>ONLINE</Text>
        </View>
        <View style={styles.riderItem}>
          <Text style={styles.riderName}>CYCLINK_NODE_24</Text>
          <Text style={styles.riderStatusPending}>SYNCING...</Text>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.disconnectButton} activeOpacity={0.8} onPress={handleDisconnect}>
        <Text style={styles.disconnectButtonText}>TERMINATE CONNECTION</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gridOverlay} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>{'<-'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RIDER MGT <Text style={styles.headerSub}>// COMMS</Text></Text>
      </View>

      {sessionMode === 'idle' ? renderIdleState() : renderActiveSession()}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, backgroundColor: '#040404', justifyContent: 'center', alignItems: 'center',
  },
  loadingText: { color: '#ccff00', fontSize: 14, letterSpacing: 4, fontFamily: 'monospace' },
  container: { flex: 1, backgroundColor: '#040404' },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject, opacity: 0.05, borderWidth: 1, borderColor: '#ffffff',
    transform: [{ scale: 1.5 }, { rotate: '45deg' }],
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#222' },
  backBtn: { marginRight: 16, padding: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#333' },
  backIcon: { color: '#ccff00', fontFamily: 'ChakraPetchBold', fontSize: 16 },
  headerTitle: { fontFamily: 'BebasNeue', fontSize: 32, color: '#ffffff', letterSpacing: 2 },
  headerSub: { color: '#666' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  sectionTitle: { fontFamily: 'ChakraPetchBold', color: '#ccff00', fontSize: 14, letterSpacing: 2, marginBottom: 16 },
  primaryButton: { backgroundColor: '#ccff00', padding: 4, marginBottom: 32 },
  primaryButtonBorder: { borderWidth: 2, borderColor: '#000', paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontFamily: 'BebasNeue', fontSize: 40, color: '#000', lineHeight: 40, letterSpacing: 4 },
  primaryButtonSub: { fontFamily: 'ChakraPetchBold', fontSize: 10, color: '#000', letterSpacing: 2, marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#222' },
  dividerText: { color: '#666', fontFamily: 'ChakraPetchBold', marginHorizontal: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontFamily: 'ChakraPetch', color: '#999', fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', color: '#ccff00', fontFamily: 'BebasNeue', fontSize: 32, padding: 16, textAlign: 'center', letterSpacing: 8 },
  secondaryButton: { backgroundColor: '#111', borderWidth: 1, borderColor: '#333', paddingVertical: 16, alignItems: 'center' },
  secondaryButtonActive: { borderColor: '#ccff00', backgroundColor: 'rgba(204, 255, 0, 0.1)' },
  secondaryButtonText: { fontFamily: 'ChakraPetchBold', color: '#666', fontSize: 16, letterSpacing: 4 },
  secondaryButtonTextActive: { color: '#ccff00' },

  activeSessionHeader: { borderWidth: 1, borderColor: '#ccff00', backgroundColor: 'rgba(20, 20, 20, 0.8)', padding: 24, marginBottom: 32, alignItems: 'center' },
  activeSessionLabel: { fontFamily: 'ChakraPetchBold', color: '#999', fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  activeSessionCode: { fontFamily: 'BebasNeue', color: '#ccff00', fontSize: 64, letterSpacing: 16, lineHeight: 64 },
  activeSessionRole: { fontFamily: 'ChakraPetch', color: '#fff', fontSize: 12, letterSpacing: 2, marginTop: 12 },
  squadList: { flex: 1, marginBottom: 24 },
  riderItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  riderName: { fontFamily: 'ChakraPetchBold', color: '#fff', fontSize: 16, letterSpacing: 2 },
  riderStatus: { fontFamily: 'ChakraPetchBold', color: '#ccff00', fontSize: 12, letterSpacing: 2 },
  riderStatusPending: { fontFamily: 'ChakraPetchBold', color: '#666', fontSize: 12, letterSpacing: 2 },
  disconnectButton: { backgroundColor: '#ff003c', paddingVertical: 16, alignItems: 'center' },
  disconnectButtonText: { fontFamily: 'ChakraPetchBold', color: '#000', fontSize: 16, letterSpacing: 4 },
});
