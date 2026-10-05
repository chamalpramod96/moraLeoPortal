import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordReset } from '../services/authService';
import AuthLayout, { AuthError } from '../components/AuthLayout';
import { InlineSpinner } from '../components/LoadingSpinner';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    // The "sent" screen is the same whether or not the email is registered,
    // so this page can't be used to discover which addresses have accounts.
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setSent(true);
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Password Recovery">
      {!sent ? (
        <>
          <h2 className="text-lg font-semibold text-portal-text mb-3 text-center">
            <i className="fa-solid fa-key mr-2 text-portal-gold" />
            Reset Your Password
          </h2>
          <p className="text-portal-muted text-xs text-center mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <AuthError message={error} />

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-portal-muted mb-1.5 uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2
                               text-portal-muted/60 text-sm pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full bg-portal-bg border border-white/5 rounded-lg
                             pl-9 pr-4 py-2.5 text-portal-text placeholder-portal-muted/40
                             focus:outline-none focus:border-portal-gold/50 transition-colors text-sm"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-portal-red hover:bg-portal-red-dark disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg
                         transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <InlineSpinner size="w-4 h-4" />
                  Sending…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-portal-gold hover:text-portal-gold/80 text-xs transition-colors"
            >
              <i className="fa-solid fa-arrow-left mr-1" />
              Back to Sign In
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-900/30 border border-green-600/40
                            flex items-center justify-center">
              <i className="fa-solid fa-check text-2xl text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-portal-text mb-2">
              Check Your Email
            </h2>
            <p className="text-portal-muted text-sm">
              If <strong>{email}</strong> is registered, we've sent a password reset link to it.
            </p>
            <p className="text-portal-muted text-xs mt-3">
              Check your inbox and spam folder. The link expires in 1 hour.
            </p>
          </div>

          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="bg-portal-red hover:bg-portal-red-dark text-white font-semibold px-5 py-2.5
                         rounded-lg text-sm transition-colors flex items-center justify-center gap-2 w-full"
            >
              <i className="fa-solid fa-right-to-bracket" />
              Return to Sign In
            </button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
