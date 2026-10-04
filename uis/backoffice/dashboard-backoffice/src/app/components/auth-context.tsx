"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearToken,
  fetchMe,
  getToken,
  login as loginRequest,
  SESSION_INVALIDATED_EVENT,
  setToken,
  TOKEN_KEY,
  UnauthorizedError,
  type AuthUser,
} from "./auth-api";

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo validar la sesion.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const endSession = useCallback(() => {
    generation.current++;
    setUser(null);
    setError(null);
    setInitializing(false);
    router.replace("/login");
  }, [router]);

  const resolveSession = useCallback(() => {
    const currentGeneration = ++generation.current;
    return Promise.resolve()
      .then(async () => {
        const token = getToken();
        return { token, me: token ? await fetchMe() : null };
      })
      .then((session) => {
        if (currentGeneration === generation.current && session.token === getToken()) {
          setUser(session.me);
        }
      })
      .catch((failure: unknown) => {
        if (currentGeneration === generation.current && !(failure instanceof UnauthorizedError)) {
          setError(messageOf(failure));
        }
      })
      .finally(() => {
        if (currentGeneration === generation.current) setInitializing(false);
      });
  }, []);

  const refreshSession = useCallback(async () => {
    setInitializing(true);
    setError(null);
    await resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    const sessionGeneration = generation;

    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== TOKEN_KEY && event.key !== null) return;
      if (!getToken()) endSession();
      else void refreshSession();
    }

    window.addEventListener(SESSION_INVALIDATED_EVENT, endSession);
    window.addEventListener("storage", handleStorage);
    void resolveSession();

    return () => {
      sessionGeneration.current++;
      window.removeEventListener(SESSION_INVALIDATED_EVENT, endSession);
      window.removeEventListener("storage", handleStorage);
    };
  }, [endSession, refreshSession, resolveSession]);

  const login = useCallback(async (email: string, password: string) => {
    const currentGeneration = ++generation.current;
    setError(null);
    try {
      const token = await loginRequest(email, password);
      if (currentGeneration !== generation.current) throw new Error("Inicio de sesion cancelado.");
      setToken(token);
      setUser(null);
      setInitializing(true);
      const me = await fetchMe();
      if (currentGeneration !== generation.current || token !== getToken()) {
        throw new Error("Inicio de sesion cancelado.");
      }
      setUser(me);
    } catch (failure) {
      if (currentGeneration === generation.current && !(failure instanceof UnauthorizedError)) {
        setError(messageOf(failure));
      }
      throw failure;
    } finally {
      if (currentGeneration === generation.current) setInitializing(false);
    }
  }, []);

  const logout = useCallback(() => {
    try {
      clearToken();
    } finally {
      endSession();
    }
  }, [endSession]);

  return (
    <AuthContext value={{ user, initializing, error, login, logout, refreshSession }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}