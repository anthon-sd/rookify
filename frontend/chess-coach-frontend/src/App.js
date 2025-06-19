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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function NavBar() {
  const { user, logout } = useAuth();
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
  );
}

export default App;
