import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../context/AuthContext';
import AuthLayout, { AuthError } from '../components/AuthLayout';
import { InlineSpinner }       from '../components/LoadingSpinner';

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
    <AuthLayout subtitle="The Official Member Portal of the Leo Club of Moratuwa">
      <h2 className="text-lg font-semibold text-portal-text mb-6 text-center">
        <i className="fa-solid fa-lock mr-2 text-portal-gold" />
        Member Sign In
      </h2>

      <AuthError message={authError} />

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
              <InlineSpinner size="w-4 h-4" />
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
    </AuthLayout>
  );
}

export default LoginPage;
