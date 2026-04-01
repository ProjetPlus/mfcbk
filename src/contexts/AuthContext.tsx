import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { DbUser } from "@/db/database";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DbUser | null>(() => {
    const stored = sessionStorage.getItem("campbethel_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = (u: DbUser) => {
    setUser(u);
    sessionStorage.setItem("campbethel_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("campbethel_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
