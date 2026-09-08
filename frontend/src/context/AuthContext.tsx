import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, LoginCredentials, RegisterData, getRoleDashboardPath as getRoleDashboardPathHelper } from '../types/auth';
import { loginApi, registerApi, getMeApi } from '../services/api';

const VALID_ROLES: UserRole[] = ['FARMER', 'SHOP_OWNER', 'AGRI_PARTNER', 'DELIVERY_BOY', 'ADMIN', 'MARKET_OWNER'];

const isValidRole = (r: unknown): r is UserRole => {
  return typeof r === 'string' && VALID_ROLES.includes(r.trim().toUpperCase() as UserRole);
};

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
    try {
      const cachedUser = localStorage.getItem('agrimart_user');
      if (!cachedUser) return null;
      const parsed = JSON.parse(cachedUser);
      if (parsed && (parsed.id || parsed._id) && isValidRole(parsed.role)) {
        return parsed;
      }
      localStorage.removeItem('agrimart_user');
      localStorage.removeItem('agrimart_token');
      return null;
    } catch {
      localStorage.removeItem('agrimart_user');
      localStorage.removeItem('agrimart_token');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('agrimart_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const getRoleDashboardPath = (role?: string): string => {
    const targetRole = role || user?.role;
    return getRoleDashboardPathHelper(targetRole);
  };

  // Check and sync user state with backend on mount
  useEffect(() => {
    const syncAuth = async () => {
      const storedToken = localStorage.getItem('agrimart_token');
      if (storedToken) {
        try {
          const data: any = await getMeApi();
          const rawUser = data.user || data.data?.user || data.data;
          if (rawUser && (rawUser.id || rawUser._id) && isValidRole(rawUser.role)) {
            const normalizedRole = rawUser.role.toString().trim().toUpperCase() as UserRole;
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
          } else {
            // Invalid user object or missing role from backend -> clear session
            logout();
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
    // Explicitly purge any stale authentication state and tokens before login attempt
    setToken(null);
    setUser(null);
    localStorage.removeItem('agrimart_token');
    localStorage.removeItem('agrimart_user');

    try {
      const response: any = await loginApi(credentials);
      const rawUser = response.user || response.data?.user || response.data || response;
      const rawToken = response.token || response.data?.token || '';

      if (!rawUser || !isValidRole(rawUser.role)) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('agrimart_token');
        localStorage.removeItem('agrimart_user');
        throw new Error('Invalid account role received from server.');
      }

      const normalizedRole = rawUser.role.toString().trim().toUpperCase() as UserRole;

      // Strict role verification against selected portal
      if (credentials.role) {
        const expectedRole = credentials.role.toString().trim().toUpperCase() as UserRole;
        if (normalizedRole !== expectedRole) {
          setToken(null);
          setUser(null);
          localStorage.removeItem('agrimart_token');
          localStorage.removeItem('agrimart_user');
          throw new Error('These credentials are not registered for the selected portal. Please select the correct portal or use the correct account.');
        }
      }

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
    } catch (err) {
      // Ensure failed login never leaves stale session
      setToken(null);
      setUser(null);
      localStorage.removeItem('agrimart_token');
      localStorage.removeItem('agrimart_user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<User> => {
    setIsLoading(true);
    // Explicitly purge any stale authentication state and tokens before register attempt
    setToken(null);
    setUser(null);
    localStorage.removeItem('agrimart_token');
    localStorage.removeItem('agrimart_user');

    try {
      const response: any = await registerApi(data);
      const rawUser = response.user || response.data?.user || response.data || response;
      const rawToken = response.token || response.data?.token || '';

      const returnedRole = rawUser?.role || data.role;
      if (!returnedRole || !isValidRole(returnedRole)) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('agrimart_token');
        localStorage.removeItem('agrimart_user');
        throw new Error('Invalid account role during registration.');
      }

      const normalizedRole = returnedRole.toString().trim().toUpperCase() as UserRole;
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
    } catch (err) {
      setToken(null);
      setUser(null);
      localStorage.removeItem('agrimart_token');
      localStorage.removeItem('agrimart_user');
      throw err;
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
