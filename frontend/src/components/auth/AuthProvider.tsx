"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "@/services/auth-api";
import { SESSION_EXPIRED_EVENT } from "@/services/api-client";
import { clearAccessToken, storeAccessToken } from "@/services/token-storage";
import type { AuthUser, RegisterPayload } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (identifier: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const acceptSession = useCallback((accessToken: string, nextUser: AuthUser) => {
    storeAccessToken(accessToken);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const currentUser = await authApi.me();
        if (active) {
          setUser(currentUser);
          setStatus("authenticated");
        }
      } catch {
        clearAccessToken();
        if (active) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function handleExpiredSession() {
      setUser(null);
      setStatus("unauthenticated");
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpiredSession);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const session = await authApi.login(identifier, password);
    acceptSession(session.accessToken, session.user);
  }, [acceptSession]);

  const register = useCallback(async (payload: RegisterPayload) => {
    await authApi.register(payload);
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const session = await authApi.google(credential);
    acceptSession(session.accessToken, session.user);
  }, [acceptSession]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    clearAccessToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(() => ({ user, status, login, register, googleLogin, logout }), [user, status, login, register, googleLogin, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
