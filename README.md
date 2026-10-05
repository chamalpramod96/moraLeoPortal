# MoraConnect

The member portal of the **Leo Club of Moratuwa** — attendance, Mora Connect
points, projects, leaderboard and the Orientation Program.
Live at **https://moraconnect.com**.

Built with React 18 + Vite + Tailwind CSS, on Firebase (Authentication,
Firestore, Storage, Hosting). There is no custom server: the browser talks to
Firebase directly, and **the security rules are what protect the data**.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the Firebase web-app values
npm run dev               # http://localhost:5173
```

| Command              | What it does                                                        |
|----------------------|---------------------------------------------------------------------|
| `npm run dev`        | Local dev server                                                    |
| `npm run build`      | Production build into `dist/`                                       |
| `npm run lint`       | ESLint (must be clean — CI blocks the deploy otherwise)             |
| `npm test`           | Unit tests for the points maths, config and helpers (Vitest)        |
| `npm run test:rules` | Security-rules tests against the local emulators (see below)        |

**Demo mode** — set `VITE_DEMO_MODE=true` (e.g. in `.env.demo.local` and run
`npm run dev -- --mode demo`) to use the mock arrays in `src/data/mockData.js`
instead of Firebase. Nothing is saved; the demo password is `demo1234`
(or `VITE_DEMO_PASSWORD`).

---

## Project structure

```
src/
  config/env.js        Build-time settings (IS_DEMO, demo password) — read env vars only here
  data/                Static configuration: points table, levels, roles, event types, mock data
  domain/points.js     Points maths (pure functions, unit-tested) — the single source of totals
  services/            All Firebase access, one module per collection
    firebase.js          SDK initialisation
    authService.js       Sign-in, password reset, password re-check
    memberService.js     members/{email}
    eventService.js      events + attendance (incl. event photos)
    pointsService.js     memberPoints (manual "awards")
    projectService.js    projects (+ poster images)
    orientationService.js orientation files
    leaderboardService.js computes + publishes leaderboard/current
    storageService.js    profile and event photos
    firestoreUtils.js    small shared helpers (ids, dates, batched deletes)
    wordExport.js        "Download Profile" Word document (loaded on demand)
  hooks/               useAsync (load + loading/error state), useMemberActivity,
                       useEvents, useMembers, useProfilePhoto
  context/             AuthContext (who is signed in), ToastContext (notifications)
  components/          Shared UI: Layout, Sidebar, Navbar, Modal, ConfirmDialog,
                       PasswordConfirmModal, AuthLayout, avatars, spinners, …
  pages/               One file per screen; page-specific parts in subfolders
    admin/               Members, Manage Events, Attendance (+ their forms/modals)
    projects/            ProjectCard, ProjectFormModal
tests/rules/           Security-rules tests (Firestore + Storage)
firestore.rules        Who can read/write what in the database
storage.rules          Who can upload/read files
```

**Layering:** pages → hooks → services → Firebase. Pages never import the
Firebase SDK; business rules (points, levels, roles) live in `domain/` and
`data/` and have no Firebase dependency, which is what makes them testable.

---

## Data model (Firestore)

| Collection                | Document                                                                 | Who can read            | Who can write            |
|---------------------------|--------------------------------------------------------------------------|-------------------------|--------------------------|
| `members/{email}`         | memberId, fullName, email, phone, role, position, term, profilePhoto, isActive, joinDate | the member themselves, admins | admins (Super Admin for superAdmin records); a member may only change their own photo |
| `events/{id}`             | title, description, date, location, category, pointsCategory, pointsValue, onlinePointsValue, photos[] | active members | admins |
| `attendance/{id}`         | eventId, memberId, status (`attended`, `attended_online`, `absent`, `excused`) | the member's own, admins | admins |
| `memberPoints/{id}`       | memberId, points, categoryId, description                                | the member's own, admins | admins                   |
| `projects/{id}`           | name, date, imageUrl, roles {chairperson, secretary, treasurer: {key, name}}, rolePoints | active members | admins |
| `orientation/{id}`        | title, description, fileName, url, storagePath                           | active members          | admins                   |
| `leaderboard/current`     | rows [{key, name, position, total, rank, …}]                             | active members          | admins (recomputed automatically) |

- **Roles:** `member`, `secretary`, `president`, `superAdmin`. The last three are
  admins (`src/data/roles.js`, mirrored in the rules). Only a Super Admin can
  create another Super Admin or permanently remove a member.
- **Privacy:** records every member can read (leaderboard, projects) identify
  people by `memberKey` = SHA-256 of their email, never the email itself.
- **Points:** total = event attendance + project roles + manual awards
  (`src/domain/points.js`). Events and projects store the points they were
  created with, so changing the points table never rewrites history.

---

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`:
**install → lint → unit tests → build → deploy to Firebase Hosting.**
If lint or a test fails, nothing is deployed.

Required GitHub secrets: `FIREBASE_SERVICE_ACCOUNT_MORALEOPORTAL` and the six
`VITE_FIREBASE_*` values from `.env`.

**Security rules are not deployed by CI.** After changing `firestore.rules` or
`storage.rules`, run the rules tests, then publish:

```bash
firebase deploy --only firestore:rules,storage
```

---

## Security-rules tests

`tests/rules/rules.test.mjs` checks 118 allow/deny cases (members can't read
each other's data, deactivated members lose access, only admins write, only
photo types upload, …) against the local emulators under a `demo-` project,
so it never touches real data. It also runs on GitHub
(`.github/workflows/rules-tests.yml`) whenever the rules change.

Needs the Firebase CLI (`npm i -g firebase-tools`) and Java 11+.
On Windows, if your user folder has a space in it, point Java's socket folder
somewhere without one first:

```bash
set JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\temp\jtmp
npm run test:rules
```

---

## For club admins (handover)

- **Add a member:** Members → Add Member. They get an email to set their own
  password (ask them to check spam). "Resend invite" sends it again.
- **Remove a member:** Super Admin only, password-confirmed; deletes their
  record, attendance, points and photo. Their login stays in Firebase
  Authentication — delete it there before re-adding the same email.
- **Attendance:** Manage Events → Attendance. Hybrid meetings record Physical
  or Online.
- **Projects:** Projects → Add Project; the Chairperson, Secretary and
  Treasurer earn points automatically.
- The leaderboard updates by itself after any of these changes.
