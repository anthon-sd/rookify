import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, signInWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = await login(email, password);
    if (error) setError(error.message);
    else navigate('/');
  };

  const handleOAuth = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) setError(error.message);
    // Supabase will redirect on success
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
        <button type="submit" style={{ width: '100%' }}>Login</button>
      </form>
      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => handleOAuth('google')} style={{ width: '100%', marginBottom: 8 }}>Login with Google</button>
        <button onClick={() => handleOAuth('chess.com')} style={{ width: '100%' }}>Login with Chess.com</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginTop: 16 }}>
        Don't have an account? <a href="/signup">Sign up</a>
      </div>
    </div>
  );
};

export default Login; 