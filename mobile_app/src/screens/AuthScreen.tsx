// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TextInput,
  TouchableOpacity, SafeAreaView, StatusBar,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { ChakraPetch_400Regular, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { FirebaseService } from '../services/Firebaseservice';

type AuthMode = 'login' | 'register';

export default function AuthScreen({ navigation }: any) {
  const [fontsLoaded] = useFonts({
    BebasNeue:       BebasNeue_400Regular,
    ChakraPetch:     ChakraPetch_400Regular,
    ChakraPetchBold: ChakraPetch_700Bold,
  });

  const [mode, setMode] = useState<AuthMode>('login');

  // Login fields
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  // Register extra fields
  const [name,           setName]           = useState('');
  const [phone,          setPhone]          = useState('');
  const [emergencyName,  setEmergencyName]  = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await FirebaseService.login(email.trim(), password);
      navigation.replace('Dashboard');
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError('Name, email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await FirebaseService.register(
        email.trim(),
        password,
        name.trim(),
        phone.trim(),
        emergencyName.trim(),
        emergencyPhone.trim(),
      );
      navigation.replace('Dashboard');
    } catch (e: any) {
      setError(friendlyError(e.code));
    } finally {
      setLoading(false);
    }
  };

  const friendlyError = (code: string): string => {
    switch (code) {
      case 'auth/invalid-email':           return 'Invalid email address.';
      case 'auth/user-not-found':          return 'No account found with this email.';
      case 'auth/wrong-password':          return 'Incorrect password.';
      case 'auth/email-already-in-use':   return 'This email is already registered.';
      case 'auth/weak-password':           return 'Password is too weak.';
      case 'auth/network-request-failed':  return 'No internet connection.';
      default:                             return 'Something went wrong. Please try again.';
    }
  };

  if (!fontsLoaded) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>CYCL<Text style={styles.logoAccent}>INK</Text></Text>
            <Text style={styles.logoSub}>Ride together. Stay safe.</Text>
          </View>

          {/* Tab toggle */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, mode === 'login' && styles.tabActive]}
              onPress={() => { setMode('login'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'register' && styles.tabActive]}
              onPress={() => { setMode('register'); setError(null); }}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form card */}
          <View style={styles.card}>

            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                <Text style={styles.sectionLabel}>Your Details</Text>
                <Field
                  label="Full Name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Arjun Kumar"
                />
                <Field
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />

                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Emergency Contact
                </Text>
                <Field
                  label="Contact Name"
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  placeholder="e.g. Priya Kumar"
                />
                <Field
                  label="Contact Phone"
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                />

                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
                  Account
                </Text>
              </>
            )}

            {/* Shared fields */}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Login' : 'Create Account'}
                  </Text>
              }
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Reusable field component ──────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', autoCapitalize = 'sentences',
  secureTextEntry = false,
}: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#444"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

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
  scroll:    { flexGrow: 1, padding: 20, justifyContent: 'center' },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo:     { fontFamily: 'BebasNeue', fontSize: 52, color: TEXT, letterSpacing: 2 },
  logoAccent: { color: BRAND },
  logoSub:  { fontFamily: 'ChakraPetch', fontSize: 13, color: MUTED, marginTop: 4 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive:     { backgroundColor: BRAND },
  tabText:       { fontFamily: 'ChakraPetchBold', fontSize: 13, color: MUTED },
  tabTextActive: { color: '#fff' },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
  },

  sectionLabel: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 11,
    color: BRAND,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  fieldWrap:  { marginBottom: 14 },
  fieldLabel: {
    fontFamily: 'ChakraPetch',
    fontSize: 11,
    color: MUTED,
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  fieldInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    color: TEXT,
    fontFamily: 'ChakraPetch',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  errorBox: {
    backgroundColor: '#2e1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3d1a1a',
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: 'ChakraPetch',
    color: '#f44336',
    fontSize: 12,
    lineHeight: 18,
  },

  submitBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: 'ChakraPetchBold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.5,
  },
});