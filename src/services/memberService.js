import {
  collection, doc, getDocs, getDoc,
  setDoc, updateDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import {
  initializeApp, getApps,
} from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, signOut as fbSignOut, deleteUser,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth, db, firebaseConfig } from './firebase';
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

// Throwaway password for a new account. Nobody ever sees or uses it — the
// member sets their own password from the invite email. The suffix covers
// any upper/lower/digit/symbol password policy on the project.
function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '') + 'Aa1!';
}

/**
 * Emails the member a link to set (or reset) their own password.
 * Used right after account creation and for the admin's "Resend invite".
 */
export async function sendSetPasswordEmail(email) {
  if (IS_DEMO) { console.info('[DEMO] sendSetPasswordEmail — no email sent.'); return; }
  await sendPasswordResetEmail(auth, email.toLowerCase());
}

/**
 * Creates a Firebase Auth account with a random password (using secondary app
 * so the secretary stays logged in), writes the member document to Firestore,
 * then emails the member a link to set their own password.
 *
 * Returns { inviteSent } — false if the account was created but the email
 * failed, so the admin can use "Resend invite".
 */
export async function createMember(memberData) {
  if (IS_DEMO) {
    // Simulate success in demo mode — data is not actually persisted
    console.info('[DEMO] createMember called — changes are not saved in demo mode.');
    return { inviteSent: true };
  }
  const secondaryAuth = getSecondaryAuth();

  // 1. Create Auth account
  const { user } = await createUserWithEmailAndPassword(
    secondaryAuth,
    memberData.email.toLowerCase(),
    randomPassword(),
  );

  // 2. Persist member document. If this fails, roll back the Auth account
  //    we just created so we never leave a login with no member record.
  const email = memberData.email.toLowerCase();
  try {
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
  } catch (err) {
    await deleteUser(user).catch(() => { /* best-effort rollback */ });
    throw err;
  } finally {
    // 3. Always sign out of the secondary app
    await fbSignOut(secondaryAuth).catch(() => {});
  }

  // 4. Invite email. The member exists at this point, so a failure here is
  //    reported rather than thrown.
  try {
    await sendSetPasswordEmail(email);
    return { inviteSent: true };
  } catch {
    return { inviteSent: false };
  }
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
