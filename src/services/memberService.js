import {
  collection, doc, getDocs, getDoc,
  setDoc, updateDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import {
  initializeApp, getApps,
} from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, signOut as fbSignOut,
} from 'firebase/auth';
import { db, firebaseConfig } from './firebase';
import { MOCK_MEMBERS } from '../data/mockData';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// ─── Secondary Firebase app ────────────────────────────────────────────────
// Used to create new Auth accounts without signing out the current secretary.
function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === 'secondary');
  const app      = existing ?? initializeApp(firebaseConfig, 'secondary');
  return getAuth(app);
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getMembers() {
  if (IS_DEMO) return [...MOCK_MEMBERS].sort((a, b) => a.fullName.localeCompare(b.fullName));
  const q    = query(collection(db, 'members'), orderBy('fullName'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMember(email) {
  if (IS_DEMO) return MOCK_MEMBERS.find(m => m.email === email.toLowerCase()) ?? null;
  const snap = await getDoc(doc(db, 'members', email.toLowerCase()));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Create ────────────────────────────────────────────────────────────────

/**
 * Creates a Firebase Auth account (using secondary app so the secretary
 * stays logged in), then writes the member document to Firestore.
 */
export async function createMember(memberData, password) {
  if (IS_DEMO) {
    // Simulate success in demo mode — data is not actually persisted
    console.info('[DEMO] createMember called — changes are not saved in demo mode.');
    return { email: memberData.email };
  }
  const secondaryAuth = getSecondaryAuth();

  // 1. Create Auth account
  const { user } = await createUserWithEmailAndPassword(
    secondaryAuth,
    memberData.email.toLowerCase(),
    password,
  );

  // 2. Sign out of secondary app immediately
  await fbSignOut(secondaryAuth);

  // 3. Persist member document
  const email = memberData.email.toLowerCase();
  await setDoc(doc(db, 'members', email), {
    memberId:     memberData.memberId     ?? '',
    fullName:     memberData.fullName     ?? '',
    email,
    phone:        memberData.phone        ?? '',
    role:         memberData.role         ?? 'member',
    position:     memberData.position     ?? '',
    term:         memberData.term         ?? '',
    profilePhoto: memberData.profilePhoto ?? '',
    isActive:     true,
    joinDate:     serverTimestamp(),
  });

  return user;
}

// ─── Update ────────────────────────────────────────────────────────────────

export async function updateMember(email, updates) {
  if (IS_DEMO) { console.info('[DEMO] updateMember — not persisted.'); return; }
  await updateDoc(doc(db, 'members', email.toLowerCase()), updates);
}

export async function toggleMemberStatus(email, isActive) {
  if (IS_DEMO) { console.info('[DEMO] toggleMemberStatus — not persisted.'); return; }
  await updateDoc(doc(db, 'members', email.toLowerCase()), { isActive });
}
