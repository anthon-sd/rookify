import React, { createContext, useContext, useEffect, useState } from 'react';
import backendApi from '../services/backendApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated with backend
    if (backendApi.isAuthenticated()) {
      setUser(backendApi.user);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Starting login process...');
      const result = await backendApi.loginUser(email, password);
      console.log('✅ AuthContext: Backend login successful, updating user state');
      console.log('User data:', result.user);
      
      setUser(result.user);
      console.log('✅ AuthContext: User state updated');
      
      return { data: { user: result.user }, error: null };
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      return { data: null, error: { message: error.message } };
    }
  };

  const signup = async (email, password) => {
    try {
      await backendApi.registerUser({
        email,
        username: email.split('@')[0],
        password,
        rating: 1500,
        playstyle: 'balanced',
        rating_progress: []
      });
      
      // Auto-login after registration
      const result = await backendApi.loginUser(email, password);
      setUser(result.user);
      return { data: { user: result.user }, error: null };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };

  const logout = async () => {
    backendApi.logout();
    setUser(null);
    return { error: null };
  };

  const signInWithProvider = async (provider) => {
    // OAuth not implemented with backend auth
    return { data: null, error: { message: 'OAuth not available' } };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, signInWithProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 