import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkPasswordResetCode, completePasswordReset } from '../services/authService';
import AuthLayout, { AuthError } from '../components/AuthLayout';
import { InlineSpinner } from '../components/LoadingSpinner';

const MIN_LENGTH = 8;

/**
 * Handles the link in Firebase's password-reset email (also used for new-member
 * invites). Firebase Console → Authentication → Templates → Password reset →
 * "Customize action URL" must point at https://moraconnect.com/reset-password,
 * which makes Firebase append ?mode=resetPassword&oobCode=…&apiKey=…&lang=…
 */
function ResetPasswordPage() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const mode      = params.get('mode');
  const oobCode   = params.get('oobCode');

  // 'checking' → 'form' → 'done', or 'invalid' if the link is bad/expired/used
  const [stage,    setStage]    = useState('checking');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) { setStage('invalid'); return; }
    checkPasswordResetCode(oobCode)
      .then(addr => { setEmail(addr); setStage('form'); })
      .catch(() => setStage('invalid'));
  }, [mode, oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await completePasswordReset(oobCode, password);
      setStage('done');
    } catch (err) {
      if (err.code === 'auth/weak-password') {
        setError('That password is too weak. Try a longer one with letters and numbers.');
      } else if (err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code') {
        setStage('invalid');
      } else {
        setError('Could not set the password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass = `w-full bg-portal-bg border border-white/5 rounded-lg pl-9 pr-10 py-2.5
                      text-portal-text placeholder-portal-muted/40 focus:outline-none
                      focus:border-portal-gold/50 transition-colors text-sm`;

  return (
    <AuthLayout subtitle="Set Your Password">
      {stage === 'checking' && (
        <div className="flex flex-col items-center py-8 text-portal-muted text-sm gap-3">
          <InlineSpinner size="w-6 h-6" gold />
          Checking your link…
        </div>
      )}

      {stage === 'invalid' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-600/40
                          flex items-center justify-center">
            <i className="fa-solid fa-link-slash text-2xl text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-portal-text mb-2">Link expired or already used</h2>
          <p className="text-portal-muted text-sm">
            Each link works once and only for a short time. Request a new one below,
            or ask your club secretary to resend your invite.
          </p>
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="mt-6 bg-portal-red hover:bg-portal-red-dark text-white font-semibold px-5 py-2.5
                       rounded-lg text-sm transition-colors flex items-center justify-center gap-2 w-full"
          >
            <i className="fa-solid fa-paper-plane" />
            Send a New Link
          </button>
        </div>
      )}

      {stage === 'form' && (
        <>
          <h2 className="text-lg font-semibold text-portal-text mb-1 text-center">
            <i className="fa-solid fa-key mr-2 text-portal-gold" />
            Choose a Password
          </h2>
          <p className="text-portal-muted text-xs text-center mb-6 break-all">
            for <strong className="text-portal-text">{email}</strong>
          </p>

          <AuthError message={error} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Hidden username field lets password managers save the login */}
            <input type="email" value={email} autoComplete="username" readOnly hidden />

            <div>
              <label className="block text-xs font-medium text-portal-muted mb-1.5 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2
                               text-portal-muted/60 text-sm pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  className={inputClass}
                  placeholder={`At least ${MIN_LENGTH} characters`}
                  autoComplete="new-password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  title={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-portal-muted/60
                             hover:text-portal-text text-sm"
                >
                  <i className={`fa-solid ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-portal-muted mb-1.5 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2
                               text-portal-muted/60 text-sm pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  className={inputClass}
                  placeholder="Type it again"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !password || !confirm}
              className="w-full bg-portal-red hover:bg-portal-red-dark disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg
                         transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {saving ? (
                <>
                  <InlineSpinner size="w-4 h-4" />
                  Saving…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" />
                  Set Password
                </>
              )}
            </button>
          </form>
        </>
      )}

      {stage === 'done' && (
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/30 border border-green-600/40
                          flex items-center justify-center">
            <i className="fa-solid fa-check text-2xl text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-portal-text mb-2">Password set!</h2>
          <p className="text-portal-muted text-sm">
            You can now sign in to MoraConnect with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 bg-portal-red hover:bg-portal-red-dark text-white font-semibold px-5 py-2.5
                       rounded-lg text-sm transition-colors flex items-center justify-center gap-2 w-full"
          >
            <i className="fa-solid fa-right-to-bracket" />
            Go to Sign In
          </button>
        </div>
      )}
    </AuthLayout>
  );
}

export default ResetPasswordPage;
