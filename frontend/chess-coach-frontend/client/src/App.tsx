import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { Home } from '@/pages/Home'
import { Analyze } from '@/pages/Analyze'
import { Profile } from '@/pages/Profile'
import { Drills } from '@/pages/Drills'
import { Learn } from '@/pages/Learn'
import { Login } from '@/pages/Login'
import { Signup } from '@/pages/Signup'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 bg-gray-100 border border-gray-300">
          <h2 className="text-xl font-bold">Something went wrong!</h2>
          <p>Error: {this.state.error?.message}</p>
          <pre className="bg-gray-200 p-2 mt-2 overflow-auto text-sm">
            {this.state.error?.stack}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  console.log('🛡️ ProtectedRoute check:')
  console.log('- Loading:', loading)
  console.log('- User:', user ? `${user.email} (${user.id})` : 'null')
  
  if (loading) {
    console.log('⏳ Still loading, showing loading screen')
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    console.log('❌ No user found, redirecting to login')
    return <Navigate to="/login" />
  }
  
  console.log('✅ User authenticated, showing protected content')
  return <>{children}</>
}

function NavBar() {
  const { user, logout } = useAuth()
  
  console.log('🧭 NavBar render:')
  console.log('- User:', user ? `${user.email}` : 'null')
  
  return (
    <nav className="bg-slate-800 text-white p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-400">
            RookifyCoach
          </Link>
          <ul className="flex space-x-4 items-center">
            {user && (
              <>
                <li><Link to="/" className="hover:text-blue-400">Dashboard</Link></li>
                <li><Link to="/analyze" className="hover:text-blue-400">Game Analysis</Link></li>
                <li><Link to="/drills" className="hover:text-blue-400">Drill Mode</Link></li>
                <li><Link to="/profile" className="hover:text-blue-400">Skill Profile</Link></li>
                <li><Link to="/learn" className="hover:text-blue-400">Learn More</Link></li>
                <li>
                  <Button 
                    onClick={logout} 
                    variant="ghost" 
                    className="text-white hover:text-blue-400"
                  >
                    Logout
                  </Button>
                </li>
              </>
            )}
            {!user && (
              <>
                <li><Link to="/login" className="hover:text-blue-400">Login</Link></li>
                <li><Link to="/signup" className="hover:text-blue-400">Sign Up</Link></li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <NavBar />
          <main className="min-h-screen bg-background">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
              <Route path="/drills" element={<ProtectedRoute><Drills /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 