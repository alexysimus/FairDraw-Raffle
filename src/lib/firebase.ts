import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where,
  limit,
  writeBatch,
  increment
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { RoomData, ParticipantData, CreateRoomResult, RecoveryRecord } from '../constants';
import { sha256, generateRecoveryPassword } from './hash';

import { mockFirebaseService, mockAuth, ensureMockAuth } from './mockFirebase';

export const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = !isMockMode ? initializeApp(firebaseConfig) : null;
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
export const db = !isMockMode 
  ? (firestoreDatabaseId ? getFirestore(app!, firestoreDatabaseId) : getFirestore(app!)) 
  : (null as any);
export const auth = !isMockMode ? getAuth(app!) : mockAuth;

/**
 * Ensures client is authenticated via Firebase Anonymous Auth in the background (0 friction).
 */
const realEnsureAuth = async (): Promise<FirebaseUser> => {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        // Attempt anonymous sign-in with 1 retry for transient network/shield blocks
        let lastErr: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const cred = await signInAnonymously(auth);
            resolve(cred.user);
            return;
          } catch (err: any) {
            lastErr = err;
            if (attempt === 0 && err?.code === 'auth/network-request-failed') {
              await new Promise(r => setTimeout(r, 600));
            }
          }
        }

        const code = lastErr?.code || '';
        if (
          code === 'auth/configuration-not-found' || 
          code === 'auth/admin-restricted-operation' || 
          code === 'auth/operation-not-allowed'
        ) {
          reject(new Error(
            'Anonymous Authentication is not enabled yet in your Firebase Console. Please open Firebase Console -> Authentication -> Sign-in method and enable "Anonymous".'
          ));
        } else if (code === 'auth/network-request-failed') {
          reject(new Error(
            'Connection to Firebase Auth was blocked by your browser or network. If you are using Brave Browser, uBlock Origin, or an ad blocker, please turn Shields/AdBlock OFF for this site, or add fairdraw.daocongthanh.com to Firebase Authorized Domains.'
          ));
        } else if (code === 'auth/unauthorized-domain') {
          reject(new Error(
            'Domain unauthorized. Please add "fairdraw.daocongthanh.com" to Firebase Console -> Authentication -> Settings -> Authorized domains.'
          ));
        } else {
          reject(lastErr);
        }
      }
    }, reject);
  });
};

export const ensureAuth: () => Promise<any> = isMockMode ? ensureMockAuth : realEnsureAuth;

// Eagerly initialize anonymous identity on startup
if (typeof window !== 'undefined' && !isMockMode) {
  ensureAuth().catch(err => console.warn('Anonymous auth init:', err));
}

// Room code generator: creates memorable short codes like "FD-7842"
export function generateRoomSlug(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0/O, 1/I
  let result = 'FD-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const realFirebaseService = {
  // --- ROOM OPERATIONS ---

  /**
   * Create a new room with a title, organizer PIN, and optional digit count (default: 4)
   * Authenticates creator anonymously, generates high-entropy Admin Key and salted PIN hash.
   */
  createRoom: async (title: string, pin: string, digitsCount = 4): Promise<CreateRoomResult> => {
    const currentUser = await ensureAuth();
    let roomCode = generateRoomSlug();
    
    // Check if code is already taken
    let exists = true;
    for (let attempts = 0; attempts < 5; attempts++) {
      const snap = await getDoc(doc(db, 'rooms', roomCode));
      if (!snap.exists()) {
        exists = false;
        break;
      }
      roomCode = generateRoomSlug();
    }

    if (exists) {
      throw new Error('Unable to allocate a unique room code. Please try again.');
    }

    // Cryptographic salt for backup PIN to defeat rainbow table attacks
    const salt = crypto.randomUUID();
    const pinHash = await sha256(pin.trim() + salt);

    // 128-bit unguessable random token for Host Remote Controller pairing
    const adminKey = crypto.randomUUID();
    const adminKeyHash = await sha256(adminKey);

    const now = Date.now();
    const expireAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days TTL

    const room: RoomData = {
      roomCode,
      title: title.trim(),
      ownerUid: currentUser.uid,
      adminKeyHash,
      salt,
      pinHash,
      digitsCount,
      participantCount: 0,
      createdAt: now,
      lastHostActionAt: now,
      expireAt,
      isRegistrationLocked: false,
      allowRepeatWinners: false,
      isSpinning: false,
      spinStartTime: null,
      currentWinningCode: '',
      currentWinnerName: '',
      showCodesOnStage: false,
      lastUpdated: now,
    };

    // 1. Create Room document
    await setDoc(doc(db, 'rooms', roomCode), room);

    // 2. Store internal secret (completely unreadable by clients, inspected by Firestore Security Rules)
    await setDoc(doc(db, 'rooms', roomCode, '_secrets', 'auth'), {
      pin: pin.trim(),
      adminKey,
      createdAt: now,
    });

    // 3. Register creator as verified authorized host
    await setDoc(doc(db, 'rooms', roomCode, 'hosts', currentUser.uid), {
      uid: currentUser.uid,
      claimedAt: now,
      method: 'creator',
    });

    return { room, adminKey };
  },

  /**
   * Fetch room data once
   */
  getRoom: async (roomCode: string): Promise<RoomData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const snap = await getDoc(doc(db, 'rooms', cleanCode));
    return snap.exists() ? (snap.data() as RoomData) : null;
  },

  /**
   * Real-time subscription to room state
   */
  subscribeToRoom: (roomCode: string, callback: (room: RoomData | null) => void) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const docRef = doc(db, 'rooms', cleanCode);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as RoomData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Room subscription error:', error);
      callback(null);
    });
  },

  /**
   * Verify organizer Admin Key token
   */
  verifyAdminKey: async (roomCode: string, adminKey: string): Promise<boolean> => {
    const room = await firebaseService.getRoom(roomCode);
    if (!room || !room.adminKeyHash) return false;
    const computedHash = await sha256(adminKey.trim());
    return room.adminKeyHash === computedHash;
  },

  /**
   * Verify organizer PIN against room's pinHash (handles salted and legacy hashes)
   */
  verifyRoomPin: async (roomCode: string, pin: string): Promise<boolean> => {
    const room = await firebaseService.getRoom(roomCode);
    if (!room) return false;
    const computedHash = room.salt 
      ? await sha256(pin.trim() + room.salt) 
      : await sha256(pin.trim());
    return room.pinHash === computedHash;
  },

  /**
   * Claim and register Host Remote privileges for the current device's anonymous UID.
   * Validated directly by Cloud Firestore Security Rules against _secrets/auth.
   */
  claimHostRole: async (
    roomCode: string, 
    credentials: { pin?: string; adminKey?: string }
  ): Promise<boolean> => {
    const currentUser = await ensureAuth();
    const cleanCode = roomCode.trim().toUpperCase();
    const payload: Record<string, unknown> = {
      uid: currentUser.uid,
      claimedAt: Date.now(),
      method: credentials.adminKey ? 'adminKey' : 'pin',
    };
    if (credentials.pin) payload.pin = credentials.pin.trim();
    if (credentials.adminKey) payload.adminKey = credentials.adminKey.trim();

    await setDoc(doc(db, 'rooms', cleanCode, 'hosts', currentUser.uid), payload, { merge: true });
    return true;
  },

  /**
   * Check if a specific UID has an active host claim in /hosts subcollection
   */
  isHostClaimed: async (roomCode: string, uid: string): Promise<boolean> => {
    try {
      const cleanCode = roomCode.trim().toUpperCase();
      const snap = await getDoc(doc(db, 'rooms', cleanCode, 'hosts', uid));
      return snap.exists();
    } catch {
      return false;
    }
  },

  /**
   * Update room state (spin, lock, repeat winner settings)
   */
  updateRoomState: async (roomCode: string, pinHash: string | undefined, updates: Partial<RoomData>) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const docRef = doc(db, 'rooms', cleanCode);
    const now = Date.now();
    const updatePayload: Record<string, unknown> = {
      ...updates,
      lastHostActionAt: now,
      expireAt: now + 7 * 24 * 60 * 60 * 1000,
      lastUpdated: now,
    };
    if (pinHash) {
      updatePayload.pinHash = pinHash;
    }
    await updateDoc(docRef, updatePayload);
  },

  /**
   * Permanently delete room and cascade-purge all subcollections:
   * 1. Concurrency Guard: Lock registration immediately to block in-flight sign-ups.
   * 2. Purge /tickets subcollection in chunked batches of 400.
   * 3. Purge /participants subcollection in chunked batches of 400.
   * 4. Purge /hosts subcollection in chunked batches of 400.
   * 5. Delete /_secrets/auth internal secret document.
   * 6. Delete parent /rooms/{roomCode} document.
   */
  deleteRoomCascade: async (roomCode: string): Promise<{ success: boolean; deletedCount: number }> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const currentUser = await ensureAuth();
    const roomRef = doc(db, 'rooms', cleanCode);

    // 1. Concurrency Guard: Lock registration immediately to block any new entrant write
    try {
      await updateDoc(roomRef, {
        isRegistrationLocked: true,
        lastUpdated: Date.now(),
        lastAction: {
          type: 'RESET',
          label: 'Room is being deleted by host',
          timestamp: Date.now(),
        }
      });
    } catch (e) {
      console.warn('Concurrency lock non-fatal warning:', e);
    }

    let totalDeleted = 0;

    // Helper to purge standard subcollections (tickets, participants) in chunks of 400
    const purgeSubcollection = async (subcolName: string) => {
      const colRef = collection(db, 'rooms', cleanCode, subcolName);
      while (true) {
        const snap = await getDocs(query(colRef, limit(400)));
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
        if (snap.size < 400) break;
      }
    };

    // 2. Cascade purge tickets
    await purgeSubcollection('tickets');

    // 3. Cascade purge participants
    await purgeSubcollection('participants');

    // 4. Cascade purge recovery records
    await purgeSubcollection('recovery');

    // 4. Cascade purge OTHER host devices, but preserve caller's host document!
    // CRITICAL: Secondary host devices (paired via PIN or AdminKey) derive host permissions
    // in Cloud Firestore Security Rules from exists(/rooms/{roomCode}/hosts/{request.auth.uid}).
    // If the caller's host document is deleted here, the caller loses host authorization immediately,
    // causing steps 5 and 6 (deleting _secrets/auth and roomRef) to fail with permission-denied.
    try {
      const hostsRef = collection(db, 'rooms', cleanCode, 'hosts');
      const hostsSnap = await getDocs(hostsRef);
      if (!hostsSnap.empty) {
        const otherHostDocs = hostsSnap.docs.filter((d) => d.id !== currentUser.uid);
        for (let i = 0; i < otherHostDocs.length; i += 400) {
          const chunk = otherHostDocs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          totalDeleted += chunk.length;
        }
      }
    } catch (hostsErr) {
      console.warn('Other hosts purge non-fatal warning:', hostsErr);
    }

    // 5. Delete internal auth secret
    try {
      await deleteDoc(doc(db, 'rooms', cleanCode, '_secrets', 'auth'));
      totalDeleted += 1;
    } catch (err) {
      console.warn('Secret auth deletion warning:', err);
    }

    // 6. Delete parent room document (Caller is still authorized as verified host!)
    await deleteDoc(roomRef);
    totalDeleted += 1;

    // 7. Finally, clean up caller's own host document
    try {
      await deleteDoc(doc(db, 'rooms', cleanCode, 'hosts', currentUser.uid));
      totalDeleted += 1;
    } catch (callerHostErr) {
      console.warn('Caller host cleanup non-fatal warning:', callerHostErr);
    }

    return { success: true, deletedCount: totalDeleted };
  },

  /**
   * Delete room alias
   */
  deleteRoom: async (roomCode: string) => {
    return firebaseService.deleteRoomCascade(roomCode);
  },

  // --- PARTICIPANT OPERATIONS ---

  /**
   * Register a participant into a room with collision-free ticket allocation
   * Uses an atomic batch commit to reserve ticket, register participant, and increment room participantCount.
   */
  /**
   * Register a participant into a room with Zero-PII (Name only).
   * Generates a cryptographically strong 8-character recovery password.
   * Atomically commits:
   * 1. Ticket reservation (/tickets/{code})
   * 2. Public participant profile (/participants/{id}) - Zero secret leakage!
   * 3. Private recovery mapping (/recovery/{recoveryHash})
   * 4. Increments room participantCount
   */
  registerParticipant: async (
    roomCode: string, 
    name: string, 
    digitsCount = 4
  ): Promise<{ participant: ParticipantData; recoveryPassword: string }> => {
    const currentUser = await ensureAuth();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = name.trim();

    // 1. Check if room is locked
    const roomRef = doc(db, 'rooms', cleanCode);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Room does not exist.');
    }
    const room = roomSnap.data() as RoomData;
    if (room.isRegistrationLocked) {
      throw new Error('Registration is currently locked by the organizer.');
    }

    // 1.5 If room enforces 1 ticket per device, restore existing pass if already registered
    if (room.isOneTicketPerDevice) {
      const existingDoc = await getDoc(doc(db, 'rooms', cleanCode, 'participants', currentUser.uid));
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as ParticipantData;
        return { participant: existingData, recoveryPassword: '' };
      }
    }

    // 2. Collision-free atomic ticket reservation
    const minCode = Math.pow(10, digitsCount - 1);
    const maxRange = Math.pow(10, digitsCount) - minCode;
    let allocatedCode = '';
    let reserved = false;

    for (let attempt = 0; attempt < 15; attempt++) {
      const candidateNumber = minCode + Math.floor(Math.random() * maxRange);
      const candidateCode = candidateNumber.toString().padStart(digitsCount, '0');

      // Atomic reservation check
      const ticketRef = doc(db, 'rooms', cleanCode, 'tickets', candidateCode);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) {
        allocatedCode = candidateCode;
        reserved = true;
        break;
      }
    }

    if (!reserved) {
      throw new Error('Room is at full capacity or ticket allocation busy. Please try again.');
    }

    // 3. Generate participant ID (bound to auth.uid if 1-ticket mode, or random UUID) and 8-char password
    const participantId = room.isOneTicketPerDevice ? currentUser.uid : crypto.randomUUID();
    const recoveryPassword = generateRecoveryPassword(8);
    const recoveryHash = await sha256(recoveryPassword);

    // 4. Build Participant Document (Zero secret leakage - public readable)
    const participant: ParticipantData = {
      id: participantId,
      roomCode: cleanCode,
      name: cleanName,
      code: allocatedCode,
      recoveryHash,
      uid: currentUser.uid,
      createdAt: Date.now(),
      hasWon: false,
      hasClaimed: false,
    };

    // 5. Build Private Recovery Record (Protected read by hash)
    const recoveryRecord: RecoveryRecord = {
      participantId,
      code: allocatedCode,
      name: cleanName,
      createdAt: Date.now(),
    };

    // 6. Save Atomically
    const batch = writeBatch(db);
    batch.set(doc(db, 'rooms', cleanCode, 'tickets', allocatedCode), { 
      participantId, 
      reservedAt: Date.now() 
    });
    batch.set(doc(db, 'rooms', cleanCode, 'participants', participantId), participant);
    batch.set(doc(db, 'rooms', cleanCode, 'recovery', recoveryHash), recoveryRecord);
    batch.update(roomRef, { 
      participantCount: increment(1),
      lastUpdated: Date.now()
    });
    await batch.commit();

    return { participant, recoveryPassword };
  },

  /**
   * Verified winner claims prize from their mobile device or host verifies winner.
   * Accepts either participant document ID or ticket code.
   * Updates participant document with hasClaimed: true and notifies room via lastAction.
   */
  claimWinnerPrize: async (roomCode: string, participantIdOrCode: string): Promise<boolean> => {
    const cleanCode = roomCode.trim().toUpperCase();
    await ensureAuth();
    const now = Date.now();
    let participantRef = doc(db, 'rooms', cleanCode, 'participants', participantIdOrCode);
    let code = '';

    const directSnap = await getDoc(participantRef);
    if (directSnap.exists()) {
      code = (directSnap.data() as ParticipantData).code || participantIdOrCode;
      await updateDoc(participantRef, {
        hasClaimed: true,
        claimedAt: now,
      });
    } else {
      // Query by ticket code
      const colRef = collection(db, 'rooms', cleanCode, 'participants');
      const q = query(colRef, where('code', '==', participantIdOrCode));
      const snap = await getDocs(q);
      if (!snap.empty) {
        participantRef = snap.docs[0].ref;
        code = (snap.docs[0].data() as ParticipantData).code || participantIdOrCode;
        await updateDoc(participantRef, {
          hasClaimed: true,
          claimedAt: now,
        });
      }
    }

    try {
      const roomRef = doc(db, 'rooms', cleanCode);
      await updateDoc(roomRef, {
        claimedWinnerCode: code || participantIdOrCode,
        lastUpdated: now,
        lastAction: {
          type: 'PRIZE_CLAIMED',
          label: '🎉 Winner Claimed Prize!',
          timestamp: now,
        }
      });
    } catch (e) {
      console.warn('Room claim broadcast note:', e);
    }

    return true;
  },

  /**
   * Mark participant prize as claimed (by ID or ticket code)
   */
  markParticipantClaimed: async (roomCode: string, codeOrId: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const now = Date.now();
    const directRef = doc(db, 'rooms', cleanCode, 'participants', codeOrId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) {
      await updateDoc(directRef, {
        hasClaimed: true,
        claimedAt: now,
      });
      return;
    }
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    const q = query(colRef, where('code', '==', codeOrId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(snap.docs[0].ref, {
        hasClaimed: true,
        claimedAt: now,
      });
    }
  },

  /**
   * Retrieve participant by 8-character recovery password.
   * Direct O(1) single-document read in /recovery/{recoveryHash}.
   */
  getParticipantByRecoveryPassword: async (
    roomCode: string, 
    recoveryPassword: string
  ): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanPassword = recoveryPassword.trim();
    if (!cleanPassword) return null;
    const recoveryHash = await sha256(cleanPassword);
    
    // Direct single-document read in /recovery/{recoveryHash}
    const recoverySnap = await getDoc(doc(db, 'rooms', cleanCode, 'recovery', recoveryHash));
    if (!recoverySnap.exists()) {
      return null;
    }
    const recoveryData = recoverySnap.data() as RecoveryRecord;
    const participantSnap = await getDoc(doc(db, 'rooms', cleanCode, 'participants', recoveryData.participantId));
    return participantSnap.exists() ? (participantSnap.data() as ParticipantData) : null;
  },

  /**
   * Legacy retrieve participant by email (fallback)
   */
  getParticipantByEmail: async (roomCode: string, email: string): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const participantId = await sha256(cleanEmail);
    const snap = await getDoc(doc(db, 'rooms', cleanCode, 'participants', participantId));
    return snap.exists() ? (snap.data() as ParticipantData) : null;
  },

  /**
   * Get participant once by participantId
   */
  getParticipant: async (roomCode: string, participantId: string): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const snap = await getDoc(doc(db, 'rooms', cleanCode, 'participants', participantId));
    return snap.exists() ? (snap.data() as ParticipantData) : null;
  },

  /**
   * Real-time subscription to an individual attendee's ticket document
   * Powers instant real-time winner badge updates without requiring page reload.
   */
  subscribeToParticipant: (
    roomCode: string,
    participantId: string,
    callback: (participant: ParticipantData | null) => void
  ) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const docRef = doc(db, 'rooms', cleanCode, 'participants', participantId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as ParticipantData);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('Participant real-time subscription error:', error);
    });
  },

  /**
   * Lightweight subscription to recent participants (capped at maxLimit to prevent memory crashes at high scale)
   */
  subscribeToRecentParticipants: (roomCode: string, maxLimit = 24, callback: (participants: ParticipantData[]) => void) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    const q = query(colRef, limit(maxLimit));
    return onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as ParticipantData);
      callback(list.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error('Recent participants subscription error:', error);
      callback([]);
    });
  },

  /**
   * Subscribe to all participants in a room (Used strictly on Host Controller where full list is needed)
   */
  subscribeToParticipants: (roomCode: string, callback: (participants: ParticipantData[]) => void) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    return onSnapshot(colRef, (snapshot) => {
      const list = snapshot.docs.map(d => d.data() as ParticipantData);
      callback(list.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      console.error('Participants subscription error:', error);
      callback([]);
    });
  },

  /**
   * Mark winner in room
   */
  markWinner: async (roomCode: string, code: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    const q = query(colRef, where('code', '==', code));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const targetDoc = snap.docs[0];
      await updateDoc(targetDoc.ref, { 
        hasWon: true,
        hasClaimed: false,
        claimedAt: null,
      });
    }
  },

  /**
   * Unmark winner in room (used during Re-Spin / Pass to return forfeited winner to the pool)
   */
  unmarkWinner: async (roomCode: string, code: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    const q = query(colRef, where('code', '==', code));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const targetDoc = snap.docs[0];
      await updateDoc(targetDoc.ref, { 
        hasWon: false,
        hasClaimed: false,
        claimedAt: null,
      });
    }
  },

  /**
   * Reset all winner flags in room
   */
  resetAllDraws: async (roomCode: string, pinHash: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const colRef = collection(db, 'rooms', cleanCode, 'participants');
    const snap = await getDocs(colRef);
    
    // Batch in chunks of 400 to prevent Firestore 500-operation writeBatch limit
    for (let i = 0; i < snap.docs.length; i += 400) {
      const chunk = snap.docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach(d => {
        batch.update(d.ref, { 
          hasWon: false,
          hasClaimed: false,
          claimedAt: null,
        });
      });
      await batch.commit();
    }

    // Reset room state
    const roomRef = doc(db, 'rooms', cleanCode);
    const now = Date.now();
    const roomUpdates: Record<string, unknown> = {
      currentWinningCode: '',
      currentWinnerName: '',
      claimedWinnerCode: null,
      isSpinning: false,
      spinStartTime: null,
      lastHostActionAt: now,
      expireAt: now + 7 * 24 * 60 * 60 * 1000,
      lastUpdated: now,
      lastAction: {
        type: 'RESET',
        label: 'All Draws Reset by Host',
        timestamp: now,
      },
    };
    if (pinHash) {
      roomUpdates.pinHash = pinHash;
    }
    await updateDoc(roomRef, roomUpdates);
  },

  /**
   * Delete participant from room
   */
  deleteParticipant: async (roomCode: string, participantId: string, ticketCode?: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    await deleteDoc(doc(db, 'rooms', cleanCode, 'participants', participantId));
    if (ticketCode) {
      await deleteDoc(doc(db, 'rooms', cleanCode, 'tickets', ticketCode));
    }
  }
};

export const firebaseService = isMockMode ? mockFirebaseService : realFirebaseService;
