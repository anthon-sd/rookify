import React, { createContext, useContext, useEffect, useState } from 'react'
import { backendApi } from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  rating: number
  playstyle: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ data: any; error: any }>
  signup: (email: string, password: string) => Promise<{ data: any; error: any }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated with backend
    if (backendApi.isAuthenticated()) {
      setUser(backendApi.user)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Starting login process...')
      const result = await backendApi.loginUser(email, password)
      console.log('✅ AuthContext: Backend login successful, updating user state')
      console.log('User data:', result.user)
      
      setUser(result.user)
      console.log('✅ AuthContext: User state updated')
      
      return { data: { user: result.user }, error: null }
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error)
      return { data: null, error: { message: error.message } }
    }
  }

  const signup = async (email: string, password: string) => {
    try {
      await backendApi.registerUser({
        email,
        username: email.split('@')[0],
        password,
        rating: 1500,
        playstyle: 'balanced',
        rating_progress: []
      })
      
      // Auto-login after registration
      const result = await backendApi.loginUser(email, password)
      setUser(result.user)
      return { data: { user: result.user }, error: null }
    } catch (error: any) {
      return { data: null, error: { message: error.message } }
    }
  }

  const logout = async () => {
    backendApi.logout()
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 