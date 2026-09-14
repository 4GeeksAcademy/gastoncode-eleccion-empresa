'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearToken,
  fetchMe,
  getToken,
  login as loginRequest,
  setToken,
  type AuthUser,
} from './auth-api';

interface AuthContextValue {
  user: AuthUser | null;
  /** `true` mientras se resuelve la sesión inicial desde el token guardado. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    const resolveSession = async (): Promise<AuthUser | null> => {
      if (!getToken()) return null;
      try {
        return await fetchMe();
      } catch {
        clearToken();
        return null;
      }
    };

    resolveSession().then((me) => {
      if (!active) return;
      setUser(me);
      setInitializing(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginRequest(email, password);
    setToken(token);
    try {
      setUser(await fetchMe());
    } catch (err) {
      clearToken();
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, logout }),
    [user, initializing, login, logout]
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
