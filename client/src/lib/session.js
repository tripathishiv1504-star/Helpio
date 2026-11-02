import { useState, useEffect } from 'react';

const TOKEN_KEY = 'helpio_token';
const USER_KEY = 'helpio_user';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
    window.dispatchEvent(new Event('helpio_auth_change'));
  } catch (e) {
    console.error('Failed to set session in storage:', e);
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('helpio_auth_change'));
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

export function useSession() {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUserState] = useState(() => getUser());

  useEffect(() => {
    function handleStorageChange() {
      setTokenState(getToken());
      setUserState(getUser());
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('helpio_auth_change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('helpio_auth_change', handleStorageChange);
    };
  }, []);

  const login = (newToken, newUser) => {
    setSession(newToken, newUser);
  };

  const logout = () => {
    clearSession();
  };

  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  return {
    token,
    user,
    isLoggedIn: Boolean(token && user),
    hasRole,
    login,
    logout,
  };
}

export default useSession;
