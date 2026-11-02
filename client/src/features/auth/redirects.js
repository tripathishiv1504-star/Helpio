import { ROLES } from '@shared/constants.js';

export function getPostLoginRedirect(user) {
  if (!user || !user.roles) {
    return '/';
  }

  // Admin takes top precedence
  if (user.roles.includes(ROLES.ADMIN)) {
    return '/admin';
  }

  // Helper-only role intent (or user with only helper role)
  if (user.roles.includes(ROLES.HELPER) && !user.roles.includes(ROLES.USER)) {
    return '/helper';
  }

  // If user has both roles or user role, default to /dashboard
  return '/dashboard';
}

export default getPostLoginRedirect;
