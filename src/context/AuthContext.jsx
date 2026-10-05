import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  watchAuthState, signInWithPassword, signOutUser, normalizeEmail,
  signInErrorMessage, isConnectionError,
} from '../services/authService';
import { getActiveMember } from '../services/memberService';
import { MOCK_MEMBERS }   from '../data/mockData';
import { isAdminRole, ROLES } from '../data/roles';
import { IS_DEMO, DEMO_PASSWORD } from '../config/env';
import LoadingSpinner     from '../components/LoadingSpinner';
import ConnectionError    from '../components/ConnectionError';

const AuthContext = createContext(null);

// ── Demo mode: the "signed-in" member lives in sessionStorage ───────────────
const DEMO_SESSION_KEY = '_demo_session';

function readDemoSession() {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeDemoSession(session) {
  try {
    if (session) sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch { /* ignore */ }
}

/**
 * Who is signed in. A Firebase login only counts if the email has an active
 * member record (anyone can create a login, so the record is what grants
 * access — the security rules check the same thing on every request).
 */
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [memberData,  setMemberData]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [authError,   setAuthError]   = useState(null);
  const [connError,   setConnError]   = useState(false);

  const clearSession = useCallback(() => {
    setCurrentUser(null);
    setMemberData(null);
  }, []);

  // ── Sync auth state ──────────────────────────────────────────────────────
  useEffect(() => {
    // Demo mode: restore session from sessionStorage, skip Firebase entirely
    if (IS_DEMO) {
      const session = readDemoSession();
      if (session) {
        setCurrentUser(session.user);
        setMemberData(session.member);
      }
      setLoading(false);
      return;
    }

    return watchAuthState(async (user) => {
      if (user) {
        try {
          const member = await getActiveMember(user.email);
          if (member) {
            setCurrentUser(user);
            setMemberData(member);
          } else {
            // Not in members list or deactivated — force sign-out
            await signOutUser();
            clearSession();
          }
        } catch (err) {
          if (isConnectionError(err)) {
            // A weak connection isn't proof they aren't a member — keep the
            // login and let them retry instead of signing them out.
            setConnError(true);
          } else {
            await signOutUser();
            clearSession();
          }
        }
      } else {
        clearSession();
      }
      setLoading(false);
    });
  }, [clearSession]);

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    setAuthError(null);

    if (IS_DEMO) {
      const member = MOCK_MEMBERS.find(m => m.email === normalizeEmail(email) && m.isActive);
      if (!member || password !== DEMO_PASSWORD) {
        const msg = 'Invalid demo credentials. Use an account shown below.';
        setAuthError(msg);
        throw new Error(msg);
      }
      const user = { email: member.email, uid: `demo-${member.id}`, displayName: member.fullName };
      setCurrentUser(user);
      setMemberData(member);
      writeDemoSession({ user, member });
      return;
    }

    try {
      const { user } = await signInWithPassword(email, password);
      // Immediate member check (fast-path; the auth listener repeats it)
      if (!(await getActiveMember(user.email))) {
        await signOutUser();
        const err = new Error('ACCESS_DENIED');
        err.code  = 'ACCESS_DENIED';
        throw err;
      }
    } catch (error) {
      setAuthError(signInErrorMessage(error));
      throw error;
    }
  }, []);

  // ── Refresh member data (e.g. after profile photo update) ───────────────
  const refreshMemberData = useCallback((updates) => {
    setMemberData(prev => {
      const updated = { ...prev, ...updates };
      if (IS_DEMO) {
        const session = readDemoSession();
        if (session) writeDemoSession({ ...session, member: updated });
      }
      return updated;
    });
  }, []);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (IS_DEMO) {
      writeDemoSession(null);
      clearSession();
      return;
    }
    return signOutUser();
  }, [clearSession]);

  const value = useMemo(() => ({
    currentUser,
    memberData,
    loading,
    authError,
    setAuthError,
    signIn,
    signOut,
    refreshMemberData,
    isAdmin:      isAdminRole(memberData?.role),
    isSuperAdmin: memberData?.role === ROLES.SUPER_ADMIN,
  }), [currentUser, memberData, loading, authError, signIn, signOut, refreshMemberData]);

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
