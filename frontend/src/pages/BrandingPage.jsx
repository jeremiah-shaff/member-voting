import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function BrandingPage() {
  const [branding, setBranding] = useState({ bg_color: '', nav_color: '', text_color: '', fqdn: '', logo_path: '', icon_path: '' });
  const [form, setForm] = useState({ bg_color: '', nav_color: '', text_color: '', fqdn: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiRequest('/branding', 'GET').then(res => {
      if (res) {
        setBranding(res);
  setForm({ bg_color: res.bg_color || '', nav_color: res.nav_color || '', text_color: res.text_color || '', fqdn: res.fqdn || '' });
      }
    });
  }, []);

  const handleUpdate = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest('/branding', 'PUT', form, token);
    if (res.id || res.bg_color) {
      setSuccess('Branding updated!');
      setError('');
      setBranding(res);
    } else {
      setError(res.error || 'Update failed');
      setSuccess('');
    }
  };

  const handleUpload = async (type, file) => {
    if (!file) return;
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append(type, file);
    const res = await fetch(`/api/branding/${type}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (data[`${type}_path`]) {
      setSuccess(`${type.charAt(0).toUpperCase()+type.slice(1)} uploaded!`);
      setError('');
      setBranding(b => ({ ...b, [`${type}_path`]: data[`${type}_path`] }));
    } else {
      setError(data.error || 'Upload failed');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Branding Settings</h2>
      <form onSubmit={handleUpdate} style={{marginBottom:'2em'}}>
  <label>Background Color <input type="color" value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} /></label><br />
  <label>Navigation Bar Color <input type="color" value={form.nav_color} onChange={e => setForm(f => ({ ...f, nav_color: e.target.value }))} /></label><br />
  <label>Text Color <input type="color" value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} /></label><br />
  <label>Site FQDN <input value={form.fqdn} onChange={e => setForm(f => ({ ...f, fqdn: e.target.value }))} /></label><br />
        <button type="submit">Update Branding</button>
      </form>
      <div style={{marginBottom:'2em'}}>
        <h4>Logo</h4>
  {branding.logo_path && <img src={`http://localhost:4000${branding.logo_path}`} alt="Logo" style={{maxHeight:'80px', marginBottom:'8px'}} />}
        <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
        <button onClick={() => handleUpload('logo', logoFile)}>Upload Logo</button>
      </div>
      <div style={{marginBottom:'2em'}}>
        <h4>Site Icon</h4>
  {branding.icon_path && <img src={`http://localhost:4000${branding.icon_path}`} alt="Icon" style={{maxHeight:'40px', marginBottom:'8px'}} />}
        <input type="file" accept="image/*" onChange={e => setIconFile(e.target.files[0])} />
        <button onClick={() => handleUpload('icon', iconFile)}>Upload Icon</button>
      </div>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
