import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api.js';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const fetchUser = async () => {
    try {
      const data = await authApi.getMe();
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  useEffect(() => {
    if (!user && localStorage.getItem('token')) fetchUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authApi.signin({ email, password });
      if (data?.token && data?.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: 'Invalid response' };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Login failed';
      return { success: false, message };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await authApi.signup({ name, email, password });
      if (data?.token && data?.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: 'Invalid response' };
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Registration failed';
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
