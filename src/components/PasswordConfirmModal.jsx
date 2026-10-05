import { useState, useEffect } from 'react';
import Modal                   from './Modal';
import { InlineSpinner }       from './LoadingSpinner';
import { useAuth }             from '../context/AuthContext';
import { verifyCurrentPassword, isWrongPasswordError } from '../services/authService';

/**
 * Confirmation for a destructive action that also asks for the admin's own
 * password, so an unattended signed-in browser can't be used to delete data.
 *
 * `children` is the warning shown at the top. `onConfirm` runs once the
 * password checks out; if it throws, `failureMessage` is shown and the
 * dialog stays open. The parent closes the dialog when `onConfirm` succeeds.
 */
function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  confirmText,
  confirmIcon    = 'fa-trash',
  busyText       = 'Working…',
  failureMessage = 'Something went wrong. Please try again.',
}) {
  const { memberData } = useAuth();
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [busy,     setBusy]     = useState(false);

  // Fresh form every time the dialog opens
  useEffect(() => {
    if (isOpen) { setPassword(''); setError(''); }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) { setError('Please enter your password.'); return; }
    setBusy(true);
    setError('');
    try {
      await verifyCurrentPassword(memberData.email, password);
    } catch (err) {
      setError(isWrongPasswordError(err)
        ? 'Incorrect password. Try again.'
        : 'Could not verify your password. Please try again.');
      setBusy(false);
      return;
    }
    try {
      await onConfirm();
    } catch {
      setError(failureMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Warning banner */}
        <div className="flex gap-3 bg-red-950/50 border border-red-700/40 rounded-lg px-4 py-3">
          <i className="fa-solid fa-triangle-exclamation text-red-400 mt-0.5 flex-shrink-0" />
          {children}
        </div>

        <div>
          <label className="block text-xs text-portal-muted mb-1">
            Enter your password to confirm
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Your account password"
            autoComplete="current-password"
            className="w-full bg-portal-bg border border-white/10 rounded-lg px-3 py-2
                       text-portal-text text-sm focus:outline-none focus:border-red-500/60
                       placeholder:text-portal-muted/50"
          />
          {error && (
            <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
              <i className="fa-solid fa-circle-exclamation" />{error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-portal-muted hover:text-portal-text
                       border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600
                       text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
          >
            {busy
              ? <><InlineSpinner />{busyText}</>
              : <><i className={`fa-solid ${confirmIcon}`} />{confirmText}</>
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default PasswordConfirmModal;
