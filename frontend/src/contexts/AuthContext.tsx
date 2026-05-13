import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, logout as logoutApi } from '@/services/authService';
import { queryClient } from '@/utils/queryClient';
import type { User } from '@/types';
export type { User };

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User, refresh?: string) => void;
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

  const login = (token: string, userData: User, refresh?: string) => {
    localStorage.setItem('token', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);
    setUser(userData);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    // Thu hồi refresh token phía server (non-blocking)
    if (refreshToken) {
      logoutApi().catch(() => {});
    }

    // 1. Xóa thông tin xác thực trong localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    // 2. Xóa sạch cache của TanStack Query để tránh lộ dữ liệu người dùng cũ
    queryClient.clear();

    // 3. Chuyển hướng về trang login và buộc tải lại trang
    // Việc này sẽ xóa sạch toàn bộ State trong React
    window.location.href = '/login';
  };

  const updateUser = (updates: Partial<User>) => {
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
