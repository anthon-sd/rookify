import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const { signup, signInWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const { error } = await signup(email, password);
    if (error) setError("Signup error: " + error.message);
    else setSuccess('Check your email to confirm your account!');
  };

  const handleOAuth = async (provider) => {
    const { error } = await signInWithProvider(provider);
    if (error) setError(error.message);
    // Supabase will redirect on success
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
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 8 }}
        />
        <button type="submit" style={{ width: '100%' }}>Sign Up</button>
      </form>
      <div style={{ margin: '1rem 0' }}>
        <button onClick={() => handleOAuth('google')} style={{ width: '100%', marginBottom: 8 }}>Sign up with Google</button>
        <button onClick={() => handleOAuth('chess.com')} style={{ width: '100%' }}>Sign up with Chess.com</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
      <div style={{ marginTop: 16 }}>
        Already have an account? <a href="/login">Login</a>
      </div>
    </div>
  );
};

export default Signup; 