/**
 * FairDraw Constants & Data Types
 * Clean, future-proof, multi-tenant architecture
 */

export interface RoomData {
  roomCode: string;               // e.g. "FD-8492" (uppercase slug)
  title: string;                  // e.g. "Tech Meetup Annual Gala"
  ownerUid?: string;              // Creator's Firebase Auth UID (Anonymous or Authenticated)
  adminKeyHash?: string;          // SHA-256 hash of organizer 128-bit Admin Key
  salt?: string;                  // Cryptographic salt for PIN hash
  pinHash: string;                // Salted SHA-256 hash of organizer backup PIN
  digitsCount: number;            // 4, 5, or 6 (default 4)
  participantCount?: number;      // Scalable atomic counter of registered attendees
  createdAt: number;              // Timestamp (epoch ms)
  lastHostActionAt?: number;       // Epoch ms of latest organizer action
  expireAt: number;               // Epoch ms (lastHostActionAt + 7 days for TTL)
  
  // Raffle Engine State
  isRegistrationLocked: boolean;  // When true, new entrants cannot join
  allowRepeatWinners: boolean;    // When true, past winners stay in the drawing pool
  isSpinning: boolean;            // Global flag triggering slot reel animation
  spinStartTime: number | null;   // Epoch ms anchoring multi-device synced animation
  currentWinningCode: string;     // Winning lottery code
  currentWinnerName: string;      // Display name of winning attendee
  showCodesOnStage?: boolean;     // Remote toggle to display participant numbers on Stage screen
  isOneTicketPerDevice?: boolean; // When true, limits to 1 ticket per anonymous UID (Anti-bot/Sybil)
  hasClaimTimer?: boolean;        // When true, triggers 45s countdown when spin finishes
  claimTimerSeconds?: number;     // Default 45
  claimedWinnerCode?: string | null; // Code of winner who claimed
  lastAction?: {                  // Dynamic Island real-time telemetry payload for Stage
    type: 'DRAW_STARTED' | 'LOCK_TOGGLED' | 'REPEAT_TOGGLED' | 'CODES_TOGGLED' | 'RESET' | 'LOCK_DEVICE_TOGGLED' | 'CLAIM_TIMER_TOGGLED' | 'PRIZE_CLAIMED';
    label: string;
    timestamp: number;
  };
  lastUpdated: number;            // Update timestamp
}

export interface CreateRoomResult {
  room: RoomData;
  adminKey: string;               // Unhashed 128-bit token returned ONLY to creator
}

export interface ParticipantData {
  id: string;                     // Unique UUID or deterministic identifier
  roomCode: string;               // Reference to room
  name: string;                   // Display name
  email?: string;                 // Optional legacy email for backward compatibility
  code: string;                   // Lottery ticket number (e.g. "4821")
  recoveryHash?: string;          // 64-char SHA-256 hash of 8-char recovery password
  uid?: string;                   // Anonymous Firebase Auth UID
  createdAt: number;              // Registration epoch ms
  hasWon: boolean;                // Win status
  hasClaimed?: boolean;           // True when winner claims prize on phone
  claimedAt?: number | null;      // Timestamp of prize claim
}

export interface RecoveryRecord {
  participantId: string;          // ID of participant document
  code: string;                   // Ticket number (e.g. "4821")
  name: string;                   // Attendee name
  createdAt: number;              // Registration timestamp
}

export interface SavedPass {
  participantId: string;
  name: string;
  code: string;
  recoveryPassword: string;
  roomCode: string;
  savedAt: number;
}

// Aliases for compatibility
export type Participant = ParticipantData;
export type RaffleState = RoomData;

// Luxury Obsidian & Champagne Gold Palette (Apple HIG inspired)
export const FAIRDRAW_COLORS = {
  OBSIDIAN: '#0B0F19',
  SURFACE: '#121826',
  CARD_DARK: '#1E293B',
  BORDER_DARK: 'rgba(255, 255, 255, 0.1)',
  GOLD: '#F5C542',
  GOLD_HOVER: '#EAB308',
  GOLD_LIGHT: '#FEF08A',
  CRIMSON: '#E11D48',
  SLATE_MUTED: '#94A3B8',
  WHITE: '#FFFFFF',
};

// Staged Slot Machine Reveal Timings (Dynamic based on digit count)
export const RAFFLE_TIMINGS = {
  START_FLICKER_DELAY: 1500, // Time before first reel locks
  PER_DIGIT_INTERVAL: 1500,   // Milliseconds between each subsequent reel locking
  FINALIZE_BUFFER: 1500,     // Buffer before declaring winner name
};
