import logo from '../assets/47OfficialLogo-web.png';

/**
 * Shared frame for the signed-out pages (Sign In, Forgot Password, Set
 * Password): background glow, club logo and title, the card, and the credit.
 */
function AuthLayout({ subtitle, children }) {
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
          <p className="text-portal-muted text-sm mt-1.5 tracking-wide">{subtitle}</p>
        </div>

        <div className="card-gold rounded-xl p-8 shadow-2xl">
          {children}
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

/** Error banner inside an AuthLayout card. Renders nothing without a message. */
export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-5 p-3 bg-red-900/30 border border-red-600/40 rounded-lg
                    text-red-400 text-sm flex items-start gap-2">
      <i className="fa-solid fa-circle-exclamation mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default AuthLayout;
