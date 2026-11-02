import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import useSession from '../lib/session.js';

// Auto-discover routes for nav metadata
const routeModules = import.meta.glob('../features/*/routes.jsx', { eager: true });

// Auto-discover nav widgets
const widgetModules = import.meta.glob('../features/*/navWidget.jsx', { eager: true });

export function AppLayout() {
  const { isLoggedIn, user, logout } = useSession();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extract navigation items from route modules
  const navItems = [];
  for (const path in routeModules) {
    const exported = routeModules[path].default || routeModules[path].routes || [];
    const routeList = Array.isArray(exported) ? exported : [exported];
    for (const r of routeList) {
      if (r && r.nav) {
        // Check if user has required roles for this nav item
        const requiredRoles = r.roles || [];
        const matchesRole =
          requiredRoles.length === 0 ||
          (user && user.roles && requiredRoles.some((role) => user.roles.includes(role)));

        if (matchesRole) {
          navItems.push({
            path: r.path,
            label: typeof r.nav === 'string' ? r.nav : r.nav.label || r.path,
            order: typeof r.nav === 'object' && r.nav.order !== undefined ? r.nav.order : 10,
            icon: typeof r.nav === 'object' ? r.nav.icon : null,
          });
        }
      }
    }
  }

  // Sort nav items by order
  navItems.sort((a, b) => a.order - b.order);

  // Extract nav widgets
  const NavWidgets = Object.values(widgetModules)
    .map((mod) => mod.default)
    .filter(Boolean);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 group">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white text-lg shadow-sm group-hover:scale-105 transition-transform">
                  📍
                </span>
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Help<span className="text-primary-600">io</span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    {item.icon && <span>{item.icon}</span>}
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Right side items */}
            <div className="flex items-center gap-3">
              {/* Auto-mounted Nav Widgets */}
              <div className="flex items-center gap-2">
                {NavWidgets.map((Widget, idx) => (
                  <Widget key={idx} />
                ))}
              </div>

              {/* User profile / Auth buttons */}
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs uppercase">
                      {user?.name?.[0] || 'U'}
                    </span>
                    <span className="hidden sm:inline-block max-w-[120px] truncate">
                      {user?.name || 'My Profile'}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="text-xs text-slate-500 hover:text-rose-600 font-medium px-2 py-1 rounded transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-2 rounded-lg transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {!isLoggedIn && (
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 rounded-lg border border-slate-300"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-white bg-primary-600 rounded-lg shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
