import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth }      from '../context/AuthContext';
import logo from '../assets/47OfficialLogo-web.png';

/**
 * Top navigation bar.
 * onMenuClick — toggles the mobile sidebar.
 */
function Navbar({ onMenuClick }) {
  const { memberData, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-14 flex-shrink-0
                       bg-portal-card border-b border-subtle">
      {/* Left — hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-portal-muted hover:text-portal-text p-1 -ml-1"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <i className="fa-solid fa-bars text-lg" />
        </button>

        <div className="flex items-center gap-2">
          <img src={logo} alt="Leo Club" className="w-7 h-7" />
          <span className="font-semibold text-sm hidden sm:block">
            <span className="text-portal-gold">Mora</span><span className="text-portal-text">Connect</span>
          </span>
        </div>
      </div>

      {/* Right — user dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5
                     hover:bg-white/[0.04] transition-colors"
        >
          {/* Name + position (hidden on mobile) */}
          <div className="text-right hidden sm:block">
            <p className="text-portal-text text-sm font-medium leading-tight">
              {memberData?.fullName}
            </p>
            <p className="text-portal-muted text-[11px] leading-tight">
              {memberData?.position || 'Member'}
            </p>
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/40
                          flex items-center justify-center flex-shrink-0
                          overflow-hidden transition-colors"
               style={{ borderColor: dropdownOpen ? 'var(--color-portal-gold, #C9A84C)' : '' }}>
            {memberData?.profilePhoto ? (
              <img
                src={memberData.profilePhoto}
                alt={memberData.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-portal-gold">
                {memberData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>

          <i className={`fa-solid fa-chevron-down text-portal-muted text-[10px] transition-transform
                         ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown panel */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-portal-card border border-subtle
                          rounded-xl shadow-2xl overflow-hidden z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-subtle">
              <p className="text-portal-text text-sm font-semibold truncate">{memberData?.fullName}</p>
              <p className="text-portal-gold text-xs mt-0.5 truncate">{memberData?.position || 'Member'}</p>
              <p className="text-portal-muted text-[11px] font-mono mt-0.5 truncate">{memberData?.memberId}</p>
            </div>

            {/* Actions */}
            <div className="py-1">
              <Link
                to="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-portal-text
                           hover:bg-portal-hover transition-colors"
              >
                <i className="fa-solid fa-user w-4 text-portal-muted text-center" />
                My Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400
                           hover:bg-red-900/20 transition-colors"
              >
                <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;

