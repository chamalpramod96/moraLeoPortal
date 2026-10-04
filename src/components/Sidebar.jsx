import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/47OfficialLogo-web.png';

const NAV_LINKS = [
  { to: '/dashboard',           label: 'Dashboard',     icon: 'fa-gauge-high'    },
  { to: '/profile',             label: 'My Profile',    icon: 'fa-user'          },
  { to: '/events',              label: 'Events',        icon: 'fa-calendar-days' },
  { to: '/points',              label: 'Points Table',  icon: 'fa-trophy'        },
  { to: '/orientation',         label: 'Orientation Program', icon: 'fa-book-open' },
];

const ADMIN_LINKS = [
  { to: '/admin/members',       label: 'Members',       icon: 'fa-users'         },
  { to: '/admin/events',        label: 'Manage Events', icon: 'fa-calendar-plus' },
  { to: '/admin/leaderboard',   label: 'Leaderboard',   icon: 'fa-ranking-star'  },
];

function NavItem({ to, label, icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
         ${isActive
           ? 'bg-portal-red/20 text-portal-gold border border-portal-red/30'
           : 'text-portal-muted hover:bg-portal-hover hover:text-portal-text'
         }`
      }
    >
      <i className={`fa-solid ${icon} w-4 text-center`} />
      {label}
    </NavLink>
  );
}

/**
 * Sidebar — always visible on desktop (md+), slide-in drawer on mobile.
 */
function Sidebar({ isOpen, onClose }) {
  const { memberData, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-portal-card border-r border-subtle
                    z-50 flex flex-col transform transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0 md:flex md:flex-shrink-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-subtle flex-shrink-0">
          <img src={logo} alt="Leo Club" className="w-10 h-10" />
          <div>
            <p className="font-bold text-sm leading-tight">
              <span className="text-portal-gold">Mora</span><span className="text-portal-text">Connect</span>
            </p>
            <p className="text-portal-muted text-[10px]">Leo Club of Moratuwa</p>
          </div>
          {/* Close button (mobile) */}
          <button
            className="ml-auto text-portal-muted hover:text-portal-text md:hidden"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_LINKS.map(link => (
            <NavItem key={link.to} {...link} onClick={onClose} />
          ))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-1">
                <p className="text-[10px] font-semibold text-portal-muted/60 uppercase tracking-widest">
                  Administration
                </p>
              </div>
              {ADMIN_LINKS.map(link => (
                <NavItem key={link.to} {...link} onClick={onClose} />
              ))}
            </>
          )}
        </nav>

        {/* Member info + sign-out */}
        <div className="px-3 py-4 border-t border-subtle flex-shrink-0">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-portal-red/20 border border-portal-gold/40
                            flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-portal-gold">
                {memberData?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-portal-text text-xs font-medium truncate">{memberData?.fullName}</p>
              <p className="text-portal-muted text-[10px] truncate">{memberData?.position || 'Member'}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm
                       text-portal-muted hover:bg-red-900/20 hover:text-red-400 transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-4 text-center" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
