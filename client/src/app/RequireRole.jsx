import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useSession from '../lib/session.js';

export function RequireRole({ roles = [], children }) {
  const { isLoggedIn, user, hasRole } = useSession();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0) {
    const hasRequiredRole = roles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-500 max-w-md mb-6">
            You do not have permission to access this area. Your account lacks the required role (
            {roles.join(', ')}).
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Return to Home
          </a>
        </div>
      );
    }
  }

  return children;
}

export default RequireRole;
