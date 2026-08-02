import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem("atheris_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("atheris_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (identifier, password, totpCode) => {
    const { data } = await api.post("/auth/login", { identifier, password, totpCode });
    localStorage.setItem("atheris_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async ({ email, username, phone, password }) => {
    const { data } = await api.post("/auth/signup", { email, username, phone, password });
    localStorage.setItem("atheris_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("atheris_token");
    setUser(null);
  };

  // Settings actions (profile, avatar, appearance, editor prefs,
  // notifications) all return the full updated user from the backend —
  // this lets any of them refresh local state without a network round trip.
  const updateUser = useCallback((nextUser) => {
    setUser((prev) => (nextUser ? { ...prev, ...nextUser } : prev));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh: loadUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
