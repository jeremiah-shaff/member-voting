import React, { useState, useEffect } from 'react';
import { apiRequest, getRegistrationEnabled } from '../api';
import { useLocation } from 'react-router-dom';

export default function RegisterPage({ branding }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [inviteToken, setInviteToken] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);
  const location = useLocation();

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabled).catch(() => setRegistrationEnabled(true));
    const params = new URLSearchParams(location.search);
    const token = params.get('invite') || '';
    if (token) {
      setInviteToken(token);
      // Validate invite token
      fetch(`/api/invites/validate/${token}`).then(r => r.json()).then(data => {
        if (data.valid) {
          setInviteInfo(data);
          if (data.email) setUsername(data.email);
        } else {
          setError('Invite link is invalid or expired.');
        }
      }).catch(() => setError('Failed to validate invite link.'));
    }
  }, [location.search]);

  const handleRegister = async (e) => {
    e.preventDefault();
  const payload = { username, password };
  if (inviteToken) payload.invite_token = inviteToken;
  const res = await apiRequest('/auth/register', 'POST', payload);
    if (res.id) {
      setSuccess('Registration successful! You can now log in.');
      setError('');
    } else {
      setError(res.error || 'Registration failed');
      setSuccess('');
    }
  };

  // If registration disabled, allow if invite is valid
  if (!registrationEnabled && !inviteInfo) {
    return <div style={{ color: 'red', marginTop: '2em' }}>Registration is currently disabled.</div>;
  }

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} disabled={!!(inviteInfo && inviteInfo.email)} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Register</button>
      </form>
  {error && <div style={{color:'red'}}>{error}</div>}
  {success && <div style={{color:'green'}}>{success}</div>}
      {inviteInfo && (
        <div style={{marginTop:'8px', fontSize:'0.9em', color:'#555'}}>
          Using invite link{inviteInfo.email ? ` for ${inviteInfo.email}` : ''}. Expires at {new Date(inviteInfo.expires_at).toLocaleString()}.
        </div>
      )}
    </div>
  );
}
