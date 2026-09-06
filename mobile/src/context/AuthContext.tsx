import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types/auth';
import { authApi } from '../services/api';
import { storage } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);

        // Background refresh from backend
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            await storage.saveUser(res.user);
          }
        } catch {
          // Keep stored user on offline/network glitch
        }
      }
    } catch {
      await storage.clearAll();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await storage.saveToken(res.token);
        await storage.saveUser(res.user);
      } else {
        throw new Error(res.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        await storage.saveToken(res.token);
        await storage.saveUser(res.user);
      } else {
        throw new Error(res.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setUser(null);
    setToken(null);
    await storage.clearAll();
  };

  const refreshUser = async (): Promise<void> => {
    if (!token) return;
    try {
      const res = await authApi.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        await storage.saveUser(res.user);
      }
    } catch {
      // Ignore refresh error
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
