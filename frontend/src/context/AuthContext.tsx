import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Reservation } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  activeReservation: Reservation | null;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; role?: string; organizationName?: string }) => Promise<User>;
  logout: () => void;
  setActiveReservation: (res: Reservation | null) => void;
  quickSwitchUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await api.auth.getMe();
          setUser(res.data.user);
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.auth.login({ email, password });
    const { user: authUser, token: authToken } = res.data;
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    organizationName?: string;
  }): Promise<User> => {
    const res = await api.auth.register(data);
    const { user: authUser, token: authToken } = res.data;
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(authUser);
    return authUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveReservation(null);
  };

  const quickSwitchUser = async (email: string) => {
    await login(email, 'Password123!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        activeReservation,
        login,
        register,
        logout,
        setActiveReservation,
        quickSwitchUser,
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
