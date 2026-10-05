import {
  collection, doc, getDocs, getDoc, deleteDoc,
  setDoc, updateDoc, serverTimestamp, query, where, orderBy,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, signOut as fbSignOut, deleteUser,
} from 'firebase/auth';
import { db, firebaseConfig } from './firebase';
import { deleteProfilePhoto } from './storageService';
import { sendPasswordReset, normalizeEmail } from './authService';
import { docsWithIds, withId, deleteInBatches, logDemoWrite } from './firestoreUtils';
import { MOCK_MEMBERS } from '../data/mockData';
import { ROLES } from '../data/roles';
import { IS_DEMO } from '../config/env';

/**
 * Members: members/{email} (lowercase email as the document id).
 */

// ─── Secondary Firebase app ────────────────────────────────────────────────
// Used to create new Auth accounts without signing out the current secretary.
function getSecondaryAuth() {
  const existing = getApps().find(a => a.name === 'secondary');
  const app      = existing ?? initializeApp(firebaseConfig, 'secondary');
  return getAuth(app);
}

const memberRef = (email) => doc(db, 'members', normalizeEmail(email));

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getMembers() {
  if (IS_DEMO) return [...MOCK_MEMBERS].sort((a, b) => a.fullName.localeCompare(b.fullName));
  return docsWithIds(await getDocs(query(collection(db, 'members'), orderBy('fullName'))));
}

export async function getMember(email) {
  if (IS_DEMO) return MOCK_MEMBERS.find(m => m.email === email.toLowerCase()) ?? null;
  const snap = await getDoc(memberRef(email));
  return snap.exists() ? withId(snap) : null;
}

/** The member record if it exists and is active, else null. */
export async function getActiveMember(email) {
  const member = await getMember(email);
  return member?.isActive ? member : null;
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
  await sendPasswordReset(email);
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
    logDemoWrite('createMember');
    return { inviteSent: true };
  }
  const email = normalizeEmail(memberData.email);

  // Never overwrite an existing member record
  if ((await getDoc(memberRef(email))).exists()) {
    const err = new Error('A member with this email already exists.');
    err.code  = 'member-exists';
    throw err;
  }

  const secondaryAuth = getSecondaryAuth();

  // 1. Create Auth account. If the email already has a login (e.g. a removed
  //    member — the browser can't delete logins), this fails on purpose rather
  //    than reusing it: anyone can register a login for any email, so reusing
  //    one could hand the member's access to whoever created it.
  const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, randomPassword());

  // 2. Persist member document. If this fails, roll back the Auth account
  //    we just created so we never leave a login with no member record.
  try {
    await setDoc(memberRef(email), {
      memberId:     memberData.memberId     ?? '',
      fullName:     memberData.fullName     ?? '',
      email,
      phone:        memberData.phone        ?? '',
      role:         memberData.role         ?? ROLES.MEMBER,
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
  if (IS_DEMO) { logDemoWrite('updateMember'); return; }
  // `id` is the document key the UI carries around, not a field to store
  const { id: _id, ...fields } = updates;
  await updateDoc(memberRef(email), fields);
}

export async function toggleMemberStatus(email, isActive) {
  if (IS_DEMO) { logDemoWrite('toggleMemberStatus'); return; }
  await updateDoc(memberRef(email), { isActive });
}

// ─── Remove ────────────────────────────────────────────────────────────────

/**
 * Permanently removes a member: their attendance records, manual points,
 * member record and profile photo. Super Admin only (enforced by the rules).
 *
 * Their Firebase Auth login can't be deleted from the browser. Without a
 * member record it has no access (rules + app sign-out); to re-add the same
 * email later, delete the login in Firebase Console first.
 */
export async function removeMember(email) {
  if (IS_DEMO) { logDemoWrite('removeMember'); return; }
  const id = normalizeEmail(email);
  const [att, pts] = await Promise.all([
    getDocs(query(collection(db, 'attendance'),   where('memberId', '==', id))),
    getDocs(query(collection(db, 'memberPoints'), where('memberId', '==', id))),
  ]);

  // Records first, member record last: if anything fails part-way the member
  // still exists and Remove can simply be run again.
  await deleteInBatches([...att.docs, ...pts.docs].map(d => d.ref));
  await deleteDoc(memberRef(id));
  await deleteProfilePhoto(id);
}
