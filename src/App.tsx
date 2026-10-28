import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  User, 
  Trophy, 
  Settings, 
  LogIn, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  RefreshCw, 
  RotateCcw,
  Trash2, 
  AlertTriangle,
  X, 
  Plus, 
  KeyRound, 
  Sparkles,
  Layers,
  QrCode,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Ticket,
  ExternalLink,
  ChevronRight,
  Smartphone,
  LogOut,
  ShieldAlert,
  Users,
  Timer,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { firebaseService, ensureAuth, isMockMode } from './lib/firebase';
import { sha256 } from './lib/hash';
import { RoomData, ParticipantData, SavedPass, FAIRDRAW_COLORS } from './constants';
import { SlotMachine } from './components/SlotMachine';
import { TicketLoungeModal } from './components/TicketLoungeModal';
import { hasSeenSessionAd } from './hooks/useTicketAd';
import { trackEvent, trackPageView } from './lib/analytics';
import { shareWinnerCard } from './lib/shareCard';

const SeoLandingSection = React.lazy(() => import('./components/SeoLandingSection'));

// Reveal timing config (in milliseconds)
const RAFFLE_CONFIG = {
  PER_DIGIT_REVEAL: 1500,
  BASE_SPIN_DURATION: 3000,
  FINALIZE_BUFFER: 1500,
};

enum View {
  HUB = 'hub',
  REGISTER = 'register',
  RETRIEVE = 'retrieve',
  STAGE = 'stage',
  MY_CODE = 'my-code',
  HOST = 'host'     // Dedicated Host Remote Controller
}

export default function App() {
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'create' || params.get('view') === 'hub') {
      return null;
    }
    const queryRoom = params.get('r');
    if (queryRoom) {
      const clean = queryRoom.trim().toUpperCase();
      return clean.startsWith('FD-') ? clean : `FD-${clean}`;
    }
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('r=')) {
      const clean = hash.replace('r=', '').trim().toUpperCase();
      return clean.startsWith('FD-') ? clean : `FD-${clean}`;
    }
    return localStorage.getItem('fairdraw_active_room') || null;
  });

  const [adminKey, setAdminKey] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('adminKey') || sessionStorage.getItem('fairdraw_admin_key') || null;
  });

  const [adminPinHash, setAdminPinHash] = useState<string | null>(() => {
    return sessionStorage.getItem('fairdraw_admin_pin_hash') || null;
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return !!(sessionStorage.getItem('fairdraw_admin_key') || sessionStorage.getItem('fairdraw_admin_pin_hash'));
  });

  // Intelligent initial view
  const [currentView, setCurrentView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryView = params.get('view');
    const queryKey = params.get('adminKey') || sessionStorage.getItem('fairdraw_admin_key');

    if (!currentRoomCode) return View.HUB;
    if (queryKey) return View.HOST;
    if (queryView === 'stage' || queryView === 'raffle') return View.STAGE;
    if (sessionStorage.getItem('fairdraw_admin_pin_hash')) return View.HOST;
    const savedPass = localStorage.getItem(`fairdraw_pass_${currentRoomCode}`);
    const savedEmail = localStorage.getItem(`fairdraw_room_${currentRoomCode}_email`);
    if (savedPass || savedEmail) return View.MY_CODE;
    return View.REGISTER;
  });

  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [currentUser, setCurrentUser] = useState<ParticipantData | null>(null);
  const [currentRecoveryPassword, setCurrentRecoveryPassword] = useState<string | null>(() => {
    if (!currentRoomCode) return null;
    try {
      const raw = localStorage.getItem(`fairdraw_pass_${currentRoomCode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.recoveryPassword || null;
      }
    } catch {}
    return null;
  });
  const [savedPasses, setSavedPasses] = useState<SavedPass[]>(() => {
    if (!currentRoomCode) return [];
    try {
      const raw = localStorage.getItem(`fairdraw_saved_passes_${currentRoomCode}`);
      return raw ? JSON.parse(raw) : [];
    } catch {}
    return [];
  });
  const [showSwitchPassModal, setShowSwitchPassModal] = useState(false);
  const [showTicketLounge, setShowTicketLounge] = useState(false);

  const [showCodes, setShowCodes] = useState(false);
  const [showEmails, setShowEmails] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLaunchpadModal, setShowLaunchpadModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [lastCreatedAdminKey, setLastCreatedAdminKey] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageAlert, setStageAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals for Hub
  const [showCreateModal, setShowCreateModal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('action') === 'create';
  });
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [concludedRoomCode, setConcludedRoomCode] = useState<string | null>(null);
  const [roomActionFeedback, setRoomActionFeedback] = useState<string | null>(null);

  // Active saved pass on this device for instant 1-tap return from Hub
  const [activeSavedPass, setActiveSavedPass] = useState<{ roomCode: string; ticketCode: string; name: string } | null>(() => {
    try {
      const activeCode = localStorage.getItem('fairdraw_active_room');
      if (activeCode) {
        const raw = localStorage.getItem(`fairdraw_pass_${activeCode}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            roomCode: activeCode,
            ticketCode: parsed.code || '',
            name: parsed.name || '',
          };
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fairdraw_pass_')) {
          const roomCode = key.replace('fairdraw_pass_', '');
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            return {
              roomCode,
              ticketCode: parsed.code || '',
              name: parsed.name || '',
            };
          }
        }
      }
    } catch {}
    return null;
  });

  const activeRoomRef = useRef<RoomData | null>(null);
  const currentViewRef = useRef<View>(currentView);
  const isDeletingRoomRef = useRef(false);

  useEffect(() => {
    activeRoomRef.current = room;
  }, [room]);

  useEffect(() => {
    currentViewRef.current = currentView;
    trackPageView(currentView);
  }, [currentView]);

  const isStageMode = currentView === View.STAGE;

  // Keep room code synced in localStorage and URL
  useEffect(() => {
    if (currentRoomCode) {
      localStorage.setItem('fairdraw_active_room', currentRoomCode);
      const url = new URL(window.location.href);
      url.searchParams.set('r', currentRoomCode);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.toString());
    } else {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') !== 'create') {
        localStorage.removeItem('fairdraw_active_room');
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('r');
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentRoomCode]);

  // Track Fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fallback
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  // Subscribe to Room and Attendees
  useEffect(() => {
    if (!currentRoomCode) {
      setRoom(null);
      setParticipants([]);
      setCurrentUser(null);
      setIsAdmin(false);
      setCurrentView(View.HUB);
      return;
    }

    const unsubRoom = firebaseService.subscribeToRoom(currentRoomCode, async (roomData) => {
      if (!roomData) {
        // If client was actively connected in stage, pass, or host controller, display graceful wrap-up screen
        // BUT if this specific host device initiated the deletion, skip wrap-up and let handleDeleteRoom transition smoothly
        if (
          !isDeletingRoomRef.current &&
          activeRoomRef.current && 
          (currentViewRef.current === View.STAGE || currentViewRef.current === View.MY_CODE || currentViewRef.current === View.HOST)
        ) {
          setConcludedRoomCode(currentRoomCode);
        } else if (!isDeletingRoomRef.current) {
          setError('Room not found or expired.');
        }

        setRoom(null);
        setCurrentRoomCode(null);
        setParticipants([]);
        setCurrentUser(null);
        setIsAdmin(false);
        setAdminPinHash(null);
        localStorage.removeItem(`fairdraw_room_${currentRoomCode}_email`);
        localStorage.removeItem(`fairdraw_pass_${currentRoomCode}`);
        localStorage.removeItem('fairdraw_active_room');
        sessionStorage.removeItem('fairdraw_admin_pin_hash');
        sessionStorage.removeItem('fairdraw_admin_key');
        setCurrentView(View.HUB);
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        if (roomData.expireAt && Date.now() > roomData.expireAt) {
          setError('This event has expired after 7 days of inactivity.');
          setRoom(null);
          setCurrentRoomCode(null);
          setParticipants([]);
          setCurrentUser(null);
          setIsAdmin(false);
          setAdminPinHash(null);
          localStorage.removeItem(`fairdraw_room_${currentRoomCode}_email`);
          localStorage.removeItem(`fairdraw_pass_${currentRoomCode}`);
          localStorage.removeItem('fairdraw_active_room');
          sessionStorage.removeItem('fairdraw_admin_pin_hash');
          sessionStorage.removeItem('fairdraw_admin_key');
          setCurrentView(View.HUB);
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        setRoom(roomData);
        
        // Verify admin privilege across multiple identification vectors:
        try {
          const authUser = await ensureAuth();
          let isUserHost = false;

          // Check A: Is this client the room creator?
          if (authUser && authUser.uid === roomData.ownerUid) {
            isUserHost = true;
          }

          // Check B: Has this client claimed host rights in /hosts/{uid}?
          if (!isUserHost && authUser) {
            const hasClaim = await firebaseService.isHostClaimed(currentRoomCode, authUser.uid);
            if (hasClaim) {
              isUserHost = true;
            }
          }

          // Check C: 128-bit Admin Key pairing token
          const currentKey = adminKey || sessionStorage.getItem('fairdraw_admin_key');
          if (currentKey && roomData.adminKeyHash) {
            const computedHash = await sha256(currentKey);
            if (computedHash === roomData.adminKeyHash) {
              isUserHost = true;
              firebaseService.claimHostRole(currentRoomCode, { adminKey: currentKey }).catch(err => {
                console.warn('Host claim error:', err);
              });
            }
          }

          // Check D: Session PIN hash fallback
          const savedPin = sessionStorage.getItem('fairdraw_admin_pin_hash');
          if (savedPin && savedPin === roomData.pinHash) {
            isUserHost = true;
          }

          if (isUserHost) {
            setIsAdmin(true);
            setAdminPinHash(roomData.pinHash);
          }
        } catch (authErr) {
          console.warn('Host verification check encountered non-fatal error:', authErr);
        }
      }
    });

    // Lightweight subscription capped at 24 entries to prevent out-of-memory at high scale
    const unsubParticipants = firebaseService.subscribeToRecentParticipants(currentRoomCode, 24, setParticipants);

    // Auto-restore saved ticket on this phone
    const savedPassRaw = localStorage.getItem(`fairdraw_pass_${currentRoomCode}`);
    if (savedPassRaw) {
      try {
        const passData = JSON.parse(savedPassRaw);
        if (passData.participantId) {
          firebaseService.getParticipant(currentRoomCode, passData.participantId).then(user => {
            if (user) {
              setCurrentUser(user);
              setCurrentRecoveryPassword(passData.recoveryPassword || null);
              setCurrentView(prev => prev === View.REGISTER ? View.MY_CODE : prev);
            }
          });
        }
      } catch {}
    } else {
      const savedEmail = localStorage.getItem(`fairdraw_room_${currentRoomCode}_email`);
      if (savedEmail) {
        firebaseService.getParticipantByEmail(currentRoomCode, savedEmail).then(user => {
          if (user) {
            setCurrentUser(user);
            setCurrentView(prev => prev === View.REGISTER ? View.MY_CODE : prev);
          }
        });
      }
    }

    return () => {
      unsubRoom();
      unsubParticipants();
    };
  }, [currentRoomCode, adminKey]);

  // Real-time live subscription to current attendee's ticket document
  // Ensures winner status, ticket changes, and draw resets reflect immediately without page reload
  useEffect(() => {
    if (!currentRoomCode || !currentUser?.id) return;
    const unsub = firebaseService.subscribeToParticipant(
      currentRoomCode,
      currentUser.id,
      (updatedUser) => {
        if (updatedUser) {
          setCurrentUser(updatedUser);
        }
      }
    );
    return () => unsub();
  }, [currentRoomCode, currentUser?.id]);

  // Create Room
  const handleCreateRoom = async (title: string, pin: string, digitsCount: number) => {
    setLoading(true);
    setError(null);
    try {
      const { room: newRoom, adminKey: newAdminKey } = await firebaseService.createRoom(title, pin, digitsCount);
      setAdminKey(newAdminKey);
      setLastCreatedAdminKey(newAdminKey);
      sessionStorage.setItem('fairdraw_admin_key', newAdminKey);
      if (newRoom.pinHash) {
        setAdminPinHash(newRoom.pinHash);
        sessionStorage.setItem('fairdraw_admin_pin_hash', newRoom.pinHash);
      }
      setIsAdmin(true);
      setCurrentRoomCode(newRoom.roomCode);
      setShowCreateModal(false);
      setShowLaunchpadModal(true); // Open the Organizer Launchpad Dialog!
      setCurrentView(View.HOST);
      trackEvent('create_room_success', { digits_count: digitsCount });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not create room.');
    } finally {
      setLoading(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (rawCode: string) => {
    setLoading(true);
    setError(null);
    try {
      let code = rawCode.trim().toUpperCase();
      if (!code.startsWith('FD-')) {
        code = `FD-${code}`;
      }
      const roomData = await firebaseService.getRoom(code);
      if (!roomData) {
        setError('Room not found. Please double check the code.');
        return;
      }
      if (roomData.expireAt && Date.now() > roomData.expireAt) {
        setError('This event has expired after 7 days of inactivity.');
        return;
      }
      setCurrentRoomCode(roomData.roomCode);
      setShowJoinModal(false);
      trackEvent('join_room_success', { method: 'manual_code' });
      
      const savedPassRaw = localStorage.getItem(`fairdraw_pass_${roomData.roomCode}`);
      if (savedPassRaw) {
        try {
          const passData = JSON.parse(savedPassRaw);
          if (passData.participantId) {
            const user = await firebaseService.getParticipant(roomData.roomCode, passData.participantId);
            if (user) {
              setCurrentUser(user);
              setCurrentRecoveryPassword(passData.recoveryPassword || null);
              setCurrentView(View.MY_CODE);
              return;
            }
          }
        } catch {}
      }

      const savedEmail = localStorage.getItem(`fairdraw_room_${roomData.roomCode}_email`);
      if (savedEmail) {
        const user = await firebaseService.getParticipantByEmail(roomData.roomCode, savedEmail);
        if (user) {
          setCurrentUser(user);
          setCurrentView(View.MY_CODE);
          return;
        }
      }
      setCurrentView(View.REGISTER);
    } catch {
      setError('Error connecting to room.');
    } finally {
      setLoading(false);
    }
  };

  // Return to an existing active ticket pass on this device from the Hub
  const handleReturnToActivePass = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const roomData = await firebaseService.getRoom(code);
      if (!roomData) {
        setError('Room not found or expired.');
        return;
      }
      setCurrentRoomCode(roomData.roomCode);
      const savedPassRaw = localStorage.getItem(`fairdraw_pass_${roomData.roomCode}`);
      if (savedPassRaw) {
        try {
          const passData = JSON.parse(savedPassRaw);
          if (passData.participantId) {
            const user = await firebaseService.getParticipant(roomData.roomCode, passData.participantId);
            if (user) {
              setCurrentUser(user);
              setCurrentRecoveryPassword(passData.recoveryPassword || null);
              setCurrentView(View.MY_CODE);
              return;
            }
          }
        } catch {}
      }
      setCurrentView(View.REGISTER);
    } catch {
      setError('Error connecting to active pass.');
    } finally {
      setLoading(false);
    }
  };

  // Register attendee (Zero-PII, Name only)
  const handleRegister = async (name: string) => {
    if (!currentRoomCode || !room) return;
    setLoading(true);
    setError(null);
    try {
      const { participant, recoveryPassword } = await firebaseService.registerParticipant(
        currentRoomCode, 
        name, 
        room.digitsCount || 4
      );
      setCurrentUser(participant);
      setCurrentRecoveryPassword(recoveryPassword);

      const passData: SavedPass = {
        participantId: participant.id,
        name: participant.name,
        code: participant.code,
        recoveryPassword,
        roomCode: currentRoomCode,
        savedAt: Date.now()
      };
      localStorage.setItem(`fairdraw_pass_${currentRoomCode}`, JSON.stringify(passData));

      // Maintain recent passes history on this device for seamless switching
      try {
        const existingSavedRaw = localStorage.getItem(`fairdraw_saved_passes_${currentRoomCode}`);
        const existingSaved: SavedPass[] = existingSavedRaw ? JSON.parse(existingSavedRaw) : [];
        const updatedSaved = [passData, ...existingSaved.filter(p => p.participantId !== participant.id)];
        localStorage.setItem(`fairdraw_saved_passes_${currentRoomCode}`, JSON.stringify(updatedSaved));
        setSavedPasses(updatedSaved);
      } catch {}

      trackEvent('ticket_minted', { is_first_ticket: !hasSeenSessionAd() });

      if (!hasSeenSessionAd()) {
        setShowTicketLounge(true);
      } else {
        setCurrentView(View.MY_CODE);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Find existing ticket by 8-character recovery password
  const handleRetrieve = async (password: string) => {
    if (!currentRoomCode) return;
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseService.getParticipantByRecoveryPassword(currentRoomCode, password);
      if (user) {
        setCurrentUser(user);
        const cleanPassword = password.trim();
        setCurrentRecoveryPassword(cleanPassword);

        const passData: SavedPass = {
          participantId: user.id,
          name: user.name,
          code: user.code,
          recoveryPassword: cleanPassword,
          roomCode: currentRoomCode,
          savedAt: Date.now()
        };
        localStorage.setItem(`fairdraw_pass_${currentRoomCode}`, JSON.stringify(passData));

        try {
          const existingSavedRaw = localStorage.getItem(`fairdraw_saved_passes_${currentRoomCode}`);
          const existingSaved: SavedPass[] = existingSavedRaw ? JSON.parse(existingSavedRaw) : [];
          const updatedSaved = [passData, ...existingSaved.filter(p => p.participantId !== user.id)];
          localStorage.setItem(`fairdraw_saved_passes_${currentRoomCode}`, JSON.stringify(updatedSaved));
          setSavedPasses(updatedSaved);
        } catch {}

        trackEvent('ticket_restored', { success: true });
        setCurrentView(View.MY_CODE);
      } else {
        setError('No ticket found with this recovery password in this room.');
      }
    } catch {
      setError('Search error. Please verify your password and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchPass = () => {
    if (currentRoomCode) {
      localStorage.removeItem(`fairdraw_pass_${currentRoomCode}`);
      localStorage.removeItem(`fairdraw_room_${currentRoomCode}_email`);
    }
    setCurrentUser(null);
    setCurrentRecoveryPassword(null);
    setShowSwitchPassModal(false);
    setCurrentView(View.REGISTER);
  };

  const handleSelectSavedPass = async (saved: SavedPass) => {
    if (!currentRoomCode) return;
    localStorage.setItem(`fairdraw_pass_${currentRoomCode}`, JSON.stringify(saved));
    setCurrentRecoveryPassword(saved.recoveryPassword);
    setShowSwitchPassModal(false);
    trackEvent('ticket_switched', { action: 'switch_pass' });
    
    // Refresh participant data from server if possible
    try {
      const liveUser = await firebaseService.getParticipant(currentRoomCode, saved.participantId);
      if (liveUser) {
        setCurrentUser(liveUser);
      } else {
        setCurrentUser({
          id: saved.participantId,
          name: saved.name,
          code: saved.code,
          roomCode: saved.roomCode,
          createdAt: saved.savedAt,
          hasWon: false
        });
      }
    } catch {
      setCurrentUser({
        id: saved.participantId,
        name: saved.name,
        code: saved.code,
        roomCode: saved.roomCode,
        createdAt: saved.savedAt,
        hasWon: false
      });
    }
    setCurrentView(View.MY_CODE);
  };

  const handleExitRoom = () => {
    if (currentRoomCode) {
      localStorage.removeItem(`fairdraw_room_${currentRoomCode}_email`);
      localStorage.removeItem(`fairdraw_pass_${currentRoomCode}`);
      localStorage.removeItem('fairdraw_active_room');
    }
    setCurrentRoomCode(null);
    setRoom(null);
    setParticipants([]);
    setCurrentUser(null);
    setCurrentRecoveryPassword(null);
    setShowSwitchPassModal(false);
    setIsAdmin(false);
    setAdminPinHash(null);
    sessionStorage.removeItem('fairdraw_admin_pin_hash');
    sessionStorage.removeItem('fairdraw_admin_key');
    setCurrentView(View.HUB);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleDeleteRoom = async () => {
    if (!room) return;
    const deletedCode = room.roomCode;
    isDeletingRoomRef.current = true;
    try {
      await firebaseService.deleteRoomCascade(deletedCode);
      handleExitRoom();
      setRoomActionFeedback(`Room #${deletedCode} was permanently deleted. All event data cleared.`);
      setTimeout(() => {
        setRoomActionFeedback(null);
      }, 6000);
    } catch (err: any) {
      console.error('Room deletion failed:', err);
      isDeletingRoomRef.current = false;
      throw err;
    } finally {
      setTimeout(() => {
        isDeletingRoomRef.current = false;
      }, 2000);
    }
  };

  const handleStageTriggerDraw = async () => {
    if (!room || room.isSpinning) return;

    if (!isAdmin) {
      setShowRecoveryModal(true);
      return;
    }

    const candidates = room.allowRepeatWinners
      ? participants
      : participants.filter((p: ParticipantData) => !p.hasWon);

    if (candidates.length === 0) {
      setStageAlert('⚠️ No entrants in the pool to draw! Please add participants first.');
      setTimeout(() => setStageAlert(null), 4000);
      return;
    }

    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    const startTime = Date.now();
    const digitsCount = room.digitsCount || 4;
    const totalSpinDuration = RAFFLE_CONFIG.BASE_SPIN_DURATION + (digitsCount * RAFFLE_CONFIG.PER_DIGIT_REVEAL) + RAFFLE_CONFIG.FINALIZE_BUFFER;

    try {
      trackEvent('draw_spin_started', {
        source: 'stage_clicker',
        allow_repeats: Boolean(room.allowRepeatWinners),
        has_timer: Boolean(room.hasClaimTimer),
        digits_count: digitsCount
      });

      await firebaseService.updateRoomState(room.roomCode, adminPinHash || undefined, {
        isSpinning: true,
        spinStartTime: startTime,
        currentWinningCode: winner.code,
        currentWinnerName: '',
        claimedWinnerCode: null,
        lastAction: {
          type: 'DRAW_STARTED',
          label: '⚡ Live Draw Started (Keynote Clicker)',
          timestamp: startTime,
        }
      });

      await new Promise(r => setTimeout(r, totalSpinDuration));

      await firebaseService.updateRoomState(room.roomCode, adminPinHash || undefined, {
        isSpinning: false,
        currentWinningCode: winner.code,
        currentWinnerName: winner.name,
      });

      await firebaseService.markWinner(room.roomCode, winner.code);
    } catch (err: any) {
      console.error('Stage draw trigger error:', err);
      setStageAlert(err?.message || 'Error triggering draw.');
      setTimeout(() => setStageAlert(null), 4000);
    }
  };

  const handleClaimPrize = async () => {
    if (!room || !currentUser) return;
    try {
      trackEvent('prize_claim_tapped', { has_timer: Boolean(room.hasClaimTimer) });
      await firebaseService.claimWinnerPrize(room.roomCode, currentUser.id);
      setCurrentUser(prev => prev ? { ...prev, hasClaimed: true } : null);
    } catch (err: any) {
      console.error('Failed to claim prize:', err);
    }
  };

  const handleVerifyWinnerNow = async () => {
    if (!room || !room.currentWinningCode) return;
    try {
      trackEvent('prize_verified_by_host', { has_timer: Boolean(room.hasClaimTimer) });
      await firebaseService.updateRoomState(room.roomCode, adminPinHash || undefined, {
        claimedWinnerCode: room.currentWinningCode,
        lastAction: {
          type: 'PRIZE_CLAIMED',
          label: '🎉 Winner Verified by Host!',
          timestamp: Date.now(),
        }
      });
      await firebaseService.markParticipantClaimed(room.roomCode, room.currentWinningCode);
    } catch (err: any) {
      console.error('Failed to verify winner:', err);
    }
  };

  const isPassActive = currentView === View.MY_CODE || currentView === View.REGISTER || currentView === View.RETRIEVE;
  const isHostActive = currentView === View.HOST;

  return (
    <div 
      className={`min-h-screen font-sans selection:bg-amber-200 selection:text-amber-950 overflow-x-hidden flex flex-col transition-colors duration-500 ${
        isStageMode 
          ? 'bg-[#080C14] text-white' 
          : 'bg-[#F5F5F7] text-slate-900'
      }`}
    >
      {/* Apple HIG Local Mock Mode Indicator */}
      {isMockMode && (
        <aside 
          aria-label="Local Preview Status"
          className="fixed bottom-3 right-3 z-50 pointer-events-auto"
        >
          <div className="px-3.5 py-1.5 rounded-full bg-[#0B0F19]/90 border border-[#F5C542]/30 text-[#F5C542] text-[11px] font-semibold tracking-wide backdrop-blur-2xl flex items-center gap-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <span className="w-2 h-2 rounded-full bg-[#F5C542] animate-pulse shrink-0 shadow-[0_0_8px_#F5C542]" />
            <span>Local Mock Mode &middot; Cross-Tab Synced</span>
          </div>
        </aside>
      )}
      {/* Apple HIG Frosted Top Navigation Bar */}
      <header 
        className={`sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between backdrop-blur-2xl transition-all duration-300 border-b max-w-full ${
          isStageMode 
            ? 'bg-[#080C14]/85 border-white/[0.08]' 
            : 'bg-white/80 border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.03)]'
        }`}
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <button 
            onClick={handleExitRoom} 
            className="flex items-center gap-2 sm:gap-2.5 group active:scale-[0.97] transition-all"
            title="Return to Home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
              FD
            </div>
            <div className="flex items-center">
              <span className={`font-black text-base sm:text-lg tracking-tight hidden min-[360px]:inline ${isStageMode ? 'text-white' : 'text-slate-950'}`}>
                Fair<span className="text-amber-500">Draw</span>
              </span>
              {room && (
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider hidden md:inline-block ${
                  isStageMode 
                    ? 'bg-white/10 text-amber-300 border border-white/10' 
                    : 'bg-black/[0.05] text-slate-700 border border-black/[0.05]'
                }`}>
                  #{room.roomCode}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Apple Segmented View Switcher & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink-0">
          {!room && activeSavedPass && (
            <button
              onClick={() => handleReturnToActivePass(activeSavedPass.roomCode)}
              className="px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/25 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-[0.97] cursor-pointer shadow-sm"
              title="Return to your live event ticket"
            >
              <Ticket size={13} className="text-amber-600 flex-shrink-0" />
              <span>Ticket #{activeSavedPass.roomCode}</span>
              <span className="text-amber-700/70 font-mono hidden min-[440px]:inline">({activeSavedPass.ticketCode})</span>
              <span className="text-[11px] text-amber-700 font-bold ml-0.5">→</span>
            </button>
          )}

          {room && (
            <div className={`p-0.5 sm:p-1 rounded-full flex items-center gap-0.5 sm:gap-1 border transition-all ${
              isStageMode 
                ? 'bg-white/[0.06] border-white/10' 
                : 'bg-black/[0.04] border-black/[0.06]'
            }`}>
              {/* Attendee Pass / Join Tab */}
              <button
                onClick={() => setCurrentView(currentUser ? View.MY_CODE : View.REGISTER)}
                className={`px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 active:scale-[0.96] flex-shrink-0 ${
                  isPassActive
                    ? 'bg-white text-slate-950 shadow-sm'
                    : isStageMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
                title={currentUser ? 'My Ticket Pass' : 'Join Room'}
                aria-label={currentUser ? 'My Ticket Pass' : 'Join Room'}
              >
                <Ticket size={13} className="flex-shrink-0" />
                <span className={isPassActive ? 'inline' : 'hidden sm:inline'}>
                  <span className="hidden sm:inline">{currentUser ? 'My Pass' : 'Join'}</span>
                  <span className="sm:hidden">{currentUser ? 'Pass' : 'Join'}</span>
                </span>
              </button>

              {/* Stage View Tab */}
              <button
                onClick={() => setCurrentView(View.STAGE)}
                className={`px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 active:scale-[0.96] flex-shrink-0 ${
                  isStageMode
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
                title="Stage Presentation Display"
                aria-label="Stage Presentation Display"
              >
                <Trophy size={13} className="flex-shrink-0" />
                <span className={isStageMode ? 'inline' : 'hidden sm:inline'}>Stage</span>
              </button>

              {/* Host Remote Tab (Only visible when verified as admin) */}
              {isAdmin && (
                <button
                  onClick={() => setCurrentView(View.HOST)}
                  className={`px-2 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 active:scale-[0.96] flex-shrink-0 ${
                    isHostActive
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                  title="Host Remote Controller"
                  aria-label="Host Remote Controller"
                >
                  <Smartphone size={13} className="flex-shrink-0" />
                  <span className={isHostActive ? 'inline' : 'hidden sm:inline'}>
                    <span className="hidden sm:inline">Host Remote</span>
                    <span className="sm:hidden">Remote</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Discreet Host PIN Recovery trigger (When not currently admin) */}
          {room && !isAdmin && (
            <button
              onClick={() => setShowRecoveryModal(true)}
              className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-[0.95] flex-shrink-0 ${
                isStageMode 
                  ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                  : 'text-slate-500 hover:text-slate-950 hover:bg-black/[0.05]'
              }`}
              title="Host Access Recovery"
              aria-label="Host Access Recovery"
            >
              <KeyRound size={16} />
            </button>
          )}

          {/* QR Code trigger */}
          {room && (
            <button
              onClick={() => setShowQrModal(true)}
              className={`p-1.5 sm:p-2 rounded-full transition-all active:scale-[0.95] flex-shrink-0 ${
                isStageMode 
                  ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-black/[0.05]'
              }`}
              title="Show QR Code"
              aria-label="Show Public Audience QR Code"
            >
              <QrCode size={16} />
            </button>
          )}

          {/* Fullscreen toggle (Stage only) */}
          {room && isStageMode && (
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full transition-all active:scale-[0.95] text-slate-300 hover:text-white hover:bg-white/10 hidden sm:flex flex-shrink-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}

          {/* Exit Room */}
          {room && (
            <button
              onClick={handleExitRoom}
              className={`p-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold transition-all active:scale-[0.96] flex items-center gap-1 flex-shrink-0 ${
                isStageMode 
                  ? 'text-slate-400 hover:text-white hover:bg-white/10' 
                  : 'text-slate-500 hover:text-slate-950 hover:bg-black/[0.05]'
              }`}
              title="Exit Room"
              aria-label="Exit Room"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Canvas */}
      <main className={`max-w-4xl mx-auto p-4 sm:p-8 w-full flex-1 flex flex-col ${currentView === View.HUB ? 'justify-start' : 'justify-center'}`}>
        <AnimatePresence mode="wait">
          {/* VIEW: HUB */}
          {currentView === View.HUB && (
            <HubView 
              key="hub" 
              onCreateClick={() => {
                trackEvent('create_room_opened', { source: 'hero_card' });
                setShowCreateModal(true);
              }} 
              onJoinClick={() => {
                trackEvent('join_room_opened', { source: 'hero_card' });
                setShowJoinModal(true);
              }} 
              error={error} 
              feedback={roomActionFeedback}
            />
          )}

          {/* VIEW: REGISTER */}
          {currentView === View.REGISTER && room && (
            <RegisterForm 
              key="reg" 
              room={room}
              onRegister={handleRegister} 
              onSwitch={() => setCurrentView(View.RETRIEVE)} 
              onWatchStage={() => setCurrentView(View.STAGE)}
              error={error} 
              loading={loading} 
              isLocked={room.isRegistrationLocked} 
            />
          )}

          {/* VIEW: RESTORE TICKET */}
          {currentView === View.RETRIEVE && room && (
            <RetrieveForm 
              key="ret" 
              room={room}
              onRetrieve={handleRetrieve} 
              onSwitch={() => setCurrentView(View.REGISTER)} 
              error={error} 
              loading={loading} 
            />
          )}

          {/* VIEW: POCKET TICKET PASS (Authentic Apple Wallet Pass Design) */}
          {currentView === View.MY_CODE && currentUser && room && (
            <MyCodeView 
              key="my" 
              room={room}
              user={currentUser} 
              recoveryPassword={currentRecoveryPassword}
              isWinner={
                room.allowRepeatWinners 
                  ? (room.currentWinningCode === currentUser.code && !room.isSpinning)
                  : Boolean(currentUser.hasWon || (room.currentWinningCode === currentUser.code && !room.isSpinning))
              } 
              onSwitchPass={() => setShowSwitchPassModal(true)} 
              onWatchStage={() => setCurrentView(View.STAGE)}
              onClaimPrize={handleClaimPrize}
            />
          )}

          {/* VIEW: STAGE / RAFFLE BOARD (Clean Presentation Theater) */}
          {currentView === View.STAGE && room && (
            <RaffleBoard 
              key="raffle" 
              room={room} 
              participants={participants} 
              showCodes={showCodes}
              showEmails={showEmails}
              isAdmin={isAdmin}
              stageAlert={stageAlert}
              onTriggerDraw={handleStageTriggerDraw}
              onVerifyWinnerNow={handleVerifyWinnerNow}
              onRequireHostAuth={() => setShowRecoveryModal(true)}
              onOpenQr={() => setShowQrModal(true)}
              onToggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
            />
          )}

          {/* VIEW: DEDICATED HOST REMOTE CONTROLLER */}
          {currentView === View.HOST && room && (
            <HostRemoteView
              key="host"
              room={room}
              pinHash={adminPinHash}
              adminKey={adminKey}
              participants={participants}
              showCodes={showCodes}
              setShowCodes={setShowCodes}
              showEmails={showEmails}
              setShowEmails={setShowEmails}
              onOpenStage={() => {
                const stageUrl = `${window.location.origin}/?r=${room.roomCode}&view=stage`;
                window.open(stageUrl, '_blank');
              }}
              onOpenQr={() => setShowQrModal(true)}
              onOpenPairing={() => setShowLaunchpadModal(true)}
              onDeleteRoom={handleDeleteRoom}
            />
          )}
        </AnimatePresence>
      </main>

      {/* MODAL: Host Launchpad */}
      <AnimatePresence>
        {showLaunchpadModal && room && (
          <HostLaunchpadModal 
            room={room}
            adminKey={lastCreatedAdminKey || adminKey || ''}
            onClose={() => setShowLaunchpadModal(false)}
            onOpenStage={() => {
              setShowLaunchpadModal(false);
              setCurrentView(View.STAGE);
            }}
            onOpenHost={() => {
              setShowLaunchpadModal(false);
              setCurrentView(View.HOST);
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Emergency Host PIN Recovery */}
      <AnimatePresence>
        {showRecoveryModal && room && (
          <EmergencyRecoveryModal
            room={room}
            onClose={() => setShowRecoveryModal(false)}
            onSuccess={(verifiedPinHash?: string) => {
              const hash = verifiedPinHash || room.pinHash;
              setIsAdmin(true);
              setAdminPinHash(hash);
              sessionStorage.setItem('fairdraw_admin_pin_hash', hash);
              setShowRecoveryModal(false);
              setCurrentView(View.HOST);
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Switch Ticket Pass */}
      <AnimatePresence>
        {showSwitchPassModal && currentUser && (
          <SwitchPassModal
            user={currentUser}
            recoveryPassword={currentRecoveryPassword}
            savedPasses={savedPasses}
            onClose={() => setShowSwitchPassModal(false)}
            onSwitch={handleSwitchPass}
            onSelectPass={handleSelectSavedPass}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Ticket Lounge Ad (Shown only once per browser session on registration) */}
      <AnimatePresence>
        {showTicketLounge && currentUser && (
          <TicketLoungeModal
            isOpen={showTicketLounge}
            onClose={() => {
              setShowTicketLounge(false);
              setCurrentView(View.MY_CODE);
            }}
            onComplete={() => {
              setShowTicketLounge(false);
              setCurrentView(View.MY_CODE);
            }}
            ticketCode={currentUser.code}
            attendeeName={currentUser.name}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Create Room */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRoomModal 
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRoom}
            loading={loading}
            error={error}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Join Room */}
      <AnimatePresence>
        {showJoinModal && (
          <JoinRoomModal 
            onClose={() => setShowJoinModal(false)}
            onJoin={handleJoinRoom}
            loading={loading}
            error={error}
          />
        )}
      </AnimatePresence>

      {/* MODAL: QR Code Display */}
      <AnimatePresence>
        {showQrModal && room && (
          <QrCodeModal 
            room={room}
            onClose={() => setShowQrModal(false)}
          />
        )}
      </AnimatePresence>

      {/* MODAL: Event Concluded Wrap-Up */}
      <AnimatePresence>
        {concludedRoomCode && (
          <EventConcludedModal 
            roomCode={concludedRoomCode} 
            onClose={() => {
              setConcludedRoomCode(null);
              setCurrentView(View.HUB);
              window.history.replaceState({}, '', window.location.pathname);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// --- SUB-COMPONENTS & VIEWS (Apple HIG) ---
// ==========================================

/**
 * Hub Landing View (Apple Bento Style)
 */
const HubView = ({ onCreateClick, onJoinClick, error, feedback }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 16 }} 
    animate={{ opacity: 1, y: 0 }} 
    exit={{ opacity: 0, y: -16 }}
    transition={{ duration: 0.25 }}
    className="py-6 sm:py-14 text-center max-w-3xl mx-auto w-full px-2"
  >
    {/* Apple HIG Subtle Status Pill */}
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs font-bold mb-6 shadow-sm">
      <Sparkles size={13} className="text-amber-600" />
      Real-Time, Ephemeral Lucky Draws
    </div>

    {/* Google Sans Hero Headline */}
    <h1 className="text-5xl sm:text-7xl font-black text-slate-950 tracking-tight leading-none mb-4">
      Fair<span className="text-amber-500">Draw</span>
    </h1>

    <p className="text-slate-600 text-base sm:text-lg mb-10 leading-relaxed max-w-lg mx-auto font-normal">
      Simple, live giveaways for events, meetups, and streams. No account sign-up needed. Create a room or join with a code in seconds.
    </p>

    {feedback && (
      <div className="mb-6 p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-bold border border-emerald-200 shadow-sm max-w-md mx-auto flex items-center justify-center gap-2">
        <Check size={16} className="text-emerald-600 flex-shrink-0" />
        <span>{feedback}</span>
      </div>
    )}

    {error && (
      <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-sm font-semibold border border-red-200 shadow-sm max-w-md mx-auto">
        {error}
      </div>
    )}

    {/* Apple Bento Grid Action Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
      {/* Create Room Bento */}
      <button 
        onClick={onCreateClick}
        className="p-7 rounded-[28px] bg-slate-950 text-white font-bold shadow-xl hover:bg-slate-900 active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3 group border border-slate-800 text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black group-hover:rotate-90 transition-transform duration-300 shadow-md">
          <Plus size={24} />
        </div>
        <div className="text-center">
          <span className="tracking-tight text-xl font-black block">Create a Room</span>
          <span className="text-xs text-slate-400 font-normal mt-0.5 block">Host a live giveaway stage</span>
        </div>
      </button>

      {/* Join Room Bento */}
      <button 
        onClick={onJoinClick}
        className="p-7 rounded-[28px] bg-white text-slate-950 font-bold shadow-md hover:border-amber-400 border border-black/[0.08] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-3 group text-left"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center font-black group-hover:scale-105 transition-transform duration-300">
          <Layers size={24} />
        </div>
        <div className="text-center">
          <span className="tracking-tight text-xl font-black block">Join a Room</span>
          <span className="text-xs text-slate-500 font-normal mt-0.5 block">Enter with a 6-character code</span>
        </div>
      </button>
    </div>

    {/* Feature highlight row */}
    <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs font-medium text-slate-500">
      <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" /> No signup required</span>
      <span className="hidden sm:inline opacity-40">•</span>
      <span className="flex items-center gap-1.5"><Ticket size={14} className="text-amber-600 flex-shrink-0" /> Digital Lucky Pass</span>
      <span className="hidden sm:inline opacity-40">•</span>
      <span className="flex items-center gap-1.5"><QrCode size={14} className="text-blue-600 flex-shrink-0" /> Instant QR check-in</span>
    </div>

    {/* Below-the-fold SEO, GEO & Story Showcase (Lazy-loaded, Zero-bloat) */}
    <React.Suspense fallback={null}>
      <SeoLandingSection />
    </React.Suspense>
  </motion.div>
);

/**
 * Apple HIG Create Room Sheet Modal
 */
const CreateRoomModal = ({ onClose, onCreate, loading, error }: any) => {
  const [title, setTitle] = useState('');
  const [pin, setPin] = useState('');
  const [digits, setDigits] = useState(4);

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pin) return;
    onCreate(title, pin, digits);
  };

  return (
    <div 
      onClick={() => {
        if (!loading) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <motion.div 
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-black/[0.06] my-auto cursor-default"
        >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        <h3 className="text-2xl font-black text-slate-950 mb-1 tracking-tight">Create a Draw Room</h3>
        <p className="text-xs text-slate-600 font-medium mb-6">Set an event title and a secret PIN to protect host controls.</p>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <span className="text-sm select-none mt-0.5">⚠️</span>
            <div className="flex-1">
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Event Title</label>
            <input 
              required
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Badminton Club Lucky Draw"
              className="w-full px-4 py-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none font-medium text-slate-950 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Host Secret PIN</label>
            <input 
              required
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)}
              placeholder="4 to 8 numbers for host controls"
              className="w-full px-4 py-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none font-medium text-slate-950 text-sm transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Ticket Capacity</label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-black/[0.04] rounded-2xl border border-black/[0.04]">
              {[4, 5, 6].map(num => (
                <button
                  type="button"
                  key={num}
                  onClick={() => setDigits(num)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center flex flex-col items-center justify-center ${
                    digits === num 
                      ? 'bg-white text-slate-950 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-950 font-bold'
                  }`}
                >
                  <span className="font-black text-xs">{num} Digits</span>
                  <span className="text-[10px] opacity-80 font-medium">
                    {num === 4 ? '10k cap' : num === 5 ? '100k cap' : '1M cap'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-full shadow-lg mt-4 disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
          >
            {loading ? 'Creating...' : 'Create & Open Stage'}
          </button>
        </form>
      </motion.div>
      </div>
    </div>
  );
};

/**
 * Apple HIG Join Room Modal (Fixed Affix Brand Pill & Escape Dismiss)
 */
const JoinRoomModal = ({ onClose, onJoin, loading, error }: any) => {
  const [suffix, setSuffix] = useState('');

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  const cleanSuffix = (val: string) => {
    let raw = val;
    // Extract query parameter if full URL or query was pasted
    const urlMatch = raw.match(/[?&]r=([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      raw = urlMatch[1];
    }
    // Strip "FD-", "FD ", "fd-", dashes, symbols, spaces
    raw = raw.replace(/^FD-?/i, '').replace(/[^a-zA-Z0-9]/g, '');
    return raw.toUpperCase().slice(0, 4);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuffix(cleanSuffix(e.target.value));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    setSuffix(cleanSuffix(pasted));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suffix) return;
    onJoin(`FD-${suffix}`);
  };

  return (
    <div 
      onClick={() => {
        if (!loading) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <motion.div 
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative border border-black/[0.06] my-auto cursor-default"
        >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        <h3 className="text-2xl font-black text-slate-950 mb-1 tracking-tight">Join a Room</h3>
        <p className="text-xs text-slate-600 font-medium mb-6">Type the room code shown on the screen.</p>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
            <span className="text-sm select-none mt-0.5">⚠️</span>
            <div className="flex-1">
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Room Code</label>
            <div className="flex items-center rounded-2xl bg-black/[0.03] border border-black/[0.08] focus-within:bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 p-1.5 transition-all">
              {/* Permanent Brand Affix Pill */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-950 text-amber-400 font-mono font-black text-sm tracking-widest flex items-center gap-1 shadow-sm select-none flex-shrink-0">
                <span>FD-</span>
              </div>
              {/* Suffix Input */}
              <input 
                required
                autoFocus
                type="text" 
                value={suffix} 
                onChange={handleInputChange}
                onPaste={handlePaste}
                maxLength={4}
                placeholder="8492"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-3 py-2 bg-transparent outline-none font-mono font-black text-slate-950 text-xl tracking-[0.25em] text-center placeholder:text-slate-300 placeholder:tracking-widest"
              />
            </div>
            <p className="text-xs text-slate-500 text-center font-medium pt-1.5">
              Enter the 4 characters after FD-
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading || suffix.length < 4}
            className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-full shadow-lg mt-2 disabled:opacity-50 active:scale-[0.98] transition-all text-sm cursor-pointer"
          >
            {loading ? 'Connecting...' : 'Enter Room'}
          </button>
        </form>
      </motion.div>
      </div>
    </div>
  );
};

/**
 * Attendee Registration Form (Apple Card Style)
 */
const RegisterForm = ({ room, onRegister, onSwitch, onWatchStage, error, loading, isLocked }: any) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRegister(name.trim());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -16 }}
      className="bg-white/95 backdrop-blur-2xl p-6 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/[0.08] max-w-lg mx-auto w-full relative overflow-hidden"
    >
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-900 px-3.5 py-1 rounded-full font-mono mb-3 inline-block border border-amber-500/25">
          Room #{room.roomCode}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mb-1.5 tracking-tight">{room.title}</h2>
        <p className="text-slate-600 font-medium text-xs sm:text-sm">Enter your name to claim your lucky number</p>
      </div>

      {isLocked ? (
        <div className="bg-red-50 p-6 rounded-2xl text-center border border-red-200">
          <Lock size={40} className="mx-auto text-red-500 mb-3" />
          <h3 className="text-lg font-bold text-red-600 mb-1">Registration Closed</h3>
          <p className="text-red-500 text-xs">The host has closed entries for this draw.</p>
          <div className="mt-4 flex flex-col gap-2">
            <button onClick={onSwitch} className="text-xs font-bold underline text-slate-900">
              Already registered? Find your ticket
            </button>
            <button onClick={onWatchStage} className="text-xs font-bold text-amber-600 hover:underline">
              Watch Live Stage Reels ↗
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide text-slate-700">Your Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input 
                required
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm font-medium"
                placeholder="Type your name..."
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 text-slate-700 flex items-start gap-2.5">
            <KeyRound size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-slate-900">Zero-PII Privacy:</span> No email or password needed. We'll generate an 8-character recovery password on your ticket pass.
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
              <span className="text-sm select-none mt-0.5">⚠️</span>
              <div className="flex-1">
                <p>{error}</p>
              </div>
            </div>
          )}

          <button 
            disabled={loading || !name.trim()}
            type="submit" 
            className="w-full py-4 rounded-full text-white font-black text-sm shadow-lg active:scale-[0.98] transition-all bg-slate-950 hover:bg-slate-900 flex justify-center items-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Claiming your ticket...' : 'Get My Lucky Number'}
          </button>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <button type="button" onClick={onSwitch} className="font-bold underline text-amber-600 hover:text-amber-700">
              Find my ticket
            </button>
            <button type="button" onClick={onWatchStage} className="font-semibold text-slate-600 hover:text-slate-900">
              Watch Stage ↗
            </button>
          </div>
        </form>
      )}
    </motion.div>
  );
};

/**
 * Retrieve Existing Pass Form
 */
const RetrieveForm = ({ room, onRetrieve, onSwitch, error, loading }: any) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onRetrieve(password.trim());
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -16 }}
      className="bg-white/95 backdrop-blur-2xl p-6 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-black/[0.08] max-w-lg mx-auto w-full"
    >
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-900 px-3.5 py-1 rounded-full font-mono mb-3 inline-block border border-amber-500/25">
          Room #{room.roomCode}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 mb-1.5 tracking-tight">Restore Your Pass</h2>
        <p className="text-slate-600 font-medium text-xs sm:text-sm">Enter the 8-character recovery password from your ticket.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide text-slate-700">Recovery Password</label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              required
              autoFocus
              type="text" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all text-sm font-mono font-bold tracking-wider"
              placeholder="e.g. k9#P@7w!"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            This password was shown on your lucky ticket pass.
          </p>
        </div>

        {error && <p className="text-red-500 text-xs font-bold">{error}</p>}

        <button 
          disabled={loading || !password.trim()}
          type="submit" 
          className="w-full py-4 rounded-full text-white font-black text-sm shadow-lg active:scale-[0.98] transition-all bg-slate-950 hover:bg-slate-900 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Searching...' : 'Restore My Ticket'}
        </button>

        <p className="text-center text-xs text-slate-500 pt-2">
          Need a new number? {' '}
          <button type="button" onClick={onSwitch} className="font-bold underline text-amber-600 hover:text-amber-700 cursor-pointer">
            Register here
          </button>
        </p>
      </form>
    </motion.div>
  );
};

/**
 * Authentic Apple Wallet Pass Component
 * Features side circular punchouts, perforated separator line, verified pass badge, debossed numerals, and simulated barcode
 */
const MyCodeView = ({ room, user, recoveryPassword, isWinner, onSwitchPass, onWatchStage, onClaimPrize }: any) => {
  const [copied, setCopied] = useState(false);
  const [isSharingCard, setIsSharingCard] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Mobile haptic pulse when winner status activates in real time
  useEffect(() => {
    if (isWinner && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150, 80, 300]);
      } catch {
        // Silently handled if browser restricts vibration
      }
    }
  }, [isWinner]);

  const handleCopyPassword = async () => {
    if (!recoveryPassword) return;
    try {
      await navigator.clipboard.writeText(recoveryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore clipboard write failures
    }
  };

  const handleShareWinner = async () => {
    if (isSharingCard) return;
    setIsSharingCard(true);
    try {
      trackEvent('winner_card_shared', { room_code: room.roomCode });
      const res = await shareWinnerCard({
        roomTitle: room.title,
        roomCode: room.roomCode,
        winnerName: user.name,
        winnerCode: user.code,
      });
      if (res.downloaded) {
        setShareFeedback('Victory card downloaded & link copied!');
        setTimeout(() => setShareFeedback(null), 3500);
      } else if (res.copied) {
        setShareFeedback('Victory link copied to clipboard!');
        setTimeout(() => setShareFeedback(null), 3500);
      }
    } catch (err) {
      console.warn('Share winner card error:', err);
    } finally {
      setIsSharingCard(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: 16 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      transition={{ type: 'spring', damping: 20, stiffness: 220 }}
      className="max-w-sm sm:max-w-md mx-auto w-full relative"
    >
    {/* Physical Apple Wallet Pass */}
    <div 
      className={`bg-white rounded-[32px] shadow-2xl border overflow-hidden relative transition-all duration-500 ${
        isWinner 
          ? 'border-amber-400 ring-4 ring-amber-400/20 shadow-amber-400/25 shadow-[0_0_50px_rgba(245,197,66,0.30)]' 
          : 'border-black/[0.08]'
      }`}
    >
      {/* Top Gold Foil Accent Header Bar with Specular Shimmer */}
      <div className="h-2.5 w-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 relative overflow-hidden">
        {isWinner && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-foil-shimmer pointer-events-none" />
        )}
      </div>

      {/* Top Pass Details */}
      <div className="p-5 sm:p-7 pb-4 bg-gradient-to-b from-slate-50/80 to-white">
        <div className="flex items-center justify-between mb-3.5 gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
            #{room.roomCode}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70 flex-shrink-0">
            <ShieldCheck size={13} className="text-emerald-600" />
            <span>Verified Pass</span>
          </div>
        </div>

        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5 truncate">{room.title}</h3>
        <p className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight break-words">{user.name}</p>
      </div>

      {/* Physical Perforated Ticket Divider with Notch Punchouts */}
      <div className="relative py-2 flex items-center justify-center">
        {/* Left Circular Punchout */}
        <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-[#F5F5F7] border-r border-black/[0.08] shadow-inner" />
        {/* Dashed Perforation Line */}
        <div className="w-full border-t-2 border-dashed border-slate-200 mx-6" />
        {/* Right Circular Punchout */}
        <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-[#F5F5F7] border-l border-black/[0.08] shadow-inner" />
      </div>

      {/* Ticket Number Section */}
      <div className="p-5 sm:p-7 pt-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 block mb-2.5">
          Your Lucky Number
        </span>

        {/* Digital Ticket Code Container (Obsidian Badge with Gold Numerals) */}
        <div 
          className={`inline-block max-w-full px-6 sm:px-12 py-4 sm:py-6 rounded-3xl border-2 mb-4 transition-all duration-500 ${
            isWinner 
              ? 'scale-105 shadow-[0_0_40px_rgba(245,197,66,0.35)] border-amber-400' 
              : 'border-slate-800'
          }`}
          style={{ 
            backgroundColor: FAIRDRAW_COLORS.OBSIDIAN, 
            color: FAIRDRAW_COLORS.GOLD 
          }}
        >
          <span className={`font-black tracking-tight font-mono select-all tabular-nums leading-none block ${
            (user.code?.length || 4) >= 6 
              ? 'text-4xl sm:text-6xl' 
              : (user.code?.length || 4) === 5 
                ? 'text-4xl sm:text-6xl' 
                : 'text-5xl sm:text-7xl'
          }`}>
            {user.code}
          </span>
        </div>

        {/* Live Status Pill */}
        <div className="mb-4">
          {isWinner ? (
            <motion.div 
              initial={{ y: 15, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md border border-amber-400"
            >
              <p className="font-black text-lg uppercase italic animate-bounce flex items-center justify-center gap-1.5">
                <Trophy size={20} /> YOU WON! 🎉
              </p>

              {room.hasClaimTimer ? (
                (user.hasClaimed || room.claimedWinnerCode === user.code) ? (
                  <div className="mt-2.5 py-1.5 px-3 rounded-xl bg-slate-950/80 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-400/40">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>Prize Claimed & Confirmed!</span>
                  </div>
                ) : (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onClaimPrize}
                      className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer animate-pulse border border-amber-400/50"
                    >
                      <Sparkles size={15} className="text-amber-400" />
                      <span>Tap to Claim Prize on Stage!</span>
                    </button>
                    <p className="text-xs font-semibold text-slate-800 mt-1.5">
                      Confirms your live presence on the stage screen.
                    </p>
                  </div>
                )
              ) : (
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  Show this screen to the host to claim your prize!
                </p>
              )}

              {/* VIP Social Brag & Share Button (Shown only after prize is claimed if claim timer is active) */}
              {(!room.hasClaimTimer || user.hasClaimed || room.claimedWinnerCode === user.code) && (
                <div className="mt-3.5 pt-3 border-t border-slate-950/15">
                  <button
                    type="button"
                    onClick={handleShareWinner}
                    disabled={isSharingCard}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer border border-amber-400/40 disabled:opacity-60"
                    title="Share VIP Winner Pass to Instagram Stories, WhatsApp, or Photos"
                  >
                    <Share2 size={14} className="text-amber-400 flex-shrink-0" />
                    <span>{isSharingCard ? 'Creating VIP Card...' : 'Share Winner Card'}</span>
                  </button>

                  {shareFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 py-1 px-2.5 rounded-lg bg-slate-950/90 text-emerald-300 text-[11px] font-bold text-center flex items-center justify-center gap-1.5"
                    >
                      <Check size={12} className="text-emerald-400 flex-shrink-0" />
                      <span>{shareFeedback}</span>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{room.isSpinning ? 'Reels are spinning on stage...' : 'Waiting for the live draw'}</span>
            </div>
          )}
        </div>

        {/* Recovery Password Capsule (Apple HIG Debossed Container) */}
        {recoveryPassword && (
          <div className="my-4 p-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] flex items-center justify-between gap-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <KeyRound size={12} className="text-amber-600 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recovery Password</span>
              </div>
              <p className="font-mono font-bold text-sm text-slate-950 tracking-wider truncate select-all">{recoveryPassword}</p>
              <p className="text-xs text-slate-500 font-medium">Keep this password to restore your pass anytime</p>
            </div>
            <button
              type="button"
              onClick={handleCopyPassword}
              className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-200/80 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all flex-shrink-0 cursor-pointer"
              title="Copy Recovery Password"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Watch Stage Button */}
        <button
          onClick={onWatchStage}
          className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/80 text-slate-900 text-xs font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-3 cursor-pointer"
        >
          <Trophy size={14} className="text-amber-500" />
          <span>Watch Live Stage Reels</span>
          <ChevronRight size={14} className="text-slate-400" />
        </button>

        {/* Simulated Barcode */}
        <div className="flex justify-center items-center gap-1 opacity-20 my-3 py-1">
          {[2, 4, 1, 3, 5, 2, 6, 1, 4, 2, 5, 3, 1, 4, 2, 6, 3, 2, 4, 1].map((w, idx) => (
            <div key={idx} className="h-7 bg-slate-900 rounded-sm" style={{ width: `${w * 1.4}px` }} />
          ))}
        </div>

        <p className="text-[11px] text-slate-500 font-medium italic">
          Saved on this device.
        </p>

        {/* Switch Pass Action (Disabled in 1-Ticket Per Device Mode) */}
        {room.isOneTicketPerDevice ? (
          <div className="text-[11px] font-mono text-slate-400 mt-3 flex items-center justify-center gap-1.5 select-none py-1.5">
            <Lock size={12} className="text-slate-400" />
            <span>1 Entry Locked (Anti-Spam Active)</span>
          </div>
        ) : (
          <button 
            type="button"
            onClick={onSwitchPass}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 active:scale-[0.98] transition-colors flex items-center justify-center gap-1.5 mt-3 mx-auto py-1.5 px-3 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <Users size={13} />
            <span>Switch Pass / Exit</span>
          </button>
        )}

        {/* Attendee-to-Host Viral Flywheel Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 text-center">
          <a 
            href="/?action=create" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-amber-600 active:scale-95 transition-all group"
          >
            <span>Hosting your own event or party?</span>
            <span className="text-amber-600 underline font-extrabold group-hover:text-amber-700">Create a free room in 5s ⚡</span>
          </a>
        </div>
      </div>
    </div>
  </motion.div>
  );
};

/**
 * Switch Pass Action Sheet / Modal (Apple HIG Style)
 * Allows switching between passes on a shared device, copying recovery key, or entering a new pass
 */
const SwitchPassModal = ({
  user,
  recoveryPassword,
  savedPasses,
  onClose,
  onSwitch,
  onSelectPass,
}: {
  user: ParticipantData;
  recoveryPassword?: string | null;
  savedPasses: SavedPass[];
  onClose: () => void;
  onSwitch: () => void;
  onSelectPass: (pass: SavedPass) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!recoveryPassword) return;
    try {
      await navigator.clipboard.writeText(recoveryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const otherPasses = savedPasses.filter(p => p.participantId !== user.id);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-white rounded-t-[32px] sm:rounded-[32px] max-w-md w-full p-6 shadow-2xl border border-black/[0.08] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Ticket size={20} className="text-amber-500" />
            <h3 className="text-lg font-black text-slate-950">Switch Ticket Pass</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Pass Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Active Ticket
          </span>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-base text-slate-900">{user.name}</p>
              <p className="font-mono font-bold text-xs text-amber-700">Code #{user.code}</p>
            </div>
            {recoveryPassword && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Copy Password"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? 'Copied' : 'Copy Key'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Other Saved Passes on this device */}
        {otherPasses.length > 0 && (
          <div className="mb-5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              Saved Passes on this Device ({otherPasses.length})
            </span>
            <div className="space-y-2">
              {otherPasses.map(pass => (
                <div
                  key={pass.participantId}
                  onClick={() => onSelectPass(pass)}
                  className="p-3 rounded-2xl bg-black/[0.02] hover:bg-amber-50/60 border border-black/[0.06] hover:border-amber-400/50 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99] group"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate group-hover:text-amber-950">{pass.name}</p>
                    <p className="font-mono text-xs text-slate-500">#{pass.code}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 group-hover:text-amber-700 flex items-center gap-1 flex-shrink-0">
                    Switch <ChevronRight size={14} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={onSwitch}
            className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 active:scale-[0.98] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <User size={16} />
            <span>Enter Another Pass or Register</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200/80 active:scale-[0.98] text-slate-700 font-bold text-sm transition-all cursor-pointer"
          >
            Keep Current Pass
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Dynamic Island Capsule
 * Apple-grade floating status & live telemetry for Stage Display
 */
const DynamicIsland = ({ room, isAdmin }: { room: RoomData; isAdmin: boolean }) => {
  const [activeMessage, setActiveMessage] = useState<{
    label: string;
    type: string;
    key: number;
  } | null>(null);

  useEffect(() => {
    if (room.lastAction && Date.now() - room.lastAction.timestamp < 10000) {
      setActiveMessage({
        label: room.lastAction.label,
        type: room.lastAction.type,
        key: room.lastAction.timestamp,
      });

      const timer = setTimeout(() => {
        setActiveMessage(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [room.lastAction]);

  return (
    <div className="flex justify-center mb-3 sticky top-16 z-30 pointer-events-none">
      <AnimatePresence mode="wait">
        {room.isSpinning ? (
          <motion.div
            key="spinning"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/40 backdrop-blur-2xl text-amber-300 font-mono text-xs font-bold shadow-[0_0_20px_rgba(245,197,66,0.25)] flex items-center gap-2 pointer-events-auto"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <Sparkles size={14} className="text-amber-400 animate-spin" />
            <span>⚡ LIVE REEL DRAW IN PROGRESS</span>
          </motion.div>
        ) : activeMessage ? (
          <motion.div
            key={`msg-${activeMessage.key}`}
            initial={{ opacity: 0, scale: 0.88, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: -8 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className={`px-4 py-1.5 rounded-full border backdrop-blur-2xl text-xs font-bold shadow-xl flex items-center gap-2 pointer-events-auto ${
              activeMessage.type === 'LOCK_TOGGLED'
                ? room.isRegistrationLocked
                  ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                  : 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : activeMessage.type === 'REPEAT_TOGGLED'
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                : activeMessage.type === 'CODES_TOGGLED'
                ? 'bg-indigo-950/70 border-indigo-500/40 text-indigo-300'
                : activeMessage.type === 'RESET'
                ? 'bg-red-950/80 border-red-500/50 text-red-300'
                : 'bg-amber-950/70 border-amber-400/40 text-amber-300'
            }`}
          >
            <span>{activeMessage.label}</span>
          </motion.div>
        ) : (
          <motion.div
            key="ambient"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-white/15 backdrop-blur-xl text-xs font-mono text-slate-200 flex items-center gap-2.5 pointer-events-auto shadow-lg"
          >
            <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            <span className="font-semibold">
              {isAdmin ? 'Presenter Clicker Active' : `Room #${room.roomCode} • Presentation Stage`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Live Claim Countdown Component
 * Displays synchronized 45-second ticker on stage for live prize claiming.
 */
const LiveClaimCountdown = ({ 
  room, 
  participants,
  isAdmin, 
  onVerifyWinnerNow 
}: { 
  room: RoomData; 
  participants?: ParticipantData[];
  isAdmin?: boolean; 
  onVerifyWinnerNow?: () => void; 
}) => {
  const totalSeconds = room.claimTimerSeconds || 45;
  const currentWinnerParticipant = participants?.find(p => p.code === room.currentWinningCode);
  const isClaimed = Boolean(
    (room.claimedWinnerCode && room.claimedWinnerCode === room.currentWinningCode) ||
    (currentWinnerParticipant && currentWinnerParticipant.hasClaimed)
  );

  const calculateRemaining = () => {
    if (!room.lastUpdated) return totalSeconds;
    const elapsed = Math.floor((Date.now() - room.lastUpdated) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  };

  const [remaining, setRemaining] = useState<number>(calculateRemaining);

  useEffect(() => {
    if (isClaimed) return;
    setRemaining(calculateRemaining());
    const interval = setInterval(() => {
      setRemaining(calculateRemaining());
    }, 500);
    return () => clearInterval(interval);
  }, [room.lastUpdated, isClaimed, totalSeconds]);

  const progressPercent = Math.min(100, Math.max(0, (remaining / totalSeconds) * 100));

  if (isClaimed) {
    return (
      <div className="max-w-md mx-auto p-4 rounded-3xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-center gap-2 font-black text-sm sm:text-base">
          <CheckCircle2 size={20} className="text-emerald-400 animate-bounce" />
          <span>Prize Claimed & Confirmed on Stage! 🎉</span>
        </div>
        <p className="text-[11px] text-emerald-300/80 mt-1">
          Winner has confirmed identity on their mobile pass.
        </p>
      </div>
    );
  }

  const isExpired = remaining <= 0;

  return (
    <div className="max-w-md mx-auto p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-amber-400/30 text-white shadow-2xl backdrop-blur-2xl space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isExpired ? 'bg-red-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            {isExpired ? 'Claim Window Expired' : 'Live Prize Claim Window'}
          </span>
        </div>
        <div className="font-mono font-black text-lg sm:text-xl text-amber-400">
          {Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 rounded-full ${
            remaining > 15 ? 'bg-amber-400' : remaining > 5 ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="text-[11px] text-slate-300">
        {isExpired 
          ? 'Winner did not claim in time. Host may re-spin or manually verify.' 
          : 'Winner: Tap "Claim Prize" on your mobile pass or call out to Host!'}
      </p>

      {isAdmin && onVerifyWinnerNow && (
        <button
          onClick={onVerifyWinnerNow}
          className="w-full py-2 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
        >
          <CheckCircle2 size={14} />
          <span>Host Quick Action: Verify Winner Now</span>
        </button>
      )}
    </div>
  );
};

/**
 * Stage View (Apple Obsidian Presentation Theater)
 * 100% Display Only - Zero Interactive Admin Controls or Password Prompts.
 * Equipped with Native Screen Wake Lock to prevent projectors/TVs from blanking.
 */
const RaffleBoard = ({ 
  room, 
  participants, 
  showCodes, 
  showEmails, 
  isAdmin,
  stageAlert,
  onTriggerDraw,
  onVerifyWinnerNow,
  onRequireHostAuth,
  onOpenQr
}: any) => {
  const digitsCount = room.digitsCount || 4;
  const [localDigits, setLocalDigits] = useState<(number | null)[]>(
    Array(digitsCount).fill(null)
  );

  // Screen Wake Lock API: Keep the projector/TV display awake indefinitely
  useEffect(() => {
    let wakeLockSentinel: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Silently handled: wake lock unsupported or permission denied
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, []);

  // Hardware Keynote Presentation Clicker & Spacebar Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const isClickerTrigger = (
        e.code === 'Space' || 
        e.key === ' ' || 
        e.key === 'Enter' || 
        e.code === 'Enter' ||
        e.code === 'PageDown' || 
        e.key === 'PageDown' || 
        e.code === 'ArrowRight' || 
        e.key === 'ArrowRight' ||
        e.code === 'ArrowDown' ||
        e.key === 'ArrowDown'
      );
      if (isClickerTrigger) {
        e.preventDefault();
        if (room.isSpinning) return;
        if (isAdmin) {
          trackEvent('hardware_clicker_used', { key: e.code || e.key });
          onTriggerDraw?.();
        } else {
          onRequireHostAuth?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, room.isSpinning, onTriggerDraw, onRequireHostAuth]);

  // Synchronized slot animation calculation anchored strictly by spinStartTime
  useEffect(() => {
    if (!room.isSpinning) {
      if (room.currentWinningCode) {
        setLocalDigits(room.currentWinningCode.split('').map(Number));
      } else {
        setLocalDigits(Array(digitsCount).fill(null));
      }
      return;
    }

    if (!room.spinStartTime || !room.currentWinningCode) {
      setLocalDigits(Array(digitsCount).fill(null));
      return;
    }

    const winningDigits = room.currentWinningCode.split('').map(Number);
    
    const updateDigits = () => {
      const now = Date.now();
      const elapsed = now - (room.spinStartTime || now);
      
      const newDigits: (number | null)[] = Array(digitsCount).fill(null);
      for (let i = 0; i < digitsCount; i++) {
        const threshold = RAFFLE_CONFIG.BASE_SPIN_DURATION + (i * RAFFLE_CONFIG.PER_DIGIT_REVEAL);
        if (elapsed >= threshold) {
          newDigits[i] = winningDigits[i];
        }
      }
      
      setLocalDigits(prev => {
        if (prev.every((v, i) => v === newDigits[i])) return prev;
        return newDigits;
      });
    };

    const interval = setInterval(updateDigits, 30);
    updateDigits();
    return () => clearInterval(interval);
  }, [room.isSpinning, room.spinStartTime, room.currentWinningCode, digitsCount]);

  const attendeeTotal = room.participantCount ?? participants.length;
  const displayCodes = room.showCodesOnStage ?? showCodes;

  return (
    <div className="space-y-6 sm:space-y-8 pb-32 w-full text-white relative">
      {/* Apple Dynamic Island Live Telemetry Capsule */}
      <DynamicIsland room={room} isAdmin={isAdmin} />

      {/* Floating Alert Toast for Stage Mode */}
      <AnimatePresence>
        {stageAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full bg-red-950/95 border border-red-500/50 text-red-100 text-xs font-bold shadow-2xl backdrop-blur-2xl flex items-center gap-2 max-w-md text-center"
          >
            <span>{stageAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient Gold Radial Glow behind the reels */}
      <div className="relative text-center pt-1">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <span className="text-[11px] font-mono font-bold text-amber-300/90 bg-white/5 border border-white/10 px-3.5 py-1 rounded-full uppercase tracking-widest inline-block mb-2">
          ROOM #{room.roomCode}
        </span>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight mt-1 mb-2 leading-tight break-words px-2">
          {room.title}
        </h2>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            LIVE STAGE • {attendeeTotal.toLocaleString()} ATTENDEES
          </span>
          <button 
            onClick={onOpenQr}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-amber-300 text-xs font-bold transition-all border border-white/10 active:scale-[0.96]"
          >
            <QrCode size={13} />
            <span>Join QR</span>
          </button>
        </div>
      </div>

      {/* Dynamic Slot Machine */}
      <SlotMachine digits={localDigits} isSpinning={room.isSpinning} />

      {/* Winner Announcement Card */}
      <AnimatePresence>
        {!room.isSpinning && room.currentWinnerName && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center mb-6 px-2 space-y-4"
          >
            <div className="inline-block max-w-full px-6 sm:px-12 py-4 sm:py-5 rounded-3xl shadow-2xl bg-amber-400 text-slate-950 border-2 border-white/20">
              <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-80 mb-0.5">Winner Selected 🎉</h4>
              <p className="text-2xl sm:text-4xl font-black uppercase tracking-tight break-words">
                {room.currentWinnerName}
              </p>
            </div>

            {/* Synchronized Live 45s Claim Countdown Window */}
            {room.hasClaimTimer && (
              <LiveClaimCountdown 
                room={room} 
                participants={participants}
                isAdmin={isAdmin} 
                onVerifyWinnerNow={onVerifyWinnerNow} 
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted Glass Attendees Dashboard (Clean, Display-Only) */}
      <div className="backdrop-blur-xl bg-white/[0.04] border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 sm:mb-5 flex-wrap gap-2">
          <h3 className="font-bold text-sm sm:text-base text-slate-100 flex items-center gap-2">
            <User size={17} className="text-amber-400" /> ENTRANTS POOL ({participants.length})
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Stage • Display Only</span>
            </span>
          </div>
        </div>
        
        <div className={`grid gap-2 transition-all ${
          displayCodes || showEmails 
            ? 'grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3' 
            : 'grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        } max-h-[45vh] overflow-y-auto pr-1`}>
          {participants.map((p: ParticipantData) => (
            <div 
              key={p.id} 
              className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between gap-2 min-w-0 ${
                p.hasWon 
                  ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 shadow-sm' 
                  : 'bg-white/[0.04] border-white/10 text-slate-100 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
                {displayCodes && (
                  <span className="font-mono bg-white/15 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                    #{p.code}
                  </span>
                )}
                <span className="truncate">{p.name}</span>
              </div>
              {p.hasWon && <Trophy size={14} className="text-amber-400 flex-shrink-0 ml-1" />}
            </div>
          ))}
        </div>

        {/* Presentation Clicker Hotkey Indicator & Quick Trigger */}
        <div className="flex items-center justify-center pt-4 border-t border-white/[0.08] mt-4">
          {isAdmin ? (
            <button
              onClick={onTriggerDraw}
              disabled={room.isSpinning}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-400/25 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/50 text-xs font-mono text-emerald-300 flex items-center gap-2.5 shadow-lg active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50"
              title="Click or press Spacebar / Enter / Clicker to start draw"
            >
              <Sparkles size={14} className="text-emerald-400" />
              <span className="font-bold">Keynote Clicker Active</span>
              <span className="text-slate-400 font-normal">•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-300">
                Press <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-bold">Space</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white/15 text-white font-bold">Enter</kbd>
              </span>
            </button>
          ) : (
            <button
              onClick={onRequireHostAuth}
              className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono text-slate-200 flex items-center gap-2 shadow-sm active:scale-[0.97] transition-all cursor-pointer"
              title="Unlock host privileges to use a presentation clicker or hotkeys on this screen"
            >
              <KeyRound size={13} className="text-amber-400" />
              <span>Enable Clicker Remote</span>
              <span className="text-slate-500">•</span>
              <span className="text-[11px] text-amber-300 font-bold underline">Unlock with PIN</span>
            </button>
          )}
        </div>

        {/* Presentation Stage Clean Watermark Footer */}
        <div className="pt-6 pb-2 text-center select-none opacity-60 hover:opacity-100 transition-opacity">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-slate-300">
            <Sparkles size={12} className="text-amber-400" />
            <span>FairDraw • Free Live Lucky Draws</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-300 font-bold">fairdraw.daocongthanh.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dedicated Host Remote Controller
 * Engineered for mobile phones (one-handed operation backstage / MC)
 * as well as desktop screens.
 */
const HostRemoteView = ({
  room,
  pinHash,
  adminKey,
  participants,
  showCodes,
  setShowCodes,
  showEmails,
  setShowEmails,
  onOpenStage,
  onOpenQr,
  onOpenPairing,
  onDeleteRoom
}: any) => {
  const [resetStep, setResetStep] = useState(0);
  const [deleteStep, setDeleteStep] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const holdIntervalRef = useRef<any>(null);
  const autoCancelTimeoutRef = useRef<any>(null);

  // Auto-cancel timer for Delete steps 1 & 2
  useEffect(() => {
    if (autoCancelTimeoutRef.current) {
      clearTimeout(autoCancelTimeoutRef.current);
      autoCancelTimeoutRef.current = null;
    }

    if (deleteStep === 1) {
      autoCancelTimeoutRef.current = setTimeout(() => {
        setDeleteStep(0);
      }, 6000);
    } else if (deleteStep === 2) {
      autoCancelTimeoutRef.current = setTimeout(() => {
        setDeleteStep(0);
        setHoldProgress(0);
        setIsHolding(false);
      }, 10000);
    }

    return () => {
      if (autoCancelTimeoutRef.current) {
        clearTimeout(autoCancelTimeoutRef.current);
      }
    };
  }, [deleteStep]);

  // Cleanup hold interval on unmount
  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const triggerDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      if (onDeleteRoom) {
        await onDeleteRoom();
      } else {
        await firebaseService.deleteRoomCascade(room.roomCode);
      }
    } catch (err: any) {
      setIsDeleting(false);
      setDeleteStep(0);
      setHoldProgress(0);
      setError(err?.message || 'Failed to delete room. Please retry.');
    }
  };

  const startHold = () => {
    if (isDeleting || room.isSpinning) return;
    setIsHolding(true);
    setHoldProgress(0);
    const holdDurationMs = 1500;
    const intervalMs = 25;
    const increment = (intervalMs / holdDurationMs) * 100;

    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev + increment >= 100) {
          if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
          setIsHolding(false);
          triggerDelete();
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);
  };

  const cancelHold = () => {
    if (holdProgress >= 100) return;
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const startRaffle = async () => {
    setError(null);
    const candidates = room.allowRepeatWinners 
      ? participants 
      : participants.filter((p: ParticipantData) => !p.hasWon);
    
    if (candidates.length === 0) {
      setError('No eligible participants in the pool!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    const startTime = Date.now();
    const digitsCount = room.digitsCount || 4;
    const totalSpinDuration = RAFFLE_CONFIG.BASE_SPIN_DURATION + (digitsCount * RAFFLE_CONFIG.PER_DIGIT_REVEAL) + RAFFLE_CONFIG.FINALIZE_BUFFER;
    
    try {
      trackEvent('draw_spin_started', {
        source: 'host_remote',
        allow_repeats: Boolean(room.allowRepeatWinners),
        has_timer: Boolean(room.hasClaimTimer),
        digits_count: digitsCount
      });

      // 1. START SPIN
      await firebaseService.updateRoomState(room.roomCode, pinHash, { 
        isSpinning: true, 
        spinStartTime: startTime, 
        currentWinningCode: winner.code, 
        currentWinnerName: '',
        claimedWinnerCode: null,
        lastAction: {
          type: 'DRAW_STARTED',
          label: '⚡ Live Draw Initiated by Remote',
          timestamp: startTime,
        }
      });

      // 2. WAIT FOR STAGED REVEAL
      await new Promise(r => setTimeout(r, totalSpinDuration));

      // 3. FINALIZE WINNER
      await firebaseService.updateRoomState(room.roomCode, pinHash, { 
        isSpinning: false, 
        currentWinningCode: winner.code, 
        currentWinnerName: winner.name 
      });
      
      await firebaseService.markWinner(room.roomCode, winner.code);
    } catch (err: any) {
      console.error('Host Remote draw error:', err);
      setError(err?.message || 'Failed to start draw.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleVerifyWinner = async () => {
    if (!room.currentWinningCode) return;
    setError(null);
    try {
      await firebaseService.updateRoomState(room.roomCode, pinHash, {
        claimedWinnerCode: room.currentWinningCode,
        lastAction: {
          type: 'PRIZE_CLAIMED',
          label: '🎉 Winner Verified by Host!',
          timestamp: Date.now(),
        }
      });
      await firebaseService.markParticipantClaimed(room.roomCode, room.currentWinningCode);
    } catch (err: any) {
      console.error('Verify winner error:', err);
      setError(err?.message || 'Failed to verify winner.');
    }
  };

  const handleRespinPass = async () => {
    if (room.isSpinning) return;
    setError(null);
    const forfeitedCode = room.currentWinningCode;

    try {
      // 1. If there is a current winner, unmark them so they forfeit this win
      if (forfeitedCode) {
        await firebaseService.unmarkWinner(room.roomCode, forfeitedCode);
      }

      // 2. Clear current winning code & claim state from room immediately
      await firebaseService.updateRoomState(room.roomCode, pinHash, {
        currentWinningCode: '',
        currentWinnerName: '',
        claimedWinnerCode: null,
      });

      // 3. Re-compute candidates:
      // In participants array, reflect that forfeitedCode is now unmarked
      const updatedParticipants = participants.map((p: ParticipantData) => 
        p.code === forfeitedCode ? { ...p, hasWon: false, hasClaimed: false } : p
      );

      // Prioritize remaining participants who have not won and are not the forfeited person
      const remainingCandidates = room.allowRepeatWinners
        ? updatedParticipants
        : updatedParticipants.filter((p: ParticipantData) => !p.hasWon && p.code !== forfeitedCode);

      // Fallback: if no other unselected participants exist, include the forfeited person back in the draw
      const fallbackCandidates = room.allowRepeatWinners
        ? updatedParticipants
        : updatedParticipants.filter((p: ParticipantData) => !p.hasWon);

      const candidates = remainingCandidates.length > 0 ? remainingCandidates : fallbackCandidates;

      if (candidates.length === 0) {
        setError('No eligible participants in the pool. Entrant returned to pool.');
        setTimeout(() => setError(null), 4000);
        return;
      }

      // 4. Spin for next winner
      const winner = candidates[Math.floor(Math.random() * candidates.length)];
      const startTime = Date.now();
      const digitsCount = room.digitsCount || 4;
      const totalSpinDuration = RAFFLE_CONFIG.BASE_SPIN_DURATION + (digitsCount * RAFFLE_CONFIG.PER_DIGIT_REVEAL) + RAFFLE_CONFIG.FINALIZE_BUFFER;

      await firebaseService.updateRoomState(room.roomCode, pinHash, {
        isSpinning: true,
        spinStartTime: startTime,
        currentWinningCode: winner.code,
        currentWinnerName: '',
        claimedWinnerCode: null,
        lastAction: {
          type: 'DRAW_STARTED',
          label: '🔄 Re-Spin Initiated by Host',
          timestamp: startTime,
        }
      });

      await new Promise(r => setTimeout(r, totalSpinDuration));

      await firebaseService.updateRoomState(room.roomCode, pinHash, {
        isSpinning: false,
        currentWinningCode: winner.code,
        currentWinnerName: winner.name,
      });

      await firebaseService.markWinner(room.roomCode, winner.code);
    } catch (err: any) {
      console.error('Re-spin pass error:', err);
      setError(err?.message || 'Failed to re-spin.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const copyHostLink = () => {
    const hostUrl = `${window.location.origin}/?r=${room.roomCode}&adminKey=${adminKey || ''}`;
    navigator.clipboard.writeText(hostUrl);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const [copiedRecap, setCopiedRecap] = useState(false);

  const handleCopyWinnersRecap = async () => {
    if (wonParticipants.length === 0) return;
    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    const attendeesCount = room.participantCount ?? participants.length;
    
    let recapText = `🎲 ${room.title} — Official Lucky Draw Results\n`;
    recapText += `Room: #${room.roomCode} | Entrants: ${attendeesCount} | Date: ${dateStr}\n\n`;
    recapText += `🏆 Declared Winners (${wonParticipants.length}):\n`;
    
    wonParticipants.forEach((p: ParticipantData, idx: number) => {
      const isClaimed = Boolean(p.hasClaimed || room.claimedWinnerCode === p.code);
      recapText += `${idx + 1}. ${p.name} — Ticket #${p.code} (${isClaimed ? 'Claimed ✓' : 'Selected'})\n`;
    });
    
    recapText += `\nConducted live on FairDraw (https://fairdraw.daocongthanh.com)\nZero friction, zero tracking, verified live on stage.`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(recapText);
        setCopiedRecap(true);
        trackEvent('winners_recap_copied', { room_code: room.roomCode, count: wonParticipants.length });
        setTimeout(() => setCopiedRecap(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const wonParticipants = participants.filter((p: ParticipantData) => p.hasWon);
  const currentWinnerParticipant = participants.find(
    (p: ParticipantData) => p.code === room.currentWinningCode
  );
  const isWinnerClaimed = Boolean(
    (room.claimedWinnerCode && room.claimedWinnerCode === room.currentWinningCode) ||
    (currentWinnerParticipant && currentWinnerParticipant.hasClaimed)
  );
  const attendeeTotal = room.participantCount ?? participants.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="max-w-2xl mx-auto w-full space-y-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
    >
      {/* Top Host Status Header Card */}
      <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider truncate">
              Host Remote<span className="hidden sm:inline"> Controller</span>
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-white/10 text-amber-300 px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap flex-shrink-0">
            ROOM #{room.roomCode}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white break-words">{room.title}</h2>
        
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10 text-xs flex-wrap gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Entrants</span>
              <span className="font-mono font-black text-amber-400 text-base sm:text-lg">
                {attendeeTotal.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Winners Declared</span>
              <span className="font-mono font-black text-emerald-400 text-base sm:text-lg">
                {wonParticipants.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenStage}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 active:scale-[0.96] transition-all border border-white/10"
              title="Open Stage Display in new window"
            >
              <ExternalLink size={13} />
              <span>Stage Display</span>
            </button>
            <button
              onClick={copyHostLink}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 font-bold active:scale-[0.96] transition-all border border-white/10"
              title="Copy Host Controller Link"
            >
              {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-3xl bg-slate-950 border-2 border-red-500 text-white text-xs font-bold shadow-2xl flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center flex-shrink-0 text-red-400">
              <AlertTriangle size={16} />
            </div>
            <span className="text-red-100 font-semibold leading-relaxed break-words">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex-shrink-0 cursor-pointer transition-colors"
            title="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Keynote Clicker Pro Tip Banner (Apple HIG High-Contrast Obsidian Card) */}
      <div className="p-4 rounded-3xl bg-slate-900/95 border border-amber-400/30 text-xs text-slate-200 flex items-start gap-3 shadow-xl backdrop-blur-2xl">
        <div className="w-8 h-8 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center flex-shrink-0 mt-0.5 text-amber-400">
          <Sparkles size={16} />
        </div>
        <div className="leading-relaxed">
          <span className="font-bold text-amber-400 mr-1.5">Keynote Clicker Support:</span>
          <span className="text-slate-200 font-medium">On the Stage display, you can use any wireless presentation clicker (Spacebar, Enter, or Next slide) to trigger live draws hands-free.</span>
        </div>
      </div>

      {/* Hero Draw Action Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl text-center text-white">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
          {room.isSpinning ? 'Live Reel Draw in Progress' : 'Live Drawing Console'}
        </span>

        {/* Current / Last Winner Spotlight */}
        {!room.isSpinning && room.currentWinnerName ? (
          <div className="mb-5 p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 inline-block w-full">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block">Latest Winner</span>
            <p className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5 break-words">
              {room.currentWinnerName}
            </p>
            <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
              Ticket #{room.currentWinningCode}
            </span>

            {/* Live Claim Status & Quick Host Actions */}
            {room.hasClaimTimer && (
              <div className="mt-3 pt-3 border-t border-amber-400/20 space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-xs">
                  {isWinnerClaimed ? (
                    <span className="text-emerald-950 font-black flex items-center gap-1.5 bg-emerald-400 px-3.5 py-1 rounded-full shadow-sm">
                      <CheckCircle2 size={14} className="stroke-[2.5]" /> Prize Claimed & Confirmed
                    </span>
                  ) : (
                    <span className="text-amber-950 font-black flex items-center gap-1.5 bg-amber-400 px-3.5 py-1 rounded-full shadow-sm">
                      <Timer size={14} className="animate-spin stroke-[2.5]" /> Awaiting Winner Claim
                    </span>
                  )}
                </div>

                {!isWinnerClaimed && (
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <button
                      onClick={handleVerifyWinner}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 active:scale-[0.96] transition-all cursor-pointer shadow-md"
                    >
                      <CheckCircle2 size={14} className="stroke-[2.5]" />
                      <span>Verify Winner Now</span>
                    </button>
                    <button
                      onClick={handleRespinPass}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 active:scale-[0.96] transition-all cursor-pointer shadow-md"
                    >
                      <RotateCcw size={14} />
                      <span>Re-Spin / Pass</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        <button
          onClick={startRaffle}
          disabled={room.isSpinning}
          className={`w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-xl shadow-2xl flex items-center justify-center gap-2.5 sm:gap-3 active:scale-[0.98] transition-all min-h-[52px] sm:min-h-[56px] ${
            room.isSpinning
              ? 'bg-amber-500 text-slate-950 cursor-not-allowed animate-pulse'
              : 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25 ring-4 ring-emerald-500/20'
          }`}
        >
          {room.isSpinning ? (
            <>
              <RefreshCw className="animate-spin flex-shrink-0" size={20} />
              <span className="truncate">SPINNING REELS ON STAGE...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} className="text-amber-300 flex-shrink-0" />
              <span>START DRAW NOW</span>
            </>
          )}
        </button>
        <p className="text-[11px] text-slate-400 mt-3">
          Synchronizes mechanical reels across projectors and phones in real-time.
        </p>
      </div>

      {/* Control Switches Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-white">
        {/* Registration Lock Toggle */}
        <button
          onClick={() => {
            const nextLocked = !room.isRegistrationLocked;
            firebaseService.updateRoomState(room.roomCode, pinHash, { 
              isRegistrationLocked: nextLocked,
              lastAction: {
                type: 'LOCK_TOGGLED',
                label: nextLocked ? '🔒 Registration Closed by Host' : '🎟️ Registration Opened by Host',
                timestamp: Date.now(),
              }
            }).catch(err => setError(err.message));
          }}
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer ${
            room.isRegistrationLocked
              ? 'bg-slate-900 border-red-500/50 text-red-400 shadow-md'
              : 'bg-slate-900 border-emerald-500/50 text-emerald-400 shadow-md'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {room.isRegistrationLocked ? <Lock size={16} className="flex-shrink-0" /> : <Unlock size={16} className="flex-shrink-0" />}
            <span className="truncate">Sign-Up Registration</span>
          </div>
          <span className={`font-mono uppercase text-[10px] px-2.5 py-1 rounded-full font-black flex-shrink-0 ml-2 shadow-xs ${
            room.isRegistrationLocked ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'
          }`}>
            {room.isRegistrationLocked ? 'Closed' : 'Open'}
          </span>
        </button>

        {/* Repeat Winners Toggle */}
        <button
          onClick={() => {
            const nextRepeat = !room.allowRepeatWinners;
            firebaseService.updateRoomState(room.roomCode, pinHash, { 
              allowRepeatWinners: nextRepeat,
              lastAction: {
                type: 'REPEAT_TOGGLED',
                label: nextRepeat ? '🔄 Repeat Winners: Allowed' : '🚫 Repeat Winners: Disallowed',
                timestamp: Date.now(),
              }
            }).catch(err => setError(err.message));
          }}
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer ${
            room.allowRepeatWinners
              ? 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-md'
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20 shadow-md'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw size={16} className="flex-shrink-0" />
            <span className="truncate">Repeat Winners</span>
          </div>
          <span className={`font-mono uppercase text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${
            room.allowRepeatWinners 
              ? 'bg-amber-400 text-slate-950 font-black shadow-xs' 
              : 'bg-slate-800 text-slate-100 border border-white/20 font-bold'
          }`}>
            {room.allowRepeatWinners ? 'Allowed' : 'Disallowed'}
          </span>
        </button>

        {/* Show Numbers on Stage */}
        <button
          onClick={() => {
            const nextVal = !(room.showCodesOnStage ?? showCodes);
            setShowCodes(nextVal);
            firebaseService.updateRoomState(room.roomCode, pinHash, {
              showCodesOnStage: nextVal,
              lastAction: {
                type: 'CODES_TOGGLED',
                label: nextVal ? '🔢 Entrant Numbers: Visible on Stage' : '👁️ Entrant Numbers: Hidden on Stage',
                timestamp: Date.now(),
              }
            }).catch(err => setError(err.message));
          }}
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer ${
            (room.showCodesOnStage ?? showCodes)
              ? 'bg-amber-400 text-slate-950 border-amber-400'
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <span className="truncate">Numbers on Stage</span>
          <span className={`font-mono uppercase text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${
            (room.showCodesOnStage ?? showCodes)
              ? 'bg-slate-950 text-amber-300 font-black'
              : 'bg-slate-800 text-slate-100 border border-white/20 font-bold'
          }`}>
            {(room.showCodesOnStage ?? showCodes) ? 'Visible' : 'Hidden'}
          </span>
        </button>

        {/* 1 Ticket / Device Lockdown Toggle */}
        <button
          onClick={() => {
            const nextVal = !room.isOneTicketPerDevice;
            firebaseService.updateRoomState(room.roomCode, pinHash, {
              isOneTicketPerDevice: nextVal,
              lastAction: {
                type: 'LOCK_DEVICE_TOGGLED',
                label: nextVal ? '🛡️ 1 Ticket/Device Lockdown: Enabled' : '👥 Multi-Pass/Device: Allowed',
                timestamp: Date.now(),
              }
            }).catch(err => setError(err.message));
          }}
          title="When enabled, prevents multiple entries from the same device/browser session. Perfect for stream giveaways."
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer ${
            room.isOneTicketPerDevice
              ? 'bg-slate-900 border-indigo-500/50 text-indigo-400 shadow-md'
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldCheck size={16} className="flex-shrink-0" />
            <span className="truncate">1 Ticket / Device</span>
          </div>
          <span className={`font-mono uppercase text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${
            room.isOneTicketPerDevice 
              ? 'bg-indigo-500 text-white font-black shadow-xs' 
              : 'bg-slate-800 text-slate-100 border border-white/20 font-bold'
          }`}>
            {room.isOneTicketPerDevice ? 'Locked' : 'Multi-Pass'}
          </span>
        </button>

        {/* 45s Claim Timer Toggle */}
        <button
          onClick={() => {
            const nextVal = !room.hasClaimTimer;
            firebaseService.updateRoomState(room.roomCode, pinHash, {
              hasClaimTimer: nextVal,
              claimTimerSeconds: 45,
              lastAction: {
                type: 'CLAIM_TIMER_TOGGLED',
                label: nextVal ? '⏱️ Live 45s Claim Window: Enabled' : '⚡ Instant Win: Enabled',
                timestamp: Date.now(),
              }
            }).catch(err => setError(err.message));
          }}
          title="When enabled, triggers a dramatic 45-second live countdown on stage for the winner to claim their prize."
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer ${
            room.hasClaimTimer
              ? 'bg-slate-900 border-amber-500/50 text-amber-400 shadow-md'
              : 'bg-slate-900 border-white/10 text-slate-300 hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Timer size={16} className="flex-shrink-0" />
            <span className="truncate">45s Claim Timer</span>
          </div>
          <span className={`font-mono uppercase text-[10px] px-2.5 py-1 rounded-full flex-shrink-0 ml-2 ${
            room.hasClaimTimer 
              ? 'bg-amber-400 text-slate-950 font-black shadow-xs' 
              : 'bg-slate-800 text-slate-100 border border-white/20 font-bold'
          }`}>
            {room.hasClaimTimer ? '45s Active' : 'Off'}
          </span>
        </button>

        {/* Show Audience QR Modal (Public) */}
        <button
          onClick={onOpenQr}
          className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <QrCode size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="truncate">Audience QR (Public)</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">Public</span>
        </button>

        {/* Pair Secondary Host Phone (Private) */}
        {onOpenPairing && (
          <button
            onClick={onOpenPairing}
            className="p-3.5 sm:p-4 rounded-2xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-between font-bold text-xs transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Smartphone size={16} className="text-amber-400 flex-shrink-0" />
              <span className="truncate">Host Remote QR (Private)</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2.5 py-1 rounded-full flex-shrink-0 ml-2">Host</span>
          </button>
        )}
      </div>

      {/* Winners Prize Roll */}
      {wonParticipants.length > 0 && (
        <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-4 sm:p-5 text-white">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Trophy size={15} /> Winners Roll ({wonParticipants.length})
            </h3>
            <button
              type="button"
              onClick={handleCopyWinnersRecap}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer border border-white/10"
              title="Copy formatted results to clipboard for Slack, Discord, WhatsApp, or post-event emails"
            >
              {copiedRecap ? (
                <>
                  <Check size={13} className="text-emerald-400 stroke-[2.5]" />
                  <span className="text-emerald-300">Recap Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} className="text-amber-400" />
                  <span>Copy Winners Recap</span>
                </>
              )}
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {wonParticipants.map((p: ParticipantData) => {
              const isClaimed = Boolean(p.hasClaimed || room.claimedWinnerCode === p.code);
              return (
                <div key={p.id} className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded flex-shrink-0">#{p.code}</span>
                    <span className="font-bold text-white truncate">{p.name}</span>
                  </div>
                  {isClaimed ? (
                    <span className="text-[10px] text-emerald-300 font-bold uppercase flex items-center gap-1 flex-shrink-0 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      <Check size={12} className="text-emerald-400 stroke-[2.5]" /> Claimed
                    </span>
                  ) : room.hasClaimTimer ? (
                    <span className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1.5 flex-shrink-0 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                      <Timer size={12} className="text-amber-400" /> Awaiting Claim
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-300 font-bold uppercase flex items-center gap-1 flex-shrink-0 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                      <Trophy size={12} className="text-amber-400" /> Selected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EVENT OPERATIONS: CLEAR DISTINCTION BETWEEN RESET AND TEARDOWN */}
      <div className="space-y-3 pt-2">
        {/* Card 1: Round Operations - Reset Winner Pool (Amber / Slate) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RotateCcw size={15} className="text-amber-400 flex-shrink-0" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-400">
                  Reset Winner Pool (Round Restart)
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Preserves all registered attendees and ticket numbers. Only clears winner records so you can run another raffle round.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (resetStep === 0) setResetStep(1);
              else {
                firebaseService.resetAllDraws(room.roomCode, pinHash || '');
                trackEvent('draw_reset_triggered', { action: 'soft_reset' });
                setResetStep(0);
              }
            }}
            onMouseLeave={() => setResetStep(0)}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs border transition-all active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
              resetStep === 1
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/25 font-black'
                : 'border-amber-400/40 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 hover:text-amber-200'
            }`}
          >
            <RotateCcw size={14} className={resetStep === 1 ? 'animate-spin' : ''} />
            <span>
              {resetStep === 0
                ? 'Reset Winners (Start Round 2)'
                : 'Confirm Reset? Click again'}
            </span>
          </button>
        </div>

        {/* Card 2: Danger Zone - Permanent Room Teardown (Crimson Apple HIG Pro Card) */}
        <div className="bg-slate-950 border border-red-500/40 rounded-3xl p-4 sm:p-6 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle top indicator bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-red-600" />

          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={15} />
                </div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-400">
                  Danger Zone: Event Teardown
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed font-normal">
                Irreversible. Purges all attendee records, reserved tickets, and event data immediately. Closes stage projector and mobile passes.
              </p>
            </div>
          </div>

          {/* 3-Step Misclick-Proof Delete Gate */}
          {deleteStep === 0 && (
            <button
              disabled={room.isSpinning || isDeleting}
              onClick={() => setDeleteStep(1)}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs border border-red-500/40 text-red-300 bg-red-950/40 hover:bg-red-900/50 hover:text-white hover:border-red-400 transition-all active:scale-[0.98] flex items-center justify-center gap-2 min-h-[46px] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <Trash2 size={15} />
              <span>
                {room.isSpinning 
                  ? 'Cannot delete room during active draw' 
                  : 'Delete Room Permanently'}
              </span>
            </button>
          )}

          {deleteStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/60 text-white space-y-2 shadow-inner">
                <div className="flex items-center gap-2 text-red-300 font-bold uppercase text-xs tracking-wide">
                  <AlertTriangle size={15} className="text-red-400" />
                  <span>Step 1 of 2: Review Consequences</span>
                </div>
                <ul className="text-xs text-slate-100 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                  <li>All {attendeeTotal} attendee entries & tickets will be permanently erased.</li>
                  <li>Stage projector displays and attendee wallet passes will disconnect immediately.</li>
                  <li>Room #{room.roomCode} cannot be recovered.</li>
                </ul>
              </div>

              {/* 6s visual auto-cancel bar */}
              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  className="h-full bg-red-500"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-0.5">
                <button
                  onClick={() => setDeleteStep(0)}
                  className="flex-1 py-3 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setDeleteStep(2)}
                  className="flex-[2] py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  <span>Proceed to Final Gate (Step 2/3)</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {deleteStep === 2 && (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative overflow-hidden rounded-2xl border-2 border-red-500 bg-slate-900 p-0.5 select-none shadow-xl">
                {/* Fill Progress Bar */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-red-600 to-rose-600 transition-all ease-linear"
                  style={{ width: `${holdProgress}%` }}
                />
                <button
                  disabled={isDeleting}
                  onMouseDown={startHold}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={startHold}
                  onTouchEnd={cancelHold}
                  onTouchCancel={cancelHold}
                  className="relative z-10 w-full py-4 px-4 font-black text-xs sm:text-sm text-white flex items-center justify-center gap-2 select-none active:scale-[0.99] transition-transform cursor-pointer disabled:cursor-not-allowed drop-shadow"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} />
                      <span>PURGING ROOM & EVENT RECORDS...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className={isHolding ? 'animate-bounce' : ''} />
                      <span>
                        {holdProgress >= 100
                          ? 'PURGING ROOM NOW...'
                          : isHolding
                          ? `HOLDING... ${Math.round(holdProgress)}%`
                          : 'PRESS & HOLD 1.5s TO DELETE (Step 3/3)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {!isDeleting && (
                <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-medium">
                  <span>Hold button down for 1.5s to confirm</span>
                  <button 
                    onClick={() => {
                      cancelHold();
                      setDeleteStep(0);
                    }}
                    className="text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Cancel & Abort
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Host Launchpad Dialog (Shown immediately upon Room Creation)
 * Provides distinct links for Big Screen, Phone Pairing, and Audience Entry with unambiguous security guardrails
 */
const HostLaunchpadModal = ({ room, adminKey, onClose, onOpenStage, onOpenHost }: any) => {
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedAudience, setCopiedAudience] = useState(false);

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const stageUrl = `${window.location.origin}/?r=${room.roomCode}&view=stage`;
  const hostPairUrl = `${window.location.origin}/?r=${room.roomCode}&adminKey=${adminKey}`;
  const audienceUrl = `${window.location.origin}/?r=${room.roomCode}`;
  const hostPairQr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(hostPairUrl)}`;

  const copy = async (text: string, setter: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 sm:p-6 py-6 sm:py-8">
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="bg-white rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-2xl relative border border-black/[0.08] my-auto cursor-default"
        >
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3.5 py-1 rounded-full inline-block mb-2">
            ROOM #{room.roomCode} CREATED
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{room.title}</h3>
          <p className="text-xs text-slate-500 mt-1">Your live lucky draw is ready. Set up your screens below.</p>
        </div>

        <div className="space-y-4">
          {/* Card 1: Stage Screen (Projector) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Step 1: Big Screen Projector</span>
              <p className="text-sm font-black text-slate-950">Clean Stage Display</p>
              <p className="text-xs text-slate-600 mt-0.5">Project to auditorium. Displays the clean stage &amp; the <strong>Public Audience Join QR</strong>.</p>
            </div>
            <button
              onClick={() => { 
                trackEvent('stage_opened', { source: 'launchpad_modal' });
                window.open(stageUrl, '_blank'); 
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 flex-shrink-0 active:scale-[0.96] shadow-sm transition-all cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Open Stage</span>
            </button>
          </div>

          {/* Card 2: Pocket Remote Controller QR (Phone Pairing - CONFIDENTIAL) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider mb-2 shadow-xs">
              <ShieldAlert size={12} />
              <span>Host Remote Only • Do Not Project</span>
            </div>
            <p className="text-xs text-slate-700 font-medium mb-3">
              Scan with <strong>your personal phone</strong> to control spins &amp; locks from your pocket. Contains secret 128-bit Admin Key.
            </p>
            
            <div className="bg-white p-3 rounded-2xl border-2 border-amber-400/40 inline-block shadow-md mb-3">
              <img src={hostPairQr} alt="Host Remote Pairing QR" className="w-36 h-36 mx-auto rounded-lg" />
            </div>

            <div>
              <button
                onClick={() => {
                  trackEvent('host_paired', { method: 'copy_link' });
                  copy(hostPairUrl, setCopiedHost);
                }}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center justify-center gap-1.5 mx-auto bg-amber-200/60 hover:bg-amber-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
              >
                {copiedHost ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                <span>{copiedHost ? 'Secret Host Link Copied!' : 'Copy Secret Host Pairing Link'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              💡 Admin Key pairs your phone with 1 scan. Emergency PIN is for manual recovery on backup laptops.
            </p>
          </div>

          {/* Card 3: Audience Check-In (Public Link) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Audience Access (Public)</span>
              <p className="text-xs font-bold text-slate-700 truncate font-mono">{audienceUrl}</p>
              <p className="text-[10px] text-slate-400">Share with participants to register tickets without admin rights</p>
            </div>
            <button
              onClick={() => copy(audienceUrl, setCopiedAudience)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5 flex-shrink-0 active:scale-[0.96] shadow-sm transition-all cursor-pointer"
            >
              {copiedAudience ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedAudience ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => {
              trackEvent('host_remote_launched', { method: 'same_device' });
              onOpenHost();
            }}
            className="w-full sm:flex-1 py-3.5 rounded-full bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs active:scale-[0.98] transition-all cursor-pointer shadow-sm"
          >
            Open Host Remote on This Device
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
};

/**
 * Emergency Host PIN Recovery Modal
 * For organizers accessing from an unauthenticated device or recovering lost session
 */
const EmergencyRecoveryModal = ({ room, onClose, onSuccess }: any) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(() => {
    return Number(sessionStorage.getItem('fairdraw_recover_attempts') || '0');
  });

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, loading]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 5) {
      setError('Too many failed attempts. Please wait 1 minute.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isValid = await firebaseService.verifyRoomPin(room.roomCode, pin);
      if (isValid) {
        sessionStorage.removeItem('fairdraw_recover_attempts');
        // Register this device's anonymous UID in Firestore /hosts/{uid}
        try {
          await firebaseService.claimHostRole(room.roomCode, { pin });
        } catch (claimErr: any) {
          console.warn('Could not register host in /hosts subcollection:', claimErr);
          const msg = claimErr?.message || '';
          if (claimErr?.code === 'permission-denied' || msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
            setError('This room was created in an older version of FairDraw before multi-device hosting was supported. Please create a new room to enable multi-device remote control.');
            return;
          }
          throw claimErr;
        }
        onSuccess(room.pinHash);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        sessionStorage.setItem('fairdraw_recover_attempts', String(nextAttempts));
        setError(`Incorrect Host PIN (${5 - nextAttempts} attempts remaining)`);
      }
    } catch (err: any) {
      console.error('Host PIN verification error:', err);
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      onClick={() => {
        if (!loading) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative border border-black/[0.06] my-auto cursor-default"
        >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center mb-4">
          <KeyRound size={20} />
        </div>

        <h3 className="text-xl font-black text-slate-950 mb-1 tracking-tight">Host Access Recovery</h3>
        <p className="text-xs text-slate-600 font-medium mb-6">Enter the secret host PIN to unlock host controls and enable presentation clickers on this device.</p>

        {error && <p className="text-red-500 text-xs font-bold mb-4">{error}</p>}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Host PIN</label>
            <input
              required
              autoFocus
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN..."
              className="w-full px-4 py-3.5 rounded-2xl bg-black/[0.03] border border-black/[0.08] focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none font-mono text-center tracking-widest text-slate-950 text-base transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || attempts >= 5}
            className="w-full py-4 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-full shadow-lg text-xs disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {loading ? 'Verifying...' : 'Unlock Host Remote'}
          </button>
        </form>
      </motion.div>
      </div>
    </div>
  );
};

/**
 * Event Concluded Modal
 * Shown gracefully on Stage or Mobile Pass when the room is permanently closed by host.
 */
const EventConcludedModal = ({
  roomCode,
  onClose
}: {
  roomCode: string;
  onClose: () => void;
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) {
        clearInterval(interval);
        onClose();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onClose]);

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          className="w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-[32px] p-6 sm:p-8 text-center text-white shadow-2xl relative overflow-hidden my-auto cursor-default"
        >
        <div className="w-16 h-16 rounded-3xl bg-amber-400/15 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-400/10">
          <Trophy size={28} />
        </div>

        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block mb-1.5">
          Room #{roomCode}
        </span>
        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Event Concluded
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
          This room was concluded and closed by the organizer. Thank you for participating!
        </p>

        {/* 5s visual progress bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/10 transition-all active:scale-[0.98] cursor-pointer"
        >
          Return to FairDraw Home
        </button>
      </motion.div>
      </div>
    </div>
  );
};

/**
 * Public Audience QR Code Modal for On-Stage Presentation
 */
const QrCodeModal = ({ room, onClose }: { room: RoomData; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);
  const currentUrl = `${window.location.origin}/?r=${room.roomCode}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(currentUrl)}`;

  // Escape key listener (Apple HIG)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in cursor-pointer"
    >
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-6 sm:py-8">
        <motion.div 
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.96, y: 10 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-[32px] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative text-center border border-black/[0.06] my-auto cursor-default"
        >
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X size={18} />
        </button>

        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PUBLIC AUDIENCE JOIN PASS
          </span>
        </div>

        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
          ROOM #{room.roomCode}
        </span>
        <h3 className="text-2xl font-black text-slate-950 mt-1 mb-1 tracking-tight">{room.title}</h3>
        <p className="text-xs text-slate-500 mb-5">Scan with phone camera to enter this lucky draw</p>

        {/* QR Code Container */}
        <div className="bg-slate-50 p-3 sm:p-4 rounded-3xl border-2 border-slate-100 inline-block mb-4 shadow-inner max-w-full">
          <img 
            src={qrImageUrl} 
            alt={`Audience Join QR for Room ${room.roomCode}`} 
            className="w-48 h-48 sm:w-56 sm:h-56 max-w-full aspect-square mx-auto rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <button 
            onClick={copyUrl}
            className="w-full py-3.5 px-4 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Public Link Copied!' : 'Copy Audience Direct Link'}</span>
          </button>

          <p className="text-[10px] text-slate-400 pt-1">
            Safe to project onto venue big screens or share in event group chats.
          </p>

          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <span>Rendered with</span>
            <a 
              href="https://qr.daocongthanh.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
            >
              Pure QR
              <ExternalLink size={10} className="text-slate-400" />
            </a>
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};
