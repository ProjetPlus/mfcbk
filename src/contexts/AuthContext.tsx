import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { DbUser } from "@/db/database";
import { getOfflineSession } from "@/lib/offline";

interface AuthContextType {
  user: DbUser | null;
  login: (user: DbUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

const STORAGE_KEY = "campbethel_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  // Restore session from localStorage on mount (survives PWA restart / offline)
  useEffect(() => {
    if (!user) {
      const offline = getOfflineSession();
      if (offline) setUser(offline);
    }
  }, []);

  const login = (u: DbUser) => {
    setUser(u);
    const json = JSON.stringify(u);
    sessionStorage.setItem(STORAGE_KEY, json);
    localStorage.setItem(STORAGE_KEY, json); // persist for offline PWA
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
