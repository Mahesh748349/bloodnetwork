import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { donorService } from '../services/donorService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [donorProfile, setDonorProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('lifeflow_token'));
  const [loading, setLoading] = useState(true);

  // Initialize user from local storage or /auth/me
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('lifeflow_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success) {
            setUser(res.user);
            setDonorProfile(res.donorProfile);
          }
        } catch (err) {
          console.warn('Session expired or invalid token');
          localStorage.removeItem('lifeflow_token');
          setToken(null);
          setUser(null);
          setDonorProfile(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authService.login(credentials);
    if (res.success) {
      localStorage.setItem('lifeflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setDonorProfile(res.donorProfile);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success) {
      localStorage.setItem('lifeflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setDonorProfile(res.donorProfile);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('lifeflow_token');
    setToken(null);
    setUser(null);
    setDonorProfile(null);
  };

  const updateDonorAvailability = async (availabilityStatus) => {
    if (!user || user.role !== 'donor') return;
    const res = await donorService.updateAvailability(availabilityStatus);
    if (res.success) {
      setDonorProfile((prev) => ({
        ...prev,
        availabilityStatus: res.availabilityStatus,
        lastAvailabilityUpdate: res.lastAvailabilityUpdate,
      }));
    }
    return res;
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await authService.getMe();
      if (res.success) {
        setUser(res.user);
        setDonorProfile(res.donorProfile);
      }
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        donorProfile,
        token,
        loading,
        login,
        register,
        logout,
        updateDonorAvailability,
        refreshProfile,
        isAuthenticated: !!user,
        isDonor: user?.role === 'donor',
        isRequester: user?.role === 'requester',
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
