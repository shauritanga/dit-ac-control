import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, fetchMe, loginRequest } from '../api/client';
import type { AuthUser } from '../api/types';

const TOKEN_KEY = 'dit-ac-mobile-token';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchMe(token);
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await logout();
      }
    }
  }, [token, logout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(TOKEN_KEY);
        if (cancelled) return;
        if (!stored) {
          setBootstrapping(false);
          return;
        }
        try {
          const me = await fetchMe(stored);
          if (cancelled) return;
          setToken(stored);
          setUser(me);
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      } catch {
        // SecureStore unavailable (e.g. web preview) — start logged out
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    if (!result.accessToken) {
      throw new Error('Login response did not include an access token.');
    }
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    } catch {
      // still allow in-memory session if store fails
    }
    setToken(result.accessToken);
    if (result.user) {
      setUser(result.user);
    } else {
      try {
        setUser(await fetchMe(result.accessToken));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({ token, user, bootstrapping, login, logout, refreshUser }),
    [token, user, bootstrapping, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
