# MoraLeo Portal

A private member portal for the **Leo Club of Moratuwa, Sri Lanka**.

Built with **React 18 + Vite**, **Tailwind CSS**, **Firebase** (Auth + Firestore) and **docx.js** for offline Word export.

---

## Tech Stack

| Layer     | Technology                      |
|-----------|---------------------------------|
| Frontend  | React 18 + Vite                 |
| Styling   | Tailwind CSS (dark Leo theme)   |
| Backend   | Firebase Auth + Firestore       |
| Hosting   | Firebase Hosting                |
| Word export | docx (client-side, no server) |
| Icons     | Font Awesome 6 Free             |
| Font      | Poppins (Google Fonts)          |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project (see setup below)

### 1. Clone and Install

```bash
git clone <repo-url>
cd moraleo-portal
npm install
```

### 2. Configure Firebase

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your Firebase credentials (from Firebase Console → Project Settings → Your apps → Web app):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Firebase Project Setup (Step by Step)

### Step 1 — Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → Name it (e.g. `moraleo-portal`)
3. Disable Google Analytics (optional) → **Create project**

### Step 2 — Enable Authentication

1. In Firebase Console → **Build** → **Authentication**
2. Click **Get started**
3. Under **Sign-in method**, enable **Email/Password**
4. Save

### Step 3 — Create Firestore Database

1. **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Production mode** (you'll deploy rules later)
4. Select a region → **Enable**

### Step 4 — Register Web App

1. **Project Settings** (gear icon) → **Your apps** → **Add app** → Web (`</>`)
2. Register app → Copy the `firebaseConfig` object
3. Paste values into your `.env` file

### Step 5 — Deploy Firestore Security Rules

```bash
firebase login
firebase init firestore   # select your project
firebase deploy --only firestore:rules
```

The `firestore.rules` file in this repo is already set up correctly.

---

## Creating the First Secretary Account

The secretary account must be created **manually** (no self-registration).

### Method A — Firebase Console (Recommended for first account)

1. Firebase Console → **Authentication** → **Users** → **Add user**
2. Enter the secretary's email and a strong password
3. Note the User UID

Then create the Firestore document:

1. **Firestore** → **members** collection → **Add document**
2. **Document ID**: `secretary@yourclub.com` (use actual email, lowercase)
3. Add these fields:

| Field         | Type      | Value                    |
|---------------|-----------|--------------------------|
| `memberId`    | string    | `LCM-SEC-001`            |
| `fullName`    | string    | `Secretary Full Name`    |
| `email`       | string    | `secretary@yourclub.com` |
| `phone`       | string    | `+94 77 000 0000`        |
| `role`        | string    | `secretary`              |
| `position`    | string    | `Secretary`              |
| `joinDate`    | timestamp | (today)                  |
| `term`        | string    | `2025/26`                |
| `profilePhoto`| string    | `` (empty)               |
| `isActive`    | boolean   | `true`                   |

### Method B — Firebase CLI (once you have the app running)

Use the Firebase Admin SDK or add the document directly via the Firebase console as above.

---

## Adding Members (After Setup)

1. Log in as secretary at `/login`
2. Go to **Administration → Members**
3. Click **Add Member**
4. Fill in all details + set an initial password
5. The app creates both the Firebase Auth account AND the Firestore document

The new member can now log in with their email and the initial password. You should advise them to change their password via Firebase's password reset flow.

---

## Deploying to Firebase Hosting

### 1. Build the app

```bash
npm run build
```

### 2. Initialize Firebase Hosting

```bash
firebase init hosting
```

- Select your Firebase project
- Public directory: `dist`
- Configure as single-page app: **Yes**
- Overwrite `dist/index.html`: **No**

### 3. Deploy

```bash
firebase deploy
```

Your app will be live at `https://<project-id>.web.app`

---

## Project Structure

```
moraLeoPortal/
├── public/
│   └── logo.svg                   # Club logo (replace with real logo)
├── src/
│   ├── assets/
│   │   └── logo.svg               # Logo used in components
│   ├── components/
│   │   ├── Badge.jsx              # Status/role pill badges
│   │   ├── ConfirmDialog.jsx      # Destructive action confirm modal
│   │   ├── Layout.jsx             # App shell (Navbar + Sidebar + Outlet)
│   │   ├── LoadingSpinner.jsx     # Loading indicator
│   │   ├── Modal.jsx              # Generic modal wrapper
│   │   ├── Navbar.jsx             # Top navigation bar
│   │   ├── ProtectedRoute.jsx     # Auth + role guard
│   │   └── Sidebar.jsx            # Navigation sidebar
│   ├── context/
│   │   ├── AuthContext.jsx        # Firebase Auth + Firestore member check
│   │   └── ToastContext.jsx       # Toast notification system
│   ├── hooks/
│   │   ├── useAuth.js             # Auth hook (re-export)
│   │   ├── useEvents.js           # Events data hook
│   │   └── useMembers.js          # Members data hook
│   ├── pages/
│   │   ├── LoginPage.jsx          # /login
│   │   ├── DashboardPage.jsx      # /dashboard
│   │   ├── ProfilePage.jsx        # /profile
│   │   ├── EventsPage.jsx         # /events
│   │   └── admin/
│   │       ├── MembersPage.jsx    # /admin/members  (secretary)
│   │       ├── AdminEventsPage.jsx # /admin/events  (secretary)
│   │       └── AttendancePage.jsx  # /admin/events/:id/attendance
│   ├── services/
│   │   ├── firebase.js            # Firebase app init
│   │   ├── memberService.js       # Firestore member operations
│   │   ├── eventService.js        # Firestore event + attendance operations
│   │   └── wordExport.js          # Client-side Word document generation
│   ├── utils/
│   │   └── helpers.js             # Date formatters, misc utilities
│   ├── App.jsx                    # Router + providers
│   ├── index.css                  # Tailwind + CSS variables
│   └── main.jsx                   # React entry point
├── firestore.rules                # Firestore security rules
├── firebase.json                  # Firebase project config
├── tailwind.config.js             # Tailwind + Leo Club color theme
├── vite.config.js
└── .env.example                   # Environment variable template
```

---

## Color Theme

Matches the Leo Club of Moratuwa main website exactly:

| Variable          | Value      | Usage                         |
|-------------------|------------|-------------------------------|
| `--bg-main`       | `#080001`  | Page background               |
| `--bg-card`       | `#100003`  | Card / panel background       |
| `--bg-hover`      | `#1a0005`  | Hover state                   |
| `--red`           | `#CC0000`  | Primary buttons, Leo red      |
| `--gold`          | `#C9A84C`  | Accents, borders, headings    |
| `--text-main`     | `#f0f0f0`  | Primary text                  |
| `--text-muted`    | `#a09090`  | Secondary / muted text        |

In Tailwind classes: `bg-portal-bg`, `bg-portal-card`, `text-portal-gold`, `bg-portal-red`, etc.

---

## Security

- **No public data** — unauthenticated users see only the login page
- **Access control** — all login attempts are verified against Firestore `members` collection
- **Role-based routes** — admin pages redirect non-secretaries to `/dashboard`
- **Firestore rules** — members can only read their own data; secretaries have full access
- **Secondary Firebase app** — used for creating new member accounts so the current secretary session is preserved

---

## Replacing the Logo

The current `public/logo.svg` and `src/assets/logo.svg` are placeholder SVGs.

To use the real club logo:

1. Replace both files with your logo image (PNG or SVG)
2. Update the `<img>` tag in `Sidebar.jsx` and `Navbar.jsx` if needed
3. Update `<link rel="icon">` in `index.html` to point to the correct file

---

## License

Internal tool — Leo Club of Moratuwa. All rights reserved.
