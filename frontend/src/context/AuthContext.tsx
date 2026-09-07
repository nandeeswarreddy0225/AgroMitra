import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterData, getRoleDashboardPath as getRoleDashboardPathHelper } from '../types/auth';
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
    return getRoleDashboardPathHelper(role || user?.role);
  };

  // Check and sync user state with backend on mount
  useEffect(() => {
    const syncAuth = async () => {
      const storedToken = localStorage.getItem('agrimart_token');
      if (storedToken) {
        try {
          const data: any = await getMeApi();
          const rawUser = data.user || data.data?.user || data.data;
          if (rawUser && (rawUser.id || rawUser._id || rawUser.role)) {
            const normalizedRole = (rawUser.role || 'FARMER').toString().trim().toUpperCase() as import('../types/auth').UserRole;
            const syncedUser: User = {
              id: rawUser.id || rawUser._id || '',
              name: rawUser.name || '',
              email: rawUser.email || '',
              phone: rawUser.phone || '',
              role: normalizedRole,
              address: rawUser.address,
              shopName: rawUser.shopName,
              upiId: rawUser.upiId,
              qrCodeUrl: rawUser.qrCodeUrl,
              createdAt: rawUser.createdAt,
              updatedAt: rawUser.updatedAt,
            };
            setUser(syncedUser);
            localStorage.setItem('agrimart_user', JSON.stringify(syncedUser));
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
      const response: any = await loginApi(credentials);
      const rawUser = response.user || response.data?.user || response.data || response;
      const rawToken = response.token || response.data?.token || '';

      const normalizedRole = (rawUser.role || 'FARMER').toString().trim().toUpperCase() as import('../types/auth').UserRole;
      const userObj: User = {
        id: rawUser.id || rawUser._id || '',
        name: rawUser.name || '',
        email: rawUser.email || '',
        phone: rawUser.phone || '',
        role: normalizedRole,
        address: rawUser.address,
        shopName: rawUser.shopName,
        upiId: rawUser.upiId,
        qrCodeUrl: rawUser.qrCodeUrl,
        createdAt: rawUser.createdAt,
        updatedAt: rawUser.updatedAt,
      };

      setToken(rawToken);
      setUser(userObj);
      if (rawToken) {
        localStorage.setItem('agrimart_token', rawToken);
      }
      localStorage.setItem('agrimart_user', JSON.stringify(userObj));
      return userObj;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<User> => {
    setIsLoading(true);
    try {
      const response: any = await registerApi(data);
      const rawUser = response.user || response.data?.user || response.data || response;
      const rawToken = response.token || response.data?.token || '';

      const normalizedRole = (rawUser.role || data.role || 'FARMER').toString().trim().toUpperCase() as import('../types/auth').UserRole;
      const userObj: User = {
        id: rawUser.id || rawUser._id || '',
        name: rawUser.name || data.name || '',
        email: rawUser.email || data.email || '',
        phone: rawUser.phone || data.phone || '',
        role: normalizedRole,
        address: rawUser.address || data.address,
        shopName: rawUser.shopName,
        upiId: rawUser.upiId,
        qrCodeUrl: rawUser.qrCodeUrl,
        createdAt: rawUser.createdAt,
        updatedAt: rawUser.updatedAt,
      };

      setToken(rawToken);
      setUser(userObj);
      if (rawToken) {
        localStorage.setItem('agrimart_token', rawToken);
      }
      localStorage.setItem('agrimart_user', JSON.stringify(userObj));
      return userObj;
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
