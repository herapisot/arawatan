import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  student_id: string;
  campus: string;
  user_type: string;
  is_verified: boolean;
  verification_status: string;
  tier: string;
  points: number;
  role: string;
  avatar_url: string | null;
  items_shared: number;
  items_received: number;
  badges?: Array<{ id: number; name: string; icon: string; description: string }>;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  student_id: string;
  campus: string;
  user_type: string;
  password: string;
  password_confirmation: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getUser();
      setUser(response.data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token, refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { user: userData, token: authToken } = response.data;
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (data: RegisterData) => {
    const response = await authApi.register(data);
    const { user: userData, token: authToken } = response.data;
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('auth_token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isVerified: !!user?.is_verified,
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
