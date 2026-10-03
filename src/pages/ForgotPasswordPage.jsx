import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import logo from '../assets/47n.png';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      setMessage('Password reset link sent! Check your email.');
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
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
    <div className="min-h-screen bg-portal-gold flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64
                      bg-portal-red/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-64
                      bg-portal-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Club logo + title */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Leo Club of Moratuwa" className="w-24 h-24 mb-5 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-shadow-gold">
            <span className="text-portal-gold">Mora</span><span className="text-portal-text">Connect</span>
          </h1>
          <p className="text-portal-muted text-sm mt-1.5 tracking-wide">
            Password Recovery
          </p>
        </div>

        {/* Reset card */}
        <div className="card-gold rounded-xl p-8 shadow-2xl">
          {!sent ? (
            <>
              <h2 className="text-lg font-semibold text-portal-text mb-3 text-center">
                <i className="fa-solid fa-key mr-2 text-portal-gold" />
                Reset Your Password
              </h2>
              <p className="text-portal-muted text-xs text-center mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              {/* Error banner */}
              {error && (
                <div className="mb-5 p-3 bg-red-900/30 border border-red-600/40 rounded-lg
                                text-red-400 text-sm flex items-start gap-2">
                  <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

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
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-portal-muted text-xs mt-3">
                  Click the link in your email to create a new password. The link expires in 1 hour.
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
        </div>

        {/* Developer credit */}
        <p className="text-center mt-6 text-portal-muted text-xs">
          <i className="fa-solid fa-wand-magic-sparkles mr-1 text-portal-gold" />
          Developed by Past President Leo Lion Chamal using AI
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
