import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData } from '../types/auth';
import { loginApi, registerApi, getMeApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  updateUser: (updatedUser: User) => void;
  logout: () => void;
  getRoleDashboardPath: (role?: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cachedUser = localStorage.getItem('agrimart_user');
    return cachedUser ? JSON.parse(cachedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('agrimart_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getRoleDashboardPath = (role?: string): string => {
    const targetRole = role || user?.role;
    switch (targetRole) {
      case 'FARMER':
        return '/dashboard';
      case 'SHOP_OWNER':
        return '/shop-owner/dashboard';
      case 'DELIVERY_BOY':
        return '/delivery/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  // Check and sync user state with backend on mount
  useEffect(() => {
    const syncAuth = async () => {
      const storedToken = localStorage.getItem('agrimart_token');
      if (storedToken) {
        try {
          const data = await getMeApi();
          if (data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('agrimart_user', JSON.stringify(data.user));
          }
        } catch (err: any) {
          // Only log out if backend explicitly rejected the token with 401 Unauthorized
          if (err?.response?.status === 401) {
            logout();
          } else {
            console.warn('[AuthContext] Transient network/server error while syncing user state, preserving session.');
          }
        }
      }
      setIsLoading(false);
    };

    syncAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await loginApi(credentials);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('agrimart_token', response.token);
      localStorage.setItem('agrimart_user', JSON.stringify(response.user));
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await registerApi(data);
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('agrimart_token', response.token);
      localStorage.setItem('agrimart_user', JSON.stringify(response.user));
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('agrimart_user', JSON.stringify(updatedUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('agrimart_token');
    localStorage.removeItem('agrimart_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        updateUser,
        logout,
        getRoleDashboardPath,
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
