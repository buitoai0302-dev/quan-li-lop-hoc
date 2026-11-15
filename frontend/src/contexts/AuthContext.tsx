/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as logoutApi } from '@/features/auth';
import { queryClient } from '@/utils/queryClient';
import type { User } from '@/types';
import { resetApiScope } from '@/api';
export type { User };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await getCurrentUser();
          setUser(data);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Access token lưu localStorage (ngắn hạn, ~15 phút)
  // Refresh token nằm trong httpOnly cookie — không cần lưu thủ công
  const login = (token: string, userData: User) => {
    resetApiScope();
    void queryClient.cancelQueries();
    queryClient.clear();
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    resetApiScope();
    void queryClient.cancelQueries();
    // Thu hồi refresh token phía server (xoá khỏi DB + xoá cookie)
    logoutApi().catch(() => {});

    // Xoá access token
    localStorage.removeItem('token');

    // Xoá sạch cache TanStack Query
    queryClient.clear();

    // Reload về trang login
    window.location.href = '/login';
  };

  const updateUser = (updates: Partial<User>) => {
    if (
      (updates.id && updates.id !== user?.id) ||
      (updates.tenant_id && updates.tenant_id !== user?.tenant_id)
    ) {
      resetApiScope();
      void queryClient.cancelQueries();
      queryClient.clear();
    }
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
