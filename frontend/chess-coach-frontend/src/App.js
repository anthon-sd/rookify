import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import Profile from './pages/Profile';
import Drills from './pages/Drills';
import Learn from './pages/Learn';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/analyze">Analyze</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/drills">Drills</Link></li>
          <li><Link to="/learn">Learn</Link></li>
          <li><Link to="/explore">Explore</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/drills" element={<Drills />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
