import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../context/AuthContext';
import logo from '../assets/47n.png';
const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
function LoginPage() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const { signIn, authError, setAuthError, currentUser } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) navigate('/dashboard', { replace: true });
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // Error message already set in AuthContext.signIn
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-portal-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
            The Official Member Portal of the Leo Club of Moratuwa
          </p>
        </div>

        {/* Login card */}
        <div className="card-gold rounded-xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-portal-text mb-6 text-center">
            <i className="fa-solid fa-lock mr-2 text-portal-gold" />
            Member Sign In
          </h2>

          {/* Error banner */}
          {authError && (
            <div className="mb-5 p-3 bg-red-900/30 border border-red-600/40 rounded-lg
                            text-red-400 text-sm flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Demo credentials panel */}
          {IS_DEMO && (
            <div className="mb-5 p-4 bg-portal-gold/8 border border-portal-gold/30 rounded-lg">
              <p className="text-portal-gold text-xs font-semibold mb-3 flex items-center gap-2">
                <i className="fa-solid fa-flask-vial" />
                Demo Mode — click an account to fill in credentials
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword('demo1234'); setAuthError(null); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                               bg-portal-bg border border-white/5 hover:border-portal-gold/30
                               transition-colors text-left group"
                  >
                    <span>
                      <span className="text-portal-gold text-xs font-medium block">{acc.email}</span>
                      <span className="text-portal-muted text-xs">{acc.label}</span>
                    </span>
                    <span className="text-portal-muted text-xs font-mono group-hover:text-portal-gold transition-colors">
                      demo1234
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
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
                  onChange={e => { setEmail(e.target.value); setAuthError(null); }}
                  className="w-full bg-portal-bg border border-white/5 rounded-lg
                             pl-9 pr-4 py-2.5 text-portal-text placeholder-portal-muted/40
                             focus:outline-none focus:border-portal-gold/50 transition-colors text-sm"
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-portal-muted mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2
                               text-portal-muted/60 text-sm pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setAuthError(null); }}
                  className="w-full bg-portal-bg border border-white/5 rounded-lg
                             pl-9 pr-10 py-2.5 text-portal-text placeholder-portal-muted/40
                             focus:outline-none focus:border-portal-gold/50 transition-colors text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-portal-muted hover:text-portal-text transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-portal-red hover:bg-portal-red-dark disabled:opacity-40
                         disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg
                         transition-colors mt-2 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket" />
                  Sign In
                </>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-portal-gold hover:text-portal-gold/80 text-xs transition-colors"
              >
                <i className="fa-solid fa-key mr-1" />
                Forgot your password?
              </button>
            </div>
          </form>
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

export default LoginPage;
