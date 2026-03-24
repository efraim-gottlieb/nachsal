import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getUser());
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  async function login(email, password) {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(userData) {
    const data = await api.register(userData);
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  function logout() {
    api.clearToken();
    setToken(null);
    setUser(null);
  }

  function updateUser(newUser) {
    const updated = { ...user, ...newUser };
    api.setUser(updated);
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
