import React, { useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await apiRequest('/auth/login', 'POST', { username, password });
    if (res.token) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('is_admin', res.user.is_admin ? 'true' : 'false');
      window.location.href = '/ballots';
    } else {
      setError(res.error || 'Login failed');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
    </div>
  );
}
