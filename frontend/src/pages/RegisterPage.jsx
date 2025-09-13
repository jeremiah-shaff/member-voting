import React, { useState, useEffect } from 'react';
import { apiRequest, getRegistrationEnabled } from '../api';

export default function RegisterPage({ branding }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabled).catch(() => setRegistrationEnabled(true));
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await apiRequest('/auth/register', 'POST', { username, password });
    if (res.id) {
      setSuccess('Registration successful! You can now log in.');
      setError('');
    } else {
      setError(res.error || 'Registration failed');
      setSuccess('');
    }
  };

  if (!registrationEnabled) {
    return <div style={{ color: 'red', marginTop: '2em' }}>Registration is currently disabled.</div>;
  }

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Register</button>
      </form>
  {error && <div style={{color:'red'}}>{error}</div>}
  {success && <div style={{color:'green'}}>{success}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
