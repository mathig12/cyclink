// src/services/FirebaseService.ts
// @react-native-firebase v22 modular API — no namespaced calls

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "@react-native-firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "@react-native-firebase/auth";

import { getApp } from "@react-native-firebase/app";

const app = getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RiderNode {
  node_id: string;
  user_id: string;
  user_name: string;
  ride_id: string;
  source: "esp32" | "mobile_host" | "mobile_participant";
  lat: number;
  lon: number;
  impact: number;
  tilt: number;
  mode: number;
  satellites?: number;
  last_updated: number;
}

export interface RideEvent {
  event_id: string;
  type: "SOS" | "ACCIDENT" | "LOST";
  source: "esp32" | "mobile_host" | "mobile_participant";
  user_id: string;
  user_name: string;
  ride_id: string;
  lat: number;
  lon: number;
  timestamp: number;
  status: "active" | "resolved";
}

export interface RideSession {
  ride_id: string;
  host_id: string;
  host_name: string;
  status: "active" | "ended";
  created_at: number;
  ended_at?: number;
}

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  emergency_contact?: { name: string; phone: string };
  created_at: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

class FirebaseServiceManager {
  // ── Auth ───────────────────────────────────────────────────────────────────

  public async register(
    email: string,
    password: string,
    name: string,
    phone?: string,
    emergencyName?: string,
    emergencyPhone?: string,
  ): Promise<string> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user_id = cred.user.uid;

    const profile: UserProfile = {
      user_id,
      name,
      email,
      phone: phone || "",
      emergency_contact:
        emergencyName && emergencyPhone
          ? { name: emergencyName, phone: emergencyPhone }
          : undefined,
      created_at: Date.now(),
    };

    await setDoc(doc(db, "users", user_id), profile);
    console.log("[Firebase] Registered:", user_id);
    return user_id;
  }

  public async login(email: string, password: string): Promise<string> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log("[Firebase] Logged in:", cred.user.uid);
    return cred.user.uid;
  }

  public async logout(): Promise<void> {
    await signOut(auth);
    console.log("[Firebase] Logged out");
  }

  public getCurrentUser() {
    return auth.currentUser;
  }

  public onAuthStateChanged(callback: (user: any) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  public async getUserProfile(user_id: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(db, "users", user_id));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  // ── Ride ───────────────────────────────────────────────────────────────────

  public async createRide(host_id: string, host_name: string): Promise<string> {
    const ride_id = Math.floor(100000 + Math.random() * 900000).toString();

    await setDoc(doc(db, "rides", ride_id), {
      ride_id,
      host_id,
      host_name,
      status: "active",
      created_at: Date.now(),
    } as RideSession);

    console.log("[Firebase] Ride created:", ride_id);
    return ride_id;
  }

  public async joinRide(ride_id: string): Promise<boolean> {
    const snap = await getDoc(doc(db, "rides", ride_id));
    if (!snap.exists()) {
      console.warn("[Firebase] Ride not found:", ride_id);
      return false;
    }
    const ride = snap.data() as RideSession;
    if (ride.status !== "active") {
      console.warn("[Firebase] Ride not active");
      return false;
    }
    console.log("[Firebase] Joined ride:", ride_id);
    return true;
  }

  public async endRide(ride_id: string): Promise<void> {
    await updateDoc(doc(db, "rides", ride_id), {
      status: "ended",
      ended_at: Date.now(),
    });
    console.log("[Firebase] Ride ended:", ride_id);
  }

  // ── Node upload ────────────────────────────────────────────────────────────

  public async uploadNode(node: RiderNode): Promise<void> {
    try {
      await setDoc(
        doc(db, "locations", node.ride_id, "nodes", node.node_id),
        node,
      );
    } catch (e) {
      // Offline — Firestore queues this automatically
      console.warn("[Firebase] uploadNode queued (offline)");
    }
  }

  // ── Listeners ──────────────────────────────────────────────────────────────

  public listenToNodes(
    ride_id: string,
    onUpdate: (nodes: RiderNode[]) => void,
  ): () => void {
    return onSnapshot(collection(db, "locations", ride_id, "nodes"), (snap) =>
      onUpdate(snap.docs.map((d) => d.data() as RiderNode)),
    );
  }

  public listenToEvents(
    ride_id: string,
    onEvent: (event: RideEvent) => void,
  ): () => void {
    const q = query(
      collection(db, "events", ride_id, "alerts"),
      where("status", "==", "active"),
    );
    return onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          onEvent(change.doc.data() as RideEvent);
        }
      });
    });
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  public async writeEvent(event: Omit<RideEvent, "event_id">): Promise<void> {
    const event_id = `${event.user_id}_${event.timestamp}`;
    try {
      await setDoc(doc(db, "events", event.ride_id, "alerts", event_id), {
        ...event,
        event_id,
      });
      console.log("[Firebase] Event written:", event.type);
    } catch (e) {
      console.warn("[Firebase] writeEvent queued (offline)");
    }
  }

  public async resolveEvent(ride_id: string, event_id: string): Promise<void> {
    await updateDoc(doc(db, "events", ride_id, "alerts", event_id), {
      status: "resolved",
    });
  }
}

export const FirebaseService = new FirebaseServiceManager();
