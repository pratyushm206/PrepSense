import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, clearStoredToken, getStoredToken, storeToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const currentUser = await apiRequest('/api/auth/me', { token });
        if (!cancelled) setUser(currentUser);
      } catch {
        clearStoredToken();
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(credentials) {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
    storeToken(data.token);
    setToken(data.token);

    const currentUser = await apiRequest('/api/auth/me', { token: data.token });
    setUser(currentUser);
  }

  async function register(details) {
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: details
    });
    storeToken(data.token);
    setToken(data.token);
    setUser({ id: data.id, name: data.name, email: data.email });
  }

  function logout() {
    clearStoredToken();
    setToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({
    token,
    user,
    authLoading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout
  }), [token, user, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
