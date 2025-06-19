import React, { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signup = (email, password) => supabase.auth.signUp({ email, password });
  const logout = () => supabase.auth.signOut();
  const signInWithProvider = (provider) => supabase.auth.signInWithOAuth({ provider });

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, signInWithProvider }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 