# MoraConnect — Full Project Context for GitHub Copilot

> **Read this first.** This file gives the complete picture of the project — every file, feature, design decision, and deployment step. Update it whenever major changes are made.

---

## 1. What Is This Project?

**MoraConnect** is a private member portal for the **Leo Club of Moratuwa, Sri Lanka**.
Brand: "Mora" in gold (#C9A84C), "Connect" in white. Logo: `src/assets/47n.png` (also in `public/47n.png` for favicon).

**Target:** ~150 club members. Production deployment via Firebase Hosting.

**Four user roles (lowest → highest):**
- **member** — own profile, events, points, profile photo, download .docx
- **president** — all member access + full admin panel
- **secretary** — same as president
- **superAdmin** — all of the above + can assign/revoke superAdmin role, delete members

**Mode:** `VITE_DEMO_MODE=false` in `.env` (production). Set to `true` only for local dev testing.

---

## 2. Tech Stack

| Item | Version | Notes |
|------|---------|-------|
| React | 18.2 | Frontend UI |
| Vite | 5.0.11 | Build tool. Dev: `npm run dev` (localhost:5173). Prod: `npm run build` |
| Tailwind CSS | 3.4.1 | Custom `portal.*` color theme |
| React Router DOM | 6.21.1 | Client-side SPA routing |
| Firebase | 10.7.1 | Auth (email/password) + Firestore + Storage (modular SDK) |
| docx | 8.5.0 | Client-side Word .docx generation with embedded images |
| file-saver | 2.0.5 | Browser download trigger |
| Font Awesome | 6.5.1 | Icons via CDN in `index.html` |
| Poppins | — | Google Font via CDN |

---

## 3. Design System

**Custom Tailwind tokens (`tailwind.config.js`):**

| Token | Hex | Usage |
|-------|-----|-------|
| `portal-bg` | #080001 | Page background |
| `portal-card` | #100003 | Card backgrounds |
| `portal-hover` | #1a0005 | Hover state |
| `portal-red` | #CC0000 | Primary action |
| `portal-red-dark` | #aa0000 | Red hover |
| `portal-gold` | #C9A84C | Accent (labels, icons, borders) |
| `portal-gold-light` | #e0c068 | Gold hover |
| `portal-text` | #f0f0f0 | Primary text |
| `portal-muted` | #a09090 | Secondary text |

**CSS utilities** in `src/index.css`: `.input-base`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.card`, `.card-gold`, `.border-subtle`

---

## 4. Complete File Structure

```
moraLeoPortal/
├── public/
│   └── 47n.png                     Club logo (favicon source)
├── src/
│   ├── assets/
│   │   └── 47n.png                 Club logo (imported in components)
│   ├── context/
│   │   ├── AuthContext.jsx          Auth state. Exports: currentUser, memberData, isAdmin,
│   │   │                            isSuperAdmin, signIn, signOut, refreshMemberData.
│   │   │                            ADMIN_ROLES = ['secretary','president','superAdmin']
│   │   └── ToastContext.jsx         showToast(message, type) — type: success|error|info|warning
│   ├── data/
│   │   ├── mockData.js              Empty arrays (DEMO MODE only — tree-shaken in production)
│   │   └── pointsConfig.js          Mora Miglioria config: LEVELS(11), EVENT_POINT_CATEGORIES(24),
│   │                                MANUAL_POINT_CATEGORIES(44), getLevelInfo(), getEventCategory(),
│   │                                getManualCategory(), groupedEventCategories(), groupedManualCategories()
│   ├── hooks/
│   │   ├── useEvents.js             Loads all events → {events, loading, error, refetch}
│   │   ├── useMembers.js            Loads all members → {members, loading, error, refetch}
│   │   └── useProfilePhoto.js       Shared hook: {uploading, inputRef, handleChange, openPicker}
│   │                                Uploads to Firebase Storage profiles/{email}/photo (fixed path,
│   │                                overwrites on change). Calls refreshMemberData after upload.
│   ├── services/
│   │   ├── firebase.js              Firebase init. Exports: auth, db, storage, firebaseConfig
│   │   ├── memberService.js         getMembers(), getMember(email), createMember(data, password),
│   │   │                            updateMember(email, updates), toggleMemberStatus(email, isActive)
│   │   │                            Uses secondary Firebase app for createMember (admin stays logged in)
│   │   ├── eventService.js          getEvents(), getEvent(id), addEvent(eventData, createdBy),
│   │   │                            updateEvent(id, updates), deleteEvent(id) [batch: cascades attendance],
│   │   │                            getAttendanceForEvent(eventId), getMemberAttendance(email),
│   │   │                            saveEventAttendance(eventId, records, markedBy)
│   │   ├── pointsService.js         getMemberManualPoints(email), getAllManualPoints(),
│   │   │                            addManualPoints({memberId,points,categoryId,description,addedBy}),
│   │   │                            deleteManualPoints(pointId),
│   │   │                            calcEventPoints(email, attendance, events),
│   │   │                            calcManualPoints(email, manualPoints),
│   │   │                            computeMemberPoints(email, attendance, events, manualPoints)
│   │   ├── storageService.js        uploadEventPhoto(eventId, file) → URL
│   │   │                            deleteEventPhoto(url)
│   │   │                            uploadProfilePhoto(email, file) → URL (fixed path, overwrites)
│   │   └── wordExport.js            downloadMemberProfile(member, events, attendance)
│   │                                Generates .docx with: profile photo, member details, attendance
│   │                                table, 2-column event photo grid (attended events only).
│   │                                All images fetched at download time (parallel). CORS-safe.
│   ├── components/
│   │   ├── Badge.jsx                Roles: member(blue), president(purple), secretary(gold),
│   │   │                            superAdmin(red). Status: attended(green), absent(red), excused(yellow)
│   │   ├── ConfirmDialog.jsx        Generic confirm/danger dialog
│   │   ├── Layout.jsx               App shell: <Sidebar> + <Navbar> + <Outlet>
│   │   ├── LoadingSpinner.jsx       Spinner. fullScreen prop = overlay
│   │   ├── Modal.jsx                Generic modal. sizes: sm/md/lg/xl
│   │   ├── Navbar.jsx               Top bar with user dropdown (name, position, memberId,
│   │   │                            My Profile link, Sign Out). Dropdown closes on outside click.
│   │   ├── ProtectedRoute.jsx       requireSecretary={true} blocks non-admin roles
│   │   └── Sidebar.jsx              Nav links for all + Admin section for isAdmin roles
│   ├── pages/
│   │   ├── LoginPage.jsx            /login — login form. Demo panel shown only when IS_DEMO=true.
│   │   │                            Developer credit: "Past President Leo Lion Chamal using AI"
│   │   ├── DashboardPage.jsx        /dashboard — clickable avatar (photo upload), points card,
│   │   │                            attendance stats, recent events list
│   │   ├── ProfilePage.jsx          /profile — clickable avatar, member details, Mora Miglioria
│   │   │                            points section, attendance history table, download button
│   │   ├── EventsPage.jsx           /events — event cards with photo thumbnails, sign-sheet badge
│   │   ├── PointsTablePage.jsx      /points — full reference: personal progress, levels diagram,
│   │   │                            event categories table, manual categories, evaluation ratings
│   │   └── admin/
│   │       ├── MembersPage.jsx      /admin/members — member CRUD. Dynamic ROLES: non-superAdmin
│   │       │                        sees [member,president,secretary]; superAdmin also sees [superAdmin].
│   │       │                        Trophy icon per member → manual points modal (view/add/delete)
│   │       ├── AdminEventsPage.jsx  /admin/events — event CRUD with points category + photo upload
│   │       │                        (max 3, event/signsheet type). Delete requires password re-auth.
│   │       └── AttendancePage.jsx   /admin/events/:eventId/attendance — mark attendance with status
│   │                                cycling. Photo in MembersPage/AttendancePage syncs from AuthContext
│   │                                via useMemo patch (live update without page refresh)
│   ├── utils/
│   │   └── helpers.js               formatDate, formatDateShort, calcAttendanceRate, initials
│   ├── App.jsx                      All routes. Admin routes wrapped in ProtectedRoute requireSecretary
│   ├── main.jsx                     Entry point
│   └── index.css                    Tailwind + utility classes
├── .env                             VITE_DEMO_MODE=false. Fill VITE_FIREBASE_* values from Firebase Console.
│                                    NEVER commit this file.
├── .gitignore                       Excludes .env, node_modules/, dist/
├── firestore.rules                  Roles: isAdmin() checks ['secretary','president','superAdmin'].
│                                    isSuperAdmin() checks 'superAdmin'. SuperAdmin role changes
│                                    protected server-side. Deny-all fallback.
├── storage.rules                    Profile photos: owner or admin can write (5MB cap, image/* only).
│                                    Event photos: admin only (10MB cap). Admin verified via firestore.get().
├── firebase.json                    Hosting: dist/, SPA rewrite. Security headers: X-Frame-Options DENY,
│                                    CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
│                                    Asset cache: 1 year immutable. Also deploys firestore.rules + storage.rules.
├── tailwind.config.js               Custom portal.* colors + Poppins font
├── vite.config.js                   sourcemap:false (no source maps in prod). esbuild drops console+debugger
│                                    in production. manualChunks: firebase, docx, react-vendor.
├── SYSTEM_REPORT.html               Comprehensive system/security/deployment report (open in browser)
└── COPILOT_CONTEXT.md               This file
```

---

## 5. Security Architecture

### Protection Layers (Defence in Depth)

1. **React UI** — hides controls based on `isAdmin`/`isSuperAdmin` from AuthContext
2. **ProtectedRoute** — client-side route guard blocks navigation
3. **Firestore Rules** — server-side enforcement, cannot be bypassed from client
4. **Storage Rules** — file uploads verified server-side (role + size + content-type)
5. **Build protection** — `sourcemap: false`, console stripped, minified, no comments

### Key Security Facts
- No `dangerouslySetInnerHTML` anywhere — XSS-safe by design
- Passwords never stored — managed by Firebase Auth
- Delete event requires password re-authentication (`reauthenticateWithCredential`)
- Profile photo storage path is fixed per user (`profiles/{email}/photo`) — overwrite = no accumulation
- Demo mode (`VITE_DEMO_MODE=true`) is build-time constant — dead branches tree-shaken in production

### Firestore Collections
- `members/{email}` — document ID is lowercase email
- `events/{autoId}`
- `attendance/{autoId}` — fields: eventId, memberId, status, markedBy, markedAt
- `memberPoints/{autoId}` — fields: memberId, points, categoryId, description, addedBy, addedAt

### Storage Paths
- `profiles/{email}/photo` — profile photo (fixed path, overwrites)
- `events/{eventId}/{filename}` — event photos

---

## 6. Deployment

### Steps (one-time)
```bash
npm install
npm run build
firebase login
firebase use --add          # select your Firebase project
firebase deploy             # deploys hosting + Firestore rules + Storage rules
```

### First Admin (after deploy)
1. Firebase Console → Authentication → Add user → email + password
2. Firestore → members collection → Add document (ID = email) with `role: "superAdmin"`, `isActive: true`
3. Log in → Admin → Members → add other members with `president` or `secretary` roles

### .env Required Values
```
VITE_DEMO_MODE=false
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 7. Important Patterns

### Profile Photo Upload (anywhere in app)
```jsx
import { useProfilePhoto } from '../hooks/useProfilePhoto';
const { uploading, inputRef, handleChange } = useProfilePhoto();
// Attach inputRef to hidden <input type="file" accept="image/*" onChange={handleChange} />
// Call inputRef.current?.click() on avatar click
```

### isAdmin / isSuperAdmin
```js
const { isAdmin, isSuperAdmin } = useAuth();
```

### Toast Notifications
```js
const { showToast } = useToast();
showToast('Message', 'success'); // success | error | info | warning
```

### Adding a New Route
1. Create page in `src/pages/`
2. Import in `src/App.jsx`
3. Add `<Route>` — wrap in `<ProtectedRoute requireSecretary>` if admin-only
4. Add `<NavItem>` in `src/components/Sidebar.jsx` with `isAdmin &&` if admin-only

---

*Last updated: July 2026 — Production-ready build. All dummy data removed. Firebase setup pending.*
