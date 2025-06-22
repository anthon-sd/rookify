import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Profile from './pages/Profile';
import Drills from './pages/Drills';
import Learn from './pages/Learn';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#f8f8f8', border: '1px solid #ccc' }}>
          <h2>Something went wrong!</h2>
          <p>Error: {this.state.error?.message}</p>
          <pre style={{ background: '#eee', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  console.log('🛡️ ProtectedRoute check:');
  console.log('- Loading:', loading);
  console.log('- User:', user ? `${user.email} (${user.id})` : 'null');
  
  if (loading) {
    console.log('⏳ Still loading, showing loading screen');
    return <div>Loading...</div>;
  }
  
  if (!user) {
    console.log('❌ No user found, redirecting to login');
    return <Navigate to="/login" />;
  }
  
  console.log('✅ User authenticated, showing protected content');
  return children;
}

function NavBar() {
  const { user, logout } = useAuth();
  
  console.log('🧭 NavBar render:');
  console.log('- User:', user ? `${user.email}` : 'null');
  
  return (
    <nav className="main-nav">
      <ul>
        {user && <li><Link to="/">Dashboard</Link></li>}
        {user && <li><Link to="/analyze">Game Analysis</Link></li>}
        {user && <li><Link to="/drills">Drill Mode</Link></li>}
        {user && <li><Link to="/profile">Skill Profile</Link></li>}
        {user && <li><Link to="/learn">Learn More</Link></li>}
        {!user && <li><Link to="/login">Login</Link></li>}
        {!user && <li><Link to="/signup">Sign Up</Link></li>}
        {user && <li><button onClick={logout} style={{ background: 'none', border: 'none', color: '#61dafb', cursor: 'pointer' }}>Logout</button></li>}
      </ul>
    </nav>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <NavBar />
          <div className="main-content">
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
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
