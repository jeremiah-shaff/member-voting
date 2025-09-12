import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function BrandingPage() {
  const [branding, setBranding] = useState({ bg_color: '', nav_color: '', nav_text_color: '', text_color: '', button_color: '', fqdn: '', logo_path: '', icon_path: '' });
  const [form, setForm] = useState({ bg_color: '', nav_color: '', nav_text_color: '', text_color: '', button_color: '', fqdn: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiRequest('/branding', 'GET').then(res => {
      if (res) {
        setBranding(res);
        setForm({
          bg_color: res.bg_color || '',
          nav_color: res.nav_color || '',
          nav_text_color: res.nav_text_color || '',
          text_color: res.text_color || '',
          button_color: res.button_color || '',
          fqdn: res.fqdn || ''
        });
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
  <label>Navigation Bar Text Color <input type="color" value={form.nav_text_color} onChange={e => setForm(f => ({ ...f, nav_text_color: e.target.value }))} /></label><br />
  <label>Text Color <input type="color" value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} /></label><br />
  <label>Button Color <input type="color" value={form.button_color} onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))} /></label><br />
  <label>Site FQDN <input value={form.fqdn} onChange={e => setForm(f => ({ ...f, fqdn: e.target.value }))} /></label>
  <button
    type="button"
    style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft: '8px'}}
    onClick={async () => {
      setError(''); setSuccess('');
      if (!form.fqdn) { setError('FQDN required'); return; }
      setSuccess('Checking certificate status...');
      try {
        const certRes = await fetch('/api/certificate-status');
        const certData = await certRes.json();
        if (certData.valid && certData.expires) {
          const expDate = new Date(certData.expires);
          const now = new Date();
          const daysLeft = Math.round((expDate - now) / (1000 * 60 * 60 * 24));
          if (daysLeft > 7) {
            setSuccess(`Certificate is still valid (expires in ${daysLeft} days, on ${expDate.toLocaleString()}). No need to request a new one.`);
            return;
          }
        }
      } catch (err) {
        // Ignore error, allow request to proceed
      }
      setSuccess('Requesting certificate...');
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/request-certificate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fqdn: form.fqdn })
        });
        const data = await res.json();
        if (data.success) {
          setSuccess(data.message || 'Certificate requested! Server will reload with HTTPS.');
        } else {
          setError(data.error ? `${data.error}${data.details ? ' - ' + data.details : ''}` : 'Certificate request failed');
        }
      } catch (err) {
        setError('Network error: ' + err.toString());
      }
    }}
  >Request Certificate</button>
  <button
    type="button"
    style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft: '8px'}}
    onClick={async () => {
      setError(''); setSuccess('');
      if (!form.fqdn) { setError('FQDN required'); return; }
      setSuccess('Rebuilding nginx config for HTTPS...');
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/rebuild-nginx-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ fqdn: form.fqdn })
        });
        const data = await res.json();
        if (data.success) {
          setSuccess(data.message || 'Nginx config rebuilt for HTTPS!');
        } else {
          setError(data.error ? `${data.error}${data.details ? ' - ' + data.details : ''}` : 'Nginx config rebuild failed');
        }
      } catch (err) {
        setError('Network error: ' + err.toString());
      }
    }}
  >Rebuild HTTPS Config</button><br />
  <button type="submit" style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginTop: '8px'}}>Update Branding</button>
      </form>
      <div style={{marginBottom:'2em'}}>
        <h4>Logo</h4>
  {branding.logo_path && <img src={`${branding.logo_path}`} alt="Logo" style={{maxHeight:'80px', marginBottom:'8px'}} />}
        <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
  <button onClick={() => handleUpload('logo', logoFile)} style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginTop: '8px'}}>Upload Logo</button>
      </div>
      <div style={{marginBottom:'2em'}}>
        <h4>Site Icon</h4>
  {branding.icon_path && <img src={`${branding.icon_path}`} alt="Icon" style={{maxHeight:'40px', marginBottom:'8px'}} />}
        <input type="file" accept="image/*" onChange={e => setIconFile(e.target.files[0])} />
  <button onClick={() => handleUpload('icon', iconFile)} style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginTop: '8px'}}>Upload Icon</button>
      </div>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
