import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { MOCK_MEMBERS } from '../data/mockData';
import LoadingSpinner from '../components/LoadingSpinner';

const IS_DEMO   = import.meta.env.VITE_DEMO_MODE === 'true';
const DEMO_PASS = import.meta.env.VITE_DEMO_PASSWORD || 'demo1234';

// Roles that have admin (management) access
export const ADMIN_ROLES = ['secretary', 'president', 'superAdmin'];

const AuthContext = createContext(null);

// Firestore codes for "couldn't reach the server" (offline, weak signal)
const isConnectionError = (err) =>
  err?.code === 'unavailable' || err?.code === 'deadline-exceeded';

function ConnectionError() {
  return (
    <div className="min-h-screen bg-portal-bg flex items-center justify-center p-4">
      <div className="card-gold rounded-xl p-8 max-w-sm w-full text-center">
        <i className="fa-solid fa-wifi text-3xl text-portal-gold mb-4" />
        <h2 className="text-lg font-semibold text-portal-text">Can't connect</h2>
        <p className="text-portal-muted text-sm mt-2">
          MoraConnect couldn't reach the server. Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 w-full bg-portal-red hover:bg-portal-red-dark text-white font-semibold
                     py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-rotate-right" /> Try again
        </button>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [memberData,  setMemberData]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [authError,   setAuthError]   = useState(null);
  const [connError,   setConnError]   = useState(false);

  // ── Sync auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    // Demo mode: restore session from sessionStorage, skip Firebase entirely
    if (IS_DEMO) {
      try {
        const raw = sessionStorage.getItem('_demo_session');
        if (raw) {
          const { user, member } = JSON.parse(raw);
          setCurrentUser(user);
          setMemberData(member);
        }
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'members', user.email.toLowerCase()));
          if (snap.exists() && snap.data().isActive) {
            setCurrentUser(user);
            setMemberData({ id: snap.id, ...snap.data() });
          } else {
            // Not in members list or deactivated — force sign-out
            await fbSignOut(auth);
            setCurrentUser(null);
            setMemberData(null);
          }
        } catch (err) {
          if (isConnectionError(err)) {
            // A weak connection isn't proof they aren't a member — keep the
            // login and let them retry instead of signing them out.
            setConnError(true);
          } else {
            await fbSignOut(auth);
            setCurrentUser(null);
            setMemberData(null);
          }
        }
      } else {
        setCurrentUser(null);
        setMemberData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = async (email, password) => {
    setAuthError(null);
    const emailLower = email.toLowerCase().trim();

    // ── Demo mode shortcut ──────────────────────────────────────────────────
    if (IS_DEMO) {
      const member = MOCK_MEMBERS.find(m => m.email === emailLower && m.isActive);
      if (!member || password !== DEMO_PASS) {
        const msg = 'Invalid demo credentials. Use an account shown below.';
        setAuthError(msg);
        throw new Error(msg);
      }
      const fakeUser = { email: member.email, uid: `demo-${member.id}`, displayName: member.fullName };
      setCurrentUser(fakeUser);
      setMemberData(member);
      sessionStorage.setItem('_demo_session', JSON.stringify({ user: fakeUser, member }));
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, emailLower, password);

      // Immediate Firestore check (fast-path; onAuthStateChanged repeats it)
      const snap = await getDoc(doc(db, 'members', result.user.email.toLowerCase()));
      if (!snap.exists() || !snap.data().isActive) {
        await fbSignOut(auth);
        const err = new Error('ACCESS_DENIED');
        err.code  = 'ACCESS_DENIED';
        throw err;
      }
    } catch (error) {
      let message;
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          message = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        case 'ACCESS_DENIED':
          message = 'Access Denied: Your account is not registered as an active member.';
          break;
        case 'auth/network-request-failed':
        case 'unavailable':
        case 'deadline-exceeded':
          message = "Can't connect. Check your internet connection and try again.";
          break;
        default:
          message = error.message || 'An error occurred. Please try again.';
      }
      setAuthError(message);
      throw error;
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────────
  // ── Refresh member data (e.g. after profile photo update) ───────────────
  const refreshMemberData = (updates) => {
    setMemberData(prev => {
      const updated = { ...prev, ...updates };
      if (IS_DEMO) {
        try {
          const raw = sessionStorage.getItem('_demo_session');
          if (raw) {
            const session = JSON.parse(raw);
            session.member = updated;
            sessionStorage.setItem('_demo_session', JSON.stringify(session));
          }
        } catch { /* ignore */ }
      }
      return updated;
    });
  };

  const signOut = async () => {
    if (IS_DEMO) {
      sessionStorage.removeItem('_demo_session');
      setCurrentUser(null);
      setMemberData(null);
      return;
    }
    return fbSignOut(auth);
  };

  const value = {
    currentUser,
    memberData,
    loading,
    authError,
    setAuthError,
    signIn,
    signOut,
    refreshMemberData,
    isAdmin:      ADMIN_ROLES.includes(memberData?.role),
    isSuperAdmin: memberData?.role === 'superAdmin',
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (connError) return <ConnectionError />;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
