import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import backendApi from '../services/backendApi';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    try {
      console.log('🚀 Starting signup process...');
      
      await backendApi.registerUser({
        email,
        username: username || email.split('@')[0],
        password,
        rating: 1500,
        playstyle: 'balanced',
        rating_progress: []
      });
      
      console.log('✅ Registration completed, attempting login...');
      // Automatically login after successful registration
      await backendApi.loginUser(email, password);
      
      console.log('✅ Login successful, redirecting...');
      setSuccess('Account created successfully! Redirecting...');
      
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('💥 Signup process failed:', error);
      
      // Better error message handling
      let errorMessage = 'Unknown error occurred';
      if (error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && error.toString) {
        errorMessage = error.toString();
      }
      
      setError('Signup failed: ' + errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          type="text"
          placeholder="Username (optional)"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <input
          type="password"
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 16 }}>{success}</div>}
      <div style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Login</a>
      </div>
    </div>
  );
};

export default Signup; 