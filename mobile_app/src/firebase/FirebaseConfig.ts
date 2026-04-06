// src/firebase/FirebaseConfig.ts
// Using @react-native-firebase — config is in google-services.json (Android)
// This file just exports typed references to Firebase services

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Enable offline persistence — handles offline sync automatically
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

export { firestore, auth };

// ── Collection helpers ────────────────────────────────────────────────────────
export const Collections = {
  USERS:     'users',
  RIDES:     'rides',
  LOCATIONS: 'locations',
  EVENTS:    'events',
};