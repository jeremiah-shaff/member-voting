import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api';

export default function ChangePasswordPage({ branding }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    try {
      await changePassword(oldPassword, newPassword);
      setSuccess('Password changed successfully!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2em auto', background: branding?.bg_color || '#fff', borderRadius: 12, boxShadow: '0 2px 8px #ccc', padding: '2em', color: branding?.text_color || '#222' }}>
      <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1em' }}>
          <label>Current Password</label>
          <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '1em' }}>
          <label>New Password</label>
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        <div style={{ marginBottom: '1em' }}>
          <label>Confirm New Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: '1em' }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: '1em' }}>{success}</div>}
        <button type="submit" style={{ background: branding?.button_color || '#007bff', color: branding?.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 'bold', width: '100%' }}>Change Password</button>
      </form>
    </div>
  );
}
