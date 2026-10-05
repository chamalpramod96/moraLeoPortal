import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  sendPasswordResetEmail, verifyPasswordResetCode, confirmPasswordReset,
  reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import { auth } from './firebase';
import { IS_DEMO, DEMO_PASSWORD } from '../config/env';

/**
 * Firebase Authentication calls. Pages and contexts use these instead of the
 * SDK directly, so login logic lives in one place.
 */

export const normalizeEmail = (email = '') => email.trim().toLowerCase();

/** Calls `callback(user | null)` on every sign-in change; returns unsubscribe. */
export const watchAuthState = (callback) => onAuthStateChanged(auth, callback);

export const signInWithPassword = (email, password) =>
  signInWithEmailAndPassword(auth, normalizeEmail(email), password);

export const signOutUser = () => signOut(auth);

/** Emails a link to set (or reset) the password — also used for invites. */
export const sendPasswordReset = (email) => sendPasswordResetEmail(auth, normalizeEmail(email));

/** Resolves to the email a reset link belongs to; rejects if it's bad or used. */
export const checkPasswordResetCode = (code) => verifyPasswordResetCode(auth, code);

export const completePasswordReset = (code, newPassword) =>
  confirmPasswordReset(auth, code, newPassword);

/**
 * Confirms the signed-in user's password before a destructive action.
 * Rejects with code 'auth/wrong-password' (or 'auth/invalid-credential') if
 * it doesn't match.
 */
export async function verifyCurrentPassword(email, password) {
  if (IS_DEMO) {
    if (password !== DEMO_PASSWORD) {
      throw Object.assign(new Error('Wrong password'), { code: 'auth/wrong-password' });
    }
    return;
  }
  await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(email, password));
}

export const isWrongPasswordError = (err) =>
  err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential';

/** A user-facing message for a failed sign-in. */
export function signInErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'ACCESS_DENIED':
      return 'Access Denied: Your account is not registered as an active member.';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return "Can't connect. Check your internet connection and try again.";
    default:
      return error?.message || 'An error occurred. Please try again.';
  }
}

/** Firestore codes for "couldn't reach the server" (offline, weak signal). */
export const isConnectionError = (err) =>
  err?.code === 'unavailable' || err?.code === 'deadline-exceeded';
