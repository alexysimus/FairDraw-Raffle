# 🎲 FairDraw

> **Real-time, zero-friction lucky draws & raffles for live events, meetups, hackathons, and streams.**  
> Built with React 19, TypeScript, Tailwind CSS v4, Motion, and Firebase Firestore.

[![Try Live Cloud](https://img.shields.io/badge/🎲_Try_Live_Hosted_App-fairdraw.daocongthanh.com-amber?style=for-the-badge&logo=googlechrome&logoColor=white)](https://fairdraw.daocongthanh.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

FairDraw eliminates paper raffle tickets, crowded sign-up lines, and suspicious online spinners. Organizers create a room in 5 seconds. Attendees point their smartphone camera at the projector screen, type their display name, and instantly receive their Digital Lucky Pass. **Zero user accounts, zero passwords to remember, zero email requirements, and zero cookie tracking.**

---

### 🚀 Don't Want to Host Your Own Firebase Backend?
Use the official, 100% free cloud version with unlimited rooms at 👉 **[fairdraw.daocongthanh.com](https://fairdraw.daocongthanh.com)**

*95% of event organizers choose the hosted version to launch draws in seconds without configuring cloud infrastructure.*

---

## 🌟 Why Open Source? The "Fairness Moat"

Lucky draws often suffer from audience skepticism: *"Did the organizer pick their friend?"*

FairDraw transforms transparency into a competitive advantage:
- 🔒 **Cryptographically Verifiable**: Passwords and recovery keys are hashed via the browser's native Web Cryptography API (`SHA-256`) before transmission.
- 🛡️ **Anti-Scraping Firestore Security Rules**: Attendee credentials are stored in isolated private indexes (`/rooms/{roomCode}/recovery/{hash}`) allowing $O(1)$ single-doc lookups for attendees while strictly preventing spectators or bots from scraping ticket hashes.
- 📜 **Audit-Ready**: Every line of frontend raffle math and database security rules is open for inspection.

---

## ✨ Key Features

### 🖥️ Dual-Surface Architecture
- **Stage Mode (`?view=stage`)**: Designed for 4K projectors, TVs, and OBS browser sources. Strictly 100% display-only — zero administrative buttons or password inputs are ever visible to spectators.
- **Dynamic Island Telemetry**: Apple-style floating capsule at the top of the canvas confirms host actions in real time (*"🔒 Registration Closed by Host"*, *"⚡ Live Draw Initiated by Remote"*).
- **Presentation Clicker Ready**: Organizers can advance spins hands-free using any wireless USB or Bluetooth slide clicker (`Space`, `Enter`, `PageDown`, `ArrowRight`).

### 📱 Private Mobile Host Controller
- **QR Remote Pairing**: Scan the 128-bit unguessable Admin Key QR code to turn your pocket phone into a private remote.
- **Live Attendance Roster**: Monitor entrants, search tickets, disqualify no-shows, and trigger spins remotely.
- **Anti-Bot Streamer Mode**: Enforces 1 ticket per device using anonymous cryptographic hardware tokens to prevent ticket farming during public livestreams.

### 🎟️ Attendee Experience & VIP Apple Wallet Passes
- **HTML5 Canvas 2D VIP Pass**: Generates high-resolution 1080x1080 Apple Wallet-style passes with 1-tap mobile share to Instagram Stories & WhatsApp.
- **45s Live Claim Window**: Ticking on-screen countdown prevents absent ghost winners. Attendees hit "Claim Prize" directly on their phones.
- **Switch Pass Action Sheet**: If friends share a device, FairDraw allows 1-tap switching between all registered passes without re-entering credentials.

---

## ⚡ Quickstart

FairDraw comes with a **Zero-Config Local Mock Mode**. You do not need a Firebase account or API keys to test and evaluate the platform locally.

```bash
# 1. Clone the repository
git clone https://github.com/alexysimus/FairDraw-Raffle.git
cd FairDraw-Raffle

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser. FairDraw will boot into **Local Preview Mode**:
- Open **Tab 1** (`http://localhost:5173` -> Create Room -> Open Stage Screen).
- Open **Tab 2** (Scan or enter the room code to join as attendee or host).
- Spins, claims, and winner announcements synchronize across tabs in real-time via the HTML5 **`BroadcastChannel` API**!

### ☁️ Optional: Connecting Your Own Firebase Backend
To enable multi-device synchronization across different smartphones over cellular networks:
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in your Firebase configuration from the [Firebase Console](https://console.firebase.google.com).
3. Deploy the included Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 🌐 The Dao Cong Thanh Creator Ecosystem

FairDraw is part of an open-source suite of creator, sports engineering, and productivity tools built in Helsinki, Finland:

| Project | Live Platform | Description |
| :--- | :--- | :--- |
| 🎲 **FairDraw** | [fairdraw.daocongthanh.com](https://fairdraw.daocongthanh.com) | Real-time, zero-friction lucky draws & raffles for live events and meetups. |
| 📱 **Pure QR** | [qr.daocongthanh.com](https://qr.daocongthanh.com) | Privacy-first, zero-tracking vector QR code studio with custom styling & logo embeds. |
| 🏸 **Velox Rally Cut** | [velox.daocongthanh.com](https://velox.daocongthanh.com) | AI-powered badminton and tennis rally tracking, video segmentation & match highlights. |
| 🔬 **String Elongation Lab** | [strings.daocongthanh.com](https://strings.daocongthanh.com) | Physics simulator for racquet sports string elasticity, tension loss, and dynamic elongation. |
| 🇫🇮 **ToiminimiFlow** | [github.com/alexysimus/ToiminimiFlow](https://github.com/alexysimus/ToiminimiFlow) | Invoicing and bookkeeping workflow engine for Finnish sole traders (*toiminimi*). |
| 👨‍💻 **Engineering Hub** | [daocongthanh.com](https://daocongthanh.com) | Engineering blog, deep technical writeups, and full software portfolio. |

---

## 🛠️ Tech Stack
- **Framework**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + Obsidian Dark Theme
- **Animations**: [Motion](https://motion.dev) (Hardware-accelerated spring physics)
- **Icons**: [Lucide React](https://lucide.dev)
- **Real-Time Backend**: [Google Cloud Firestore](https://firebase.google.com/docs/firestore) + Firebase Anonymous Auth
- **Local Engine**: HTML5 `BroadcastChannel` + `localStorage`
- **Graphics**: HTML5 Canvas 2D (Apple Wallet VIP Pass Generator)

---

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).

---

## 👨‍💻 Author
**Dao Cong Thanh**  
Helsinki, Finland  
- Website: [daocongthanh.com](https://daocongthanh.com)  
- GitHub: [@alexysimus](https://github.com/alexysimus)
