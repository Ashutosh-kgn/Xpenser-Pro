# 💳 Xpenser Pro 2.0

Xpenser Pro 2.0 is a premium, offline-first personal financial management application designed with a sleek dark-themed aesthetic, dynamic visualizations, and real-time cloud synchronization. Built for complete privacy and instant responsiveness, it features a secure MPIN gate, multi-factor authentication (2FA), a cascading monthly budget carry-forward engine, investment tracking, subscription monitoring, gamified milestones, and an interactive AI financial coach.

---

## ✨ Features

### 📊 1. Financial Operating Dashboard
- **Dynamic Ledger Overview**: Monitor income, expenses, savings rate, and overall net worth.
- **ECharts Interactive Visualizations**: Real-time daily inflow/outflow charts rendering spending trends.
- **Dynamic Welcome Greeting**: Calculates local time-of-day greetings (Good Morning/Afternoon/Evening) and greets you by your profile name.

### 🔄 2. Offline-First Cloud Sync
- **IndexedDB Cache**: Leverages **Dexie.js** for an offline-first caching layer that guarantees instantaneous rendering.
- **Firestore Synchronization**: Integrates real-time, bidirectional sync to **Firebase Firestore** when online.
- **Smart Snapshot Merging**: Automatically preserves local base64 attachments from being overwritten by cloud updates.

### 🔒 3. Layered Security & Authentication
- **Firebase Auth Isolation**: Implements secure logins and strict user isolation rules.
- **Local MPIN Gate**: Protects application sessions with a local lock screen.
- **RFC 6238 Standard 2FA**: Enables Google Authenticator or Microsoft Authenticator setup with local Base64 QR code rendering and standard Web Crypto HMAC verification.

### 💼 4. Cascading Budget Engine
- **Flexible Budget Modes**: Select between *Salary*, *Vacation*, *Emergency*, *Festival*, *Student*, and *AI-Optimized* modes.
- **Carry-Forward Engine**: Cascades positive monthly balances to the next month's opening balance, sequentially recalculating ledger totals.

### 📈 5. Assets & Subscriptions Tracker
- **Asset Portfolios**: Monitor stocks, mutual funds, crypto, real estate, and bonds with visual gain/loss charts.
- **Renewal Timelines**: Track Netflix, Spotify, or utility invoices with automated local renewal countdown warnings.

### 🎮 6. Gamification & AI Coach
- **Financial XP Badge**: Earn experience points (XP) for keeping logs, meeting budgets, and unlocking levels.
- **AI Coach**: A chat assistant offering proactive savings recommendations and portfolio optimization.

---

## 🛠️ Technology Stack

- **Frontend**: React (TypeScript), Vite, Zustand (State Store)
- **Styling**: Vanilla CSS, custom HSL palettes, amoled support
- **Charts**: ECharts
- **Local DB**: Dexie.js (IndexedDB)
- **Cloud Backend**: Firebase (Auth, Firestore, Storage)
- **Form Management**: React Hook Form, Zod

---

## ⚙️ Local Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Ashutosh-kgn/Xpenser-Pro.git
cd Xpenser-Pro
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

---

## 🔒 Security Rules (`firestore.rules`)
Firestore enforces user-level isolation using matching constraints:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /{subcollection=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```
