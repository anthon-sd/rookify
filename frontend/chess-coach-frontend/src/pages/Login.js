import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 Login form submitted');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    setError('');
    setIsLoading(true);
    
    try {
      console.log('⏳ Calling AuthContext login...');
      const result = await login(email, password);
      console.log('✅ AuthContext login result:', result);
      
      if (result.error) {
        console.error('❌ Login returned error:', result.error);
        setError('Login failed: ' + result.error.message);
      } else {
        console.log('✅ Login successful, user:', result.data.user);
        console.log('🧭 Navigating to home page...');
        navigate('/');
        console.log('✅ Navigation completed');
      }
    } catch (error) {
      console.error('❌ Login failed in component:', error);
      setError('Login failed: ' + error.message);
    } finally {
      console.log('🏁 Setting loading to false');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto' }}>
      <h2>Login</h2>
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
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ width: '100%', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      <div style={{ marginTop: 16 }}>
        Don't have an account? <a href="/signup">Sign up</a>
      </div>
    </div>
  );
};

export default Login; 