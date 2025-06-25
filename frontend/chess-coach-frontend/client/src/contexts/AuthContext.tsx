import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { backendApi } from "../api/api";

interface User {
  id: string
  email: string
  username: string
  rating: number
  playstyle: string
}

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting login process...');
      const result = await backendApi.loginUser(email, password);
      console.log('✅ AuthContext: Backend login successful, updating user state');
      console.log('User data:', result.user);
      
      setUser(result.user);
      console.log('✅ AuthContext: User state updated');
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error);
      throw new Error(error.message);
    }
  };

  const register = async (email: string, password: string) => {
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
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = () => {
    backendApi.logout();
    setUser(null);
  };

  const isAuthenticated = !!user && backendApi.isAuthenticated();

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated, 
      login, 
      register, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
