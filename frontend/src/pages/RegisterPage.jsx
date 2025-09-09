import React, { useState } from 'react';
import { apiRequest } from '../api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await apiRequest('/auth/register', 'POST', { username, password, is_admin: isAdmin });
    if (res.id) {
      setSuccess('Registration successful! You can now log in.');
      setError('');
    } else {
      setError(res.error || 'Registration failed');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <label>
          <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} /> Admin
        </label>
        <button type="submit">Register</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
