import { useState }  from 'react';
import { Outlet }    from 'react-router-dom';
import Navbar        from './Navbar';
import Sidebar       from './Sidebar';

/**
 * Shell layout — wraps all authenticated pages.
 * Renders <Outlet /> for nested routes.
 */
function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-portal-gold overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(s => !s)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
