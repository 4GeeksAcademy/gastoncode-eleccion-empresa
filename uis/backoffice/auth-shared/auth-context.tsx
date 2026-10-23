"use client";

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
import { loginDestination } from "./auth-navigation";

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
  const [session, setSession] = useState<{ token: string; user: AuthUser } | null>(null);
  const user = session?.token === getToken() ? session.user : null;
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const endSession = useCallback((preserveDestination: boolean) => {
    generation.current++;
    setSession(null);
    setError(null);
    // Evita que el guard compita con la redireccion que ya esta en curso.
    setInitializing(true);
    window.location.replace(
      preserveDestination ? loginDestination(window.location.pathname) : "/login",
    );
  }, []);

  const resolveSession = useCallback(() => {
    const currentGeneration = ++generation.current;
    return Promise.resolve()
      .then(async () => {
        const token = getToken();
        return { token, me: token ? await fetchMe() : null };
      })
      .then((session) => {
        if (currentGeneration === generation.current && session.token === getToken()) {
          setSession(session.token && session.me ? { token: session.token, user: session.me } : null);
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
    setSession(null);
    setInitializing(true);
    setError(null);
    await resolveSession();
  }, [resolveSession]);

  useEffect(() => {
    const sessionGeneration = generation;

    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== TOKEN_KEY && event.key !== null) return;
      if (!getToken()) endSession(false);
      else void refreshSession();
    }

    function handleInvalidation() {
      endSession(true);
    }

    window.addEventListener(SESSION_INVALIDATED_EVENT, handleInvalidation);
    window.addEventListener("storage", handleStorage);
    void resolveSession();

    return () => {
      sessionGeneration.current++;
      window.removeEventListener(SESSION_INVALIDATED_EVENT, handleInvalidation);
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
      setSession(null);
      setInitializing(true);
      const me = await fetchMe();
      if (currentGeneration !== generation.current || token !== getToken()) {
        throw new Error("Inicio de sesion cancelado.");
      }
      setSession({ token, user: me });
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
      endSession(false);
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