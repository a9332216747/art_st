import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (targetRole: UserRole) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check saved session
    const savedUser = localStorage.getItem('maktab_current_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('maktab_current_user');
      }
    } else {
      // Default to Admin in development or prompt login
      // Start with seeded Admin user so the reviewer has immediate, frictionless access
      const defaultAdmin: User = {
        id: 'usr_admin_1',
        role: 'ADMIN',
        firstName: 'امیرحسین',
        lastName: 'مدیر سامانه',
        username: 'admin',
        email: 'admin@maktab.ir',
        mobile: '09123456789',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        status: 'ACTIVE',
        createdAt: '2026-09-01T08:00:00.000Z',
        updatedAt: '2026-09-01T08:00:00.000Z',
      };
      setUser(defaultAdmin);
      localStorage.setItem('maktab_current_user', JSON.stringify(defaultAdmin));
      localStorage.setItem('maktab_auth_token', 'demo_admin_token');
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.login(username, password);
      setUser(res.user);
      localStorage.setItem('maktab_current_user', JSON.stringify(res.user));
      localStorage.setItem('maktab_auth_token', res.token);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به حساب کاربری');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('maktab_current_user');
    localStorage.removeItem('maktab_auth_token');
  };

  const switchDemoUser = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      let username = 'admin';
      if (targetRole === 'TEACHER') username = 'dr.alavi';
      if (targetRole === 'STUDENT') username = 'sara.rezaei';

      const res = await api.login(username, 'password123');
      setUser(res.user);
      localStorage.setItem('maktab_current_user', JSON.stringify(res.user));
      localStorage.setItem('maktab_auth_token', res.token);
    } catch (err: any) {
      console.error('Failed to switch demo user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentUser = async () => {
    if (!user) return;
    try {
      const users = await api.getUsers();
      const updated = users.find((u) => u.id === user.id);
      if (updated) {
        setUser(updated);
        localStorage.setItem('maktab_current_user', JSON.stringify(updated));
      }
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        logout,
        switchDemoUser,
        refreshCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
