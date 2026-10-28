/**
 * FairDraw In-Memory & LocalStorage Mock Backend
 * 
 * Provides a zero-dependency, zero-configuration local mock mode for FairDraw.
 * Features:
 * - 100% offline evaluation without Firebase credentials
 * - Multi-tab cross-communication on localhost using HTML5 BroadcastChannel API
 * - Automatic localStorage persistence across page reloads
 * - Sample attendee seeder for rapid testing of slot machine animations
 */

import { RoomData, ParticipantData, CreateRoomResult } from '../constants';
import { sha256, generateRecoveryPassword } from './hash';

export const isMockMode = true;

// Mock anonymous user identity
export const mockUser = {
  uid: 'mock_local_uid_' + (typeof window !== 'undefined' ? (window.localStorage.getItem('fairdraw_mock_uid') || (() => {
    const newUid = 'uid_' + Math.random().toString(36).substring(2, 10);
    window.localStorage.setItem('fairdraw_mock_uid', newUid);
    return newUid;
  })()) : 'server_mock_uid'),
  isAnonymous: true,
  email: null,
  displayName: 'Local Organizer',
};

export const ensureMockAuth = async () => mockUser;

export const mockAuth: any = {
  currentUser: mockUser,
  onAuthStateChanged: (callback: (user: typeof mockUser) => void) => {
    callback(mockUser);
    return () => {};
  },
  signInAnonymously: async () => ({ user: mockUser }),
};

// Storage schema in localStorage
interface MockStorageState {
  rooms: Record<string, RoomData>;
  participants: Record<string, ParticipantData[]>; // roomCode -> participants
  adminKeys: Record<string, string>; // roomCode -> rawAdminKey
  recoveryRecords: Record<string, Record<string, ParticipantData>>; // roomCode -> (recoveryHash -> participant)
}

const STORAGE_KEY = 'fairdraw_mock_storage_v1';

// BroadcastChannel for instant cross-tab sync on localhost
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('fairdraw_mock_channel') 
  : null;

// Subscribers registry
type Listener = () => void;
const listeners = new Set<Listener>();

const notifySubscribers = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('Mock listener error:', e);
    }
  });
};

if (channel) {
  channel.onmessage = (event) => {
    if (event.data?.type === 'SYNC') {
      notifySubscribers();
    }
  };
}

const getStore = (): MockStorageState => {
  if (typeof window === 'undefined') {
    return { rooms: {}, participants: {}, adminKeys: {}, recoveryRecords: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rooms: {}, participants: {}, adminKeys: {}, recoveryRecords: {} };
    return JSON.parse(raw);
  } catch {
    return { rooms: {}, participants: {}, adminKeys: {}, recoveryRecords: {} };
  }
};

const saveStore = (state: MockStorageState) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notifySubscribers();
    channel?.postMessage({ type: 'SYNC' });
  } catch (err) {
    console.warn('Failed to save mock state:', err);
  }
};

// Room code generator
function generateRoomSlug(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'FD-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const mockFirebaseService = {
  createRoom: async (title: string, pin: string, digitsCount = 4): Promise<CreateRoomResult> => {
    const state = getStore();
    let roomCode = generateRoomSlug();
    while (state.rooms[roomCode]) {
      roomCode = generateRoomSlug();
    }

    const salt = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36);
    const pinHash = await sha256(pin.trim() + salt);

    const adminKeyBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(adminKeyBytes);
    }
    const adminKey = Array.from(adminKeyBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const adminKeyHash = await sha256(adminKey);

    const now = Date.now();
    const room: RoomData = {
      roomCode,
      title: title.trim(),
      ownerUid: mockUser.uid,
      adminKeyHash,
      salt,
      pinHash,
      digitsCount,
      participantCount: 0,
      createdAt: now,
      lastHostActionAt: now,
      expireAt: now + 7 * 24 * 60 * 60 * 1000,
      isRegistrationLocked: false,
      allowRepeatWinners: false,
      isSpinning: false,
      spinStartTime: null,
      currentWinningCode: '',
      currentWinnerName: '',
      showCodesOnStage: true,
      isOneTicketPerDevice: false,
      hasClaimTimer: true,
      claimTimerSeconds: 45,
      claimedWinnerCode: null,
      lastUpdated: now,
    };

    state.rooms[roomCode] = room;
    state.participants[roomCode] = [];
    state.adminKeys[roomCode] = adminKey;
    state.recoveryRecords[roomCode] = {};

    saveStore(state);
    return { room, adminKey };
  },

  getRoom: async (roomCode: string): Promise<RoomData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    return state.rooms[cleanCode] || null;
  },

  subscribeToRoom: (roomCode: string, callback: (room: RoomData | null) => void) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const handler = () => {
      const state = getStore();
      callback(state.rooms[cleanCode] || null);
    };

    listeners.add(handler);
    handler(); // initial push

    return () => {
      listeners.delete(handler);
    };
  },

  verifyAdminKey: async (roomCode: string, adminKey: string): Promise<boolean> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const room = state.rooms[cleanCode];
    if (!room || !adminKey) return false;
    const computedHash = await sha256(adminKey.trim());
    return room.adminKeyHash === computedHash || state.adminKeys[cleanCode] === adminKey.trim();
  },

  verifyRoomPin: async (roomCode: string, pin: string): Promise<boolean> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const room = state.rooms[cleanCode];
    if (!room || !pin) return false;
    const computedHash = await sha256(pin.trim() + (room.salt || ''));
    return room.pinHash === computedHash;
  },

  claimHostRole: async (
    roomCode: string,
    credentials: { pin?: string; adminKey?: string }
  ): Promise<boolean> => {
    if (credentials.adminKey) {
      return mockFirebaseService.verifyAdminKey(roomCode, credentials.adminKey);
    }
    if (credentials.pin) {
      return mockFirebaseService.verifyRoomPin(roomCode, credentials.pin);
    }
    return true;
  },

  isHostClaimed: async (_roomCode: string, _uid: string): Promise<boolean> => {
    return true; // Local organizer always treated as verified in mock mode
  },

  updateRoomState: async (
    roomCode: string,
    _pinHash: string | undefined,
    updates: Partial<RoomData>
  ): Promise<void> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const existing = state.rooms[cleanCode];
    if (!existing) return;

    state.rooms[cleanCode] = {
      ...existing,
      ...updates,
      lastUpdated: Date.now(),
      lastHostActionAt: Date.now(),
    };

    saveStore(state);
  },

  deleteRoomCascade: async (roomCode: string): Promise<{ success: boolean; deletedCount: number }> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const count = (state.participants[cleanCode] || []).length + 1;
    delete state.rooms[cleanCode];
    delete state.participants[cleanCode];
    delete state.adminKeys[cleanCode];
    delete state.recoveryRecords[cleanCode];
    saveStore(state);
    return { success: true, deletedCount: count };
  },

  deleteRoom: async (roomCode: string) => {
    return mockFirebaseService.deleteRoomCascade(roomCode);
  },

  registerParticipant: async (
    roomCode: string,
    name: string,
    digitsCount = 4
  ): Promise<{ participant: ParticipantData; recoveryPassword: string }> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const room = state.rooms[cleanCode];
    if (!room) throw new Error('Room not found');
    if (room.isRegistrationLocked) throw new Error('Registration is locked by the organizer.');

    const participants = state.participants[cleanCode] || [];
    
    // Determine ticket number
    const maxDigits = digitsCount || room.digitsCount || 4;
    const maxNumber = Math.pow(10, maxDigits);
    const usedCodes = new Set(participants.map(p => p.code));
    let attempts = 0;
    let code = '';
    do {
      const rand = Math.floor(Math.random() * maxNumber);
      code = rand.toString().padStart(maxDigits, '0');
      attempts++;
    } while (usedCodes.has(code) && attempts < 100);

    const recoveryPassword = generateRecoveryPassword();
    const recoveryHash = await sha256(recoveryPassword);

    const participant: ParticipantData = {
      id: 'part_' + Math.random().toString(36).substring(2, 11),
      roomCode: cleanCode,
      name: name.trim(),
      code: code || '0001',
      recoveryHash,
      uid: mockUser.uid,
      createdAt: Date.now(),
      hasWon: false,
      hasClaimed: false,
      claimedAt: null,
    };

    participants.push(participant);
    state.participants[cleanCode] = participants;
    room.participantCount = participants.length;
    room.lastUpdated = Date.now();

    if (!state.recoveryRecords[cleanCode]) state.recoveryRecords[cleanCode] = {};
    state.recoveryRecords[cleanCode][recoveryHash] = participant;

    saveStore(state);
    return { participant, recoveryPassword };
  },

  claimWinnerPrize: async (roomCode: string, participantIdOrCode: string): Promise<boolean> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const participants = state.participants[cleanCode] || [];
    const target = participants.find(p => p.id === participantIdOrCode || p.code === participantIdOrCode);
    if (!target) return false;

    target.hasClaimed = true;
    target.claimedAt = Date.now();
    
    const room = state.rooms[cleanCode];
    if (room) {
      room.claimedWinnerCode = target.code;
      room.lastAction = {
        type: 'PRIZE_CLAIMED',
        label: `${target.name} claimed prize!`,
        timestamp: Date.now(),
      };
      room.lastUpdated = Date.now();
    }

    saveStore(state);
    return true;
  },

  markParticipantClaimed: async (roomCode: string, codeOrId: string) => {
    await mockFirebaseService.claimWinnerPrize(roomCode, codeOrId);
  },

  getParticipantByRecoveryPassword: async (
    roomCode: string,
    recoveryPassword: string
  ): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const hash = await sha256(recoveryPassword.trim());
    return state.recoveryRecords[cleanCode]?.[hash] || null;
  },

  getParticipantByEmail: async (roomCode: string, email: string): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    return (state.participants[cleanCode] || []).find(p => p.email === email.trim()) || null;
  },

  getParticipant: async (roomCode: string, participantId: string): Promise<ParticipantData | null> => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    return (state.participants[cleanCode] || []).find(p => p.id === participantId) || null;
  },

  subscribeToParticipant: (
    roomCode: string,
    participantId: string,
    callback: (participant: ParticipantData | null) => void
  ) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const handler = () => {
      const state = getStore();
      const p = (state.participants[cleanCode] || []).find(item => item.id === participantId) || null;
      callback(p);
    };

    listeners.add(handler);
    handler();

    return () => {
      listeners.delete(handler);
    };
  },

  subscribeToRecentParticipants: (
    roomCode: string,
    maxLimit = 24,
    callback: (participants: ParticipantData[]) => void
  ) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const handler = () => {
      const state = getStore();
      const list = [...(state.participants[cleanCode] || [])]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, maxLimit);
      callback(list);
    };

    listeners.add(handler);
    handler();

    return () => {
      listeners.delete(handler);
    };
  },

  subscribeToParticipants: (roomCode: string, callback: (participants: ParticipantData[]) => void) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const handler = () => {
      const state = getStore();
      const list = [...(state.participants[cleanCode] || [])].sort((a, b) => b.createdAt - a.createdAt);
      callback(list);
    };

    listeners.add(handler);
    handler();

    return () => {
      listeners.delete(handler);
    };
  },

  markWinner: async (roomCode: string, code: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const participants = state.participants[cleanCode] || [];
    const target = participants.find(p => p.code === code);
    if (target) {
      target.hasWon = true;
      target.hasClaimed = false;
      target.claimedAt = null;
      saveStore(state);
    }
  },

  unmarkWinner: async (roomCode: string, code: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const participants = state.participants[cleanCode] || [];
    const target = participants.find(p => p.code === code);
    if (target) {
      target.hasWon = false;
      target.hasClaimed = false;
      target.claimedAt = null;
      saveStore(state);
    }
  },

  resetAllDraws: async (roomCode: string, pinHash: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const participants = state.participants[cleanCode] || [];
    participants.forEach(p => {
      p.hasWon = false;
      p.hasClaimed = false;
      p.claimedAt = null;
    });

    const room = state.rooms[cleanCode];
    if (room) {
      const now = Date.now();
      room.currentWinningCode = '';
      room.currentWinnerName = '';
      room.claimedWinnerCode = null;
      room.isSpinning = false;
      room.spinStartTime = null;
      room.lastHostActionAt = now;
      room.lastUpdated = now;
      room.lastAction = {
        type: 'RESET',
        label: 'All Draws Reset by Host',
        timestamp: now,
      };
      if (pinHash) room.pinHash = pinHash;
    }

    saveStore(state);
  },

  deleteParticipant: async (roomCode: string, participantId: string, _ticketCode?: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    const state = getStore();
    const list = state.participants[cleanCode] || [];
    state.participants[cleanCode] = list.filter(p => p.id !== participantId);
    const room = state.rooms[cleanCode];
    if (room) {
      room.participantCount = state.participants[cleanCode].length;
      room.lastUpdated = Date.now();
    }
    saveStore(state);
  },

  // Developer Seeder: Populate sample attendees with 1 click
  populateDemoParticipants: async (roomCode: string, count = 10): Promise<ParticipantData[]> => {
    const demoNames = [
      'Alex Rivera', 'Sarah Chen', 'Lukas Lindholm', 'Elena Rostova',
      'Minh Nguyen', 'Aapo Virtanen', 'Jessica Taylor', 'David Miller',
      'Noora Korhonen', 'Kenji Sato', 'Sofia Hernandez', 'Matteo Rossi'
    ];

    const added: ParticipantData[] = [];
    for (let i = 0; i < Math.min(count, demoNames.length); i++) {
      const res = await mockFirebaseService.registerParticipant(roomCode, demoNames[i]);
      added.push(res.participant);
    }
    return added;
  }
};
