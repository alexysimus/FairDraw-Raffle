# FairDraw Architecture & Technical Specification

> **Version:** 1.0.0 (Open-Source Community Edition)  
> **Source Repository:** [alexysimus/FairDraw-Raffle](https://github.com/alexysimus/FairDraw-Raffle)  
> **Hosted Platform:** [fairdraw.daocongthanh.com](https://fairdraw.daocongthanh.com)

---

## 1. Executive Summary

FairDraw is an ephemeral, real-time lucky draw platform engineered for live meetups, tech conferences, hackathons, and esports streams. The platform preserves **zero friction** (zero account creation, zero email requirements, zero cookie tracking) while guaranteeing **provable cryptographic fairness** and dual-surface presentation isolation.

---

## 2. Dual-Surface Presentation Architecture

To eliminate visual security risks on public projection screens (such as typing admin PINs or displaying admin controls to hundreds of spectators), FairDraw separates presentation and control into two decoupled surfaces:

```
                          ┌───────────────────────────────────────────────┐
                          │    Backend Layer: Firebase or Mock Bus        │
                          │ (Firestore Realtime DB / Localhost Broadcast) │
                          └───────▲───────────────────────┬───────────────┘
                                  │                       │
               Authorized Writes  │                       │ Real-time onSnapshot Push
           (Verified Host Claim)  │                       │ (Rooms state, counts, spins,
                                  │                       │  Dynamic Island telemetry)
          ┌───────────────────────┴──────┐                ├──────────────────────────────┐
          │     HOST REMOTE CONTROLLER   │                │         STAGE SCREEN         │
          │ (Private Mobile / Backstage) │                │   (Projector / OBS / TV)     │
          │  - High-Entropy 128-bit Key  │                │  - 100% Read-Only Spectator  │
          │  - Live Attendee Roster      │                │  - Dynamic Island Telemetry  │
          │  - Draw Triggers & Locks     │                │  - Wireless Clicker Hotkey   │
          │  - Dual-Surface QR Pair      │                │  - Screen Wake Lock Active   │
          └──────────────────────────────┘                └──────────────────────────────┘
                                                         │
                                                         ├──────────────────────────────┐
                                                         │     ATTENDEE MOBILE PASS     │
                                                         │  - Apple Wallet Style Pass   │
                                                         │  - Synchronized Spin Mirror  │
                                                         │  - 45s Live Claim Window     │
                                                         └──────────────────────────────┘
```

### Surface Roles
1. **Stage Mode (`?view=stage`)**:
   - Strictly display-only. Engineered for 4K projectors, TVs, and streaming software (OBS/vMix).
   - Zero administrative controls or password prompts exposed on-screen.
   - **Dynamic Island Telemetry**: An Apple-style floating capsule at the top of the canvas displays fluid notifications whenever a remote host takes action (*"🔒 Registration Closed by Host"*, *"⚡ Live Draw Initiated by Remote"*).
   - **Presentation Clicker Ready**: Organizers can advance spins hands-free using standard presentation clickers (`Space`, `Enter`, `PageDown`, `ArrowRight`).
2. **Host Controller Mode (`?adminKey=...`)**:
   - Private mobile web interface paired instantly by scanning a 128-bit Admin Key QR code displayed exclusively to the host during room creation.
   - Allows remote locking of entries, triggering spins from your pocket, disqualifying no-shows, and monitoring live attendance.
3. **Attendee Pass Mode**:
   - Instant ticket generation via offscreen HTML5 Canvas (1080x1080 Apple Wallet format).
   - Attendees can save to photos, share to Instagram Stories/WhatsApp, or switch between passes on shared mobile devices without re-entering credentials.

---

## 3. Cryptographic Fairness & Security Model

Lucky draws are prone to participant skepticism. FairDraw implements cryptographically verifiable fairness:

1. **Client-Side SHA-256 Hashing**:
   - Passwords and recovery keys are hashed via the browser's native **Web Cryptography API** (`window.crypto.subtle.digest`) before transmission.
2. **Red-Team Credential Scraping Protection**:
   - Because `/participants` is readable by the public Stage screen, recovery hashes are stored in an isolated private subcollection `/rooms/{roomCode}/recovery/{hash}`.
   - Strict Firestore Security Rule:
     ```text
     allow get: if isAuthenticated();
     allow list: if isRoomHost(roomCode);
     ```
   - This prevents spectators or automated bots from scraping credential hashes from the audience.
3. **Streamer Mode Anti-Farming**:
   - Prevents multi-account ticket farming during livestreams by enforcing 1 ticket per device via ephemeral cryptographic device tokens.

---

## 4. Dual-Engine Architecture (Cloud vs Local Mock)

FairDraw is designed to be fully functional both in cloud production and local developer environments:

- **Cloud Mode (`VITE_FIREBASE_API_KEY` present)**:
  - Connects to Firebase Firestore and Firebase Anonymous Auth.
  - Multi-device real-time synchronization across hundreds of attendees on mobile networks.
- **Mock Preview Mode (Zero-Config)**:
  - Automatically activates when Firebase credentials are omitted.
  - State is preserved in browser `localStorage`.
  - Multi-tab communication on `localhost` is handled via the HTML5 **`BroadcastChannel` API**, allowing developers to test the Projector Stage and Mobile Host pairing locally without setting up any backend.

---

## 5. Ecosystem & Attribution

FairDraw is part of an open-source creator & sports engineering suite built by **Dao Cong Thanh**:
- 📱 [Pure QR](https://qr.daocongthanh.com) — Privacy-first, zero-tracking vector QR code studio.
- 🏸 [Velox Rally Cut](https://velox.daocongthanh.com) — Automated AI match video editing and rally detection for racquet sports.
- 🔬 [String Elongation Lab](https://strings.daocongthanh.com) — Racquet string elongation & tension physics engine.
- 🇫🇮 [ToiminimiFlow](https://github.com/alexysimus/ToiminimiFlow) — Invoicing & accounting tool for Finnish sole traders.
- 👨‍💻 [Dao Cong Thanh Portfolio](https://daocongthanh.com) — Central engineering blog & projects.
