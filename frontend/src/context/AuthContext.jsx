import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { attachUserToken, userApi } from '../api/client.js';

const AuthContext = createContext(null);

const STORAGE_KEY = 'pc_user_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);

  useEffect(() => {
    attachUserToken(userApi, token);
    if (token) {
      localStorage.setItem(STORAGE_KEY, token);
      userApi
        .get('/auth/me')
        .then((res) => setUser(res.data.user))
        .catch(() => {
          setToken(null);
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        });
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      setToken,
      setUser,
      logout() {
        setToken(null);
        setUser(null);
      },
      isAuthenticated: Boolean(token && user),
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
