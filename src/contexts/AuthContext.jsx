import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as authLogin, register as authRegister, logout as authLogout, getSession } from '../lib/auth';
import { queryClient } from '../lib/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    const session = await getSession();
    setUser(session?.data ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    await authLogin(email, password);
    await checkSession();
  }, [checkSession]);

  const register = useCallback(async (name, email, password) => {
    await authRegister(name, email, password);
    await checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    await authLogout();
    queryClient.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
