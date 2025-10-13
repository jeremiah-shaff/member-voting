import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function BrandingPage() {
  const [branding, setBranding] = useState({ bg_color: '', nav_color: '', nav_text_color: '', text_color: '', button_color: '', fqdn: '', logo_path: '', icon_path: '' });
  const [form, setForm] = useState({ bg_color: '', nav_color: '', nav_text_color: '', text_color: '', button_color: '', fqdn: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [iconFile, setIconFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // SMTP settings state
  const [smtp, setSmtp] = useState({
    smtp_url: '',
    smtp_host: '',
    smtp_port: '',
    smtp_secure: false,
    smtp_user: '',
    smtp_pass: '',
    has_password: false,
    from_email: '',
    // OAuth fields
    oauth_enabled: false,
    oauth_mode: 'delegated',
    oauth_tenant_id: '',
    oauth_client_id: '',
    oauth_client_secret: '',
    has_client_secret: false,
    oauth_user: '',
    oauth_scope: 'https://outlook.office365.com/SMTP.Send offline_access openid profile email',
    oauth_authority: 'https://login.microsoftonline.com',
    // Graph
    use_graph_email: false,
    graph_tenant_id: '',
    graph_client_id: '',
    graph_client_secret: '',
    has_graph_client_secret: false,
    graph_user: '',
    graph_authority: 'https://login.microsoftonline.com'
  });
  const [smtpTestTo, setSmtpTestTo] = useState('');
  const isOAuthConfigured = !!smtp.oauth_enabled;
  const isOAuthValid = !isOAuthConfigured || (
    (smtp.oauth_tenant_id?.trim()?.length > 0) &&
    (smtp.oauth_client_id?.trim()?.length > 0) &&
    (smtp.oauth_user?.trim()?.length > 0)
  );
  const canSaveGraph = smtp.use_graph_email ? (
    (smtp.graph_tenant_id?.trim()?.length > 0) &&
    (smtp.graph_client_id?.trim()?.length > 0) &&
    ((smtp.graph_client_secret?.trim()?.length > 0) || smtp.has_graph_client_secret) &&
    (smtp.graph_user?.trim()?.length > 0)
  ) : true;

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
          box_border_color: res.box_border_color || '',
          box_shadow_color: res.box_shadow_color || '',
          box_bg_color: res.box_bg_color || '',
          timezone: res.timezone || '',
          fqdn: res.fqdn || ''
        });
      }
    });
    // Load SMTP settings
    const token = localStorage.getItem('token');
    apiRequest('/smtp-settings', 'GET', undefined, token).then(res => {
      if (res && !res.error) {
        setSmtp(s => ({ ...s, ...res }));
      }
    });
    // Load platform settings
    apiRequest('/platform-settings', 'GET', undefined, token).then(res => {
      if (res && !res.error) {
        setPlatform(ps => ({ ...ps, ...res }));
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
      <PlatformSection branding={branding} />
  <form onSubmit={handleUpdate} style={{marginBottom:'2em'}}>
  <label>Background Color <input type="color" value={form.bg_color} onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))} /></label><br />
  <label>Navigation Bar Color <input type="color" value={form.nav_color} onChange={e => setForm(f => ({ ...f, nav_color: e.target.value }))} /></label><br />
  <label>Navigation Bar Text Color <input type="color" value={form.nav_text_color} onChange={e => setForm(f => ({ ...f, nav_text_color: e.target.value }))} /></label><br />
  <label>Text Color <input type="color" value={form.text_color} onChange={e => setForm(f => ({ ...f, text_color: e.target.value }))} /></label><br />
  <label>Button Color <input type="color" value={form.button_color} onChange={e => setForm(f => ({ ...f, button_color: e.target.value }))} /></label><br />
  <label>Box Border Color <input type="color" value={form.box_border_color || ''} onChange={e => setForm(f => ({ ...f, box_border_color: e.target.value }))} /></label><br />
  <label>Box Shadow Color <input type="color" value={form.box_shadow_color || ''} onChange={e => setForm(f => ({ ...f, box_shadow_color: e.target.value }))} /></label><br />
  <label>Box Background Color <input type="color" value={form.box_bg_color || ''} onChange={e => setForm(f => ({ ...f, box_bg_color: e.target.value }))} /></label><br />
  <label>Timezone
  <select value={form.timezone || ''} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
    <option value="">Select Timezone</option>
    <option value="America/Los_Angeles">America/Los_Angeles</option>
    <option value="America/Denver">America/Denver</option>
    <option value="America/Chicago">America/Chicago</option>
    <option value="America/New_York">America/New_York</option>
    <option value="UTC">UTC</option>
    <option value="Europe/London">Europe/London</option>
    <option value="Europe/Berlin">Europe/Berlin</option>
    <option value="Asia/Tokyo">Asia/Tokyo</option>
    <option value="Australia/Sydney">Australia/Sydney</option>
  </select>
</label>
  <ul style={{listStyle:'none', padding:0}}>
  <li style={{
  marginBottom: '32px',
  border: `2px solid ${branding?.box_border_color || '#007bff'}`,
  borderRadius: '12px',
  boxShadow: `0 2px 8px ${branding?.box_shadow_color || 'rgba(0,0,0,0.07)'}`,
  padding: '20px',
  background: branding?.box_bg_color || '#f8faff',
}}>
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
  >Rebuild HTTPS Config</button>
  </li>
  </ul><br />
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
      <div style={{marginBottom:'2em'}}>
        <h3>Email Settings</h3>
        <p style={{fontSize:'0.9em'}}>Configure how emails are sent for invite links. You can use Microsoft Graph (app-only) or SMTP (basic/delegated OAuth).</p>
        <div style={{
          marginBottom: '16px',
          border: `2px solid ${branding?.box_border_color || '#007bff'}`,
          borderRadius: '12px',
          boxShadow: `0 2px 8px ${branding?.box_shadow_color || 'rgba(0,0,0,0.07)'}`,
          padding: '16px',
          background: branding?.box_bg_color || '#f8faff',
        }}>
          <label style={{display:'block', marginBottom:'8px'}}>Use Microsoft Graph (recommended for app-only)
            <input type="checkbox" style={{marginLeft:'8px'}} checked={!!smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, use_graph_email: e.target.checked }))} />
          </label>
          {smtp.use_graph_email && (
            <div style={{borderTop:'1px dashed #ccc', paddingTop:'10px', marginTop:'10px'}}>
              <div style={{fontWeight:'bold', marginBottom:'6px'}}>Graph Settings</div>
              <div style={{fontSize:'0.85em', opacity:0.8, marginBottom:'6px'}}>Requires an Azure AD app with Application permission Mail.Send (admin consent). Emails are sent as the user below.</div>
              <label>Tenant ID <input value={smtp.graph_tenant_id || ''} onChange={e => setSmtp(v => ({ ...v, graph_tenant_id: e.target.value }))} /></label><br />
              <label>Client ID <input value={smtp.graph_client_id || ''} onChange={e => setSmtp(v => ({ ...v, graph_client_id: e.target.value }))} /></label><br />
              <label>Client Secret <input type="password" value={smtp.graph_client_secret || ''} placeholder={smtp.has_graph_client_secret ? '•••••• (set)' : ''} onChange={e => setSmtp(v => ({ ...v, graph_client_secret: e.target.value }))} /></label>{' '}
              {smtp.has_graph_client_secret && (
                <label style={{marginLeft:'8px'}}><input type="checkbox" onChange={e => setSmtp(v => ({ ...v, clear_graph_client_secret: e.target.checked }))} /> Clear client secret</label>
              )}
              <br />
              <label>Send As (user email) <input value={smtp.graph_user || ''} onChange={e => setSmtp(v => ({ ...v, graph_user: e.target.value }))} placeholder="user@domain.com" /></label><br />
              <label>Authority <input value={smtp.graph_authority || ''} onChange={e => setSmtp(v => ({ ...v, graph_authority: e.target.value }))} placeholder="https://login.microsoftonline.com" /></label>
            </div>
          )}
          <label style={{display:'block', marginBottom:'8px'}}>Use OAuth (Exchange Online)
            <input type="checkbox" style={{marginLeft:'8px'}} checked={!!smtp.oauth_enabled} onChange={e => setSmtp(v => ({ ...v, oauth_enabled: e.target.checked }))} />
          </label>
          <label>SMTP URL <input placeholder="smtp://user:pass@host:port" value={smtp.smtp_url || ''} disabled={smtp.oauth_enabled || smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, smtp_url: e.target.value }))} style={{width:'100%'}} /></label><br />
          <div style={{opacity:0.7, fontSize:'0.85em', margin:'6px 0'}}>Or specify individual fields below (host/port/secure/user/password)</div>
          <label>Host <input value={smtp.smtp_host || ''} disabled={smtp.oauth_enabled || smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, smtp_host: e.target.value }))} /></label>{' '}
          <label>Port <input type="number" value={smtp.smtp_port || ''} disabled={smtp.oauth_enabled || smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, smtp_port: e.target.value }))} style={{width:100}} /></label>{' '}
          <label><input type="checkbox" checked={!!smtp.smtp_secure} disabled={smtp.oauth_enabled || smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, smtp_secure: e.target.checked }))} /> Use TLS (secure)</label><br />
          <label>Username <input value={smtp.smtp_user || ''} disabled={smtp.oauth_enabled || smtp.use_graph_email} onChange={e => setSmtp(v => ({ ...v, smtp_user: e.target.value }))} /></label><br />
          <label>Password <input type="password" value={smtp.smtp_pass || ''} disabled={smtp.oauth_enabled || smtp.use_graph_email} placeholder={smtp.has_password ? '•••••• (set)' : ''} onChange={e => setSmtp(v => ({ ...v, smtp_pass: e.target.value }))} /></label>{' '}
          {!smtp.oauth_enabled && smtp.has_password && (
            <label style={{marginLeft:'8px'}}><input type="checkbox" onChange={e => setSmtp(v => ({ ...v, clear_password: e.target.checked }))} /> Clear saved password</label>
          )}
          <br />
          {smtp.oauth_enabled && (
            <div style={{borderTop:'1px dashed #ccc', paddingTop:'10px', marginTop:'10px'}}>
              <div style={{fontWeight:'bold', marginBottom:'6px'}}>SMTP OAuth (Exchange Online)</div>
              <div style={{fontSize:'0.85em', opacity:0.8, marginBottom:'6px'}}>For SMTP, use delegated mode (device code sign-in). App-only does not work with SMTP AUTH. If you prefer app-only, use Microsoft Graph above.</div>
              <label>Mode
                <select value={smtp.oauth_mode || 'delegated'} onChange={e => setSmtp(v => ({ ...v, oauth_mode: e.target.value }))} style={{marginLeft:'8px'}}>
                  <option value="delegated">Delegated (device code)</option>
                  <option value="client-credentials">Client Credentials (not supported for SMTP)</option>
                </select>
              </label>
              <br />
              <label>Tenant ID <input value={smtp.oauth_tenant_id || ''} onChange={e => setSmtp(v => ({ ...v, oauth_tenant_id: e.target.value }))} /></label><br />
              <label>Client ID <input value={smtp.oauth_client_id || ''} onChange={e => setSmtp(v => ({ ...v, oauth_client_id: e.target.value }))} /></label><br />
              {smtp.oauth_mode !== 'delegated' && (
                <>
                  <label>Client Secret <input type="password" value={smtp.oauth_client_secret || ''} placeholder={smtp.has_client_secret ? '•••••• (set)' : ''} onChange={e => setSmtp(v => ({ ...v, oauth_client_secret: e.target.value }))} /></label>{' '}
                  {smtp.has_client_secret && (
                    <label style={{marginLeft:'8px'}}><input type="checkbox" onChange={e => setSmtp(v => ({ ...v, clear_client_secret: e.target.checked }))} /> Clear client secret</label>
                  )}
                  <br />
                </>
              )}
              <label>OAuth User (email) <input value={smtp.oauth_user || ''} onChange={e => setSmtp(v => ({ ...v, oauth_user: e.target.value }))} placeholder="user@domain.com" /></label><br />
              <label>Scope <input value={smtp.oauth_scope || ''} onChange={e => setSmtp(v => ({ ...v, oauth_scope: e.target.value }))} placeholder="https://outlook.office365.com/SMTP.Send offline_access openid profile email" /></label><br />
              <label>Authority <input value={smtp.oauth_authority || ''} onChange={e => setSmtp(v => ({ ...v, oauth_authority: e.target.value }))} placeholder="https://login.microsoftonline.com" /></label>
              {!isOAuthValid && <div style={{color:'#a94442', marginTop:'6px'}}>To use OAuth delegated, please provide Tenant ID, Client ID, and OAuth User. Then start device code sign-in.</div>}
              <div style={{marginTop:'6px'}}>
                <button
                  type="button"
                  style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px'}}
                  disabled={!isOAuthValid || smtp.oauth_mode !== 'delegated'}
                  onClick={async () => {
                    setError(''); setSuccess('');
                    const token = localStorage.getItem('token');
                    const res = await apiRequest('/smtp-settings/oauth/device-code', 'POST', {}, token);
                    if (res && res.success) {
                      const info = res.device;
                      if (info) {
                        setSuccess(`Device code generated. ${info.message || `Go to ${info.verificationUri} and enter code ${info.userCode}`}`);
                      } else {
                        setSuccess('Device code flow started. Follow instructions in the terminal/logs.');
                      }
                    } else {
                      setError(res?.error || 'Failed to start device code flow');
                    }
                  }}
                >Start Device Code Sign-in</button>
              </div>
            </div>
          )}
          <label>From Email <input value={smtp.from_email || ''} onChange={e => setSmtp(v => ({ ...v, from_email: e.target.value }))} placeholder="no-reply@example.com" /></label>
          <div style={{marginTop:'8px'}}>
            <button
              type="button"
              style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px'}}
              disabled={(smtp.oauth_enabled && !isOAuthValid) || !canSaveGraph}
              onClick={async () => {
                setError(''); setSuccess('');
                const token = localStorage.getItem('token');
                const payload = {
                  smtp_url: smtp.smtp_url,
                  smtp_host: smtp.smtp_host,
                  smtp_port: smtp.smtp_port,
                  smtp_secure: smtp.smtp_secure,
                  smtp_user: smtp.smtp_user,
                  // Only send smtp_pass if field has a value; else keep existing
                  ...(smtp.smtp_pass ? { smtp_pass: smtp.smtp_pass } : {}),
                  ...(smtp.clear_password ? { clear_password: true } : {}),
                  from_email: smtp.from_email,
                  oauth_enabled: smtp.oauth_enabled,
                  oauth_mode: smtp.oauth_mode,
                  oauth_tenant_id: smtp.oauth_tenant_id,
                  oauth_client_id: smtp.oauth_client_id,
                  oauth_user: smtp.oauth_user,
                  oauth_scope: smtp.oauth_scope,
                  oauth_authority: smtp.oauth_authority,
                  ...(smtp.oauth_client_secret ? { oauth_client_secret: smtp.oauth_client_secret } : {}),
                  ...(smtp.clear_client_secret ? { clear_client_secret: true } : {}),
                  use_graph_email: smtp.use_graph_email,
                  graph_tenant_id: smtp.graph_tenant_id,
                  graph_client_id: smtp.graph_client_id,
                  graph_user: smtp.graph_user,
                  graph_authority: smtp.graph_authority,
                  ...(smtp.graph_client_secret ? { graph_client_secret: smtp.graph_client_secret } : {}),
                  ...(smtp.clear_graph_client_secret ? { clear_graph_client_secret: true } : {}),
                };
                const res = await apiRequest('/smtp-settings', 'PUT', payload, token);
                if (res && !res.error) {
                  setSuccess('SMTP settings saved');
                  setSmtp(v => ({
                    ...v,
                    smtp_pass: '',
                    oauth_client_secret: '',
                    graph_client_secret: '',
                    has_password: smtp.clear_password ? false : (v.has_password || !!payload.smtp_pass),
                    has_client_secret: smtp.clear_client_secret ? false : (v.has_client_secret || !!payload.oauth_client_secret),
                    has_graph_client_secret: smtp.clear_graph_client_secret ? false : (v.has_graph_client_secret || !!payload.graph_client_secret),
                    clear_password: false,
                    clear_client_secret: false,
                    clear_graph_client_secret: false,
                  }));
                } else {
                  setError(res.error || 'Failed to save SMTP settings');
                }
              }}
            >Save SMTP Settings</button>
            {smtp.oauth_enabled && (
              <button
                type="button"
                style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft:'8px'}}
                disabled={!isOAuthValid}
                onClick={async () => {
                  setError(''); setSuccess('');
                  if (!isOAuthValid) return;
                  const token = localStorage.getItem('token');
                  const res = await apiRequest('/smtp-settings/verify-oauth', 'POST', {}, token);
                  if (res && !res.error && res.success) {
                    if (res.mode === 'delegated') {
                      setSuccess(`Delegated OAuth is ready${res.username ? ` for ${res.username}` : ''}.`);
                    } else if (res.mode === 'graph') {
                      setSuccess('Graph app-only auth is valid.');
                    } else {
                      setSuccess('OAuth verified.');
                    }
                  } else {
                    const msg = (res && res.error) || 'OAuth verification failed';
                    const det = [res?.details, res?.code, res?.suberror, res?.correlationId].filter(Boolean).join(' | ');
                    setError(det ? `${msg}: ${det}` : msg);
                  }
                }}
              >Verify OAuth Token</button>
            )}
            <div style={{marginTop:'10px'}}>
              <label>Send Test To <input value={smtpTestTo} placeholder="you@example.com" onChange={e => setSmtpTestTo(e.target.value)} /></label>{' '}
              <button
                type="button"
                style={{background: branding.button_color || '#007bff', color: branding.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px'}}
                disabled={(smtp.oauth_enabled && !isOAuthValid)}
                onClick={async () => {
                  setError(''); setSuccess('');
                  if (smtp.oauth_enabled && !isOAuthValid) {
                    setError('Complete OAuth fields and save before sending a test.');
                    return;
                  }
                  const token = localStorage.getItem('token');
                  const res = await apiRequest('/smtp-settings/test', 'POST', { to: smtpTestTo }, token);
                  if (res && !res.error) {
                    setSuccess(`Test email sent${res.messageId ? ` (messageId: ${res.messageId})` : ''}.`);
                  } else {
                    const msg = res.error || 'Failed to send test email';
                    const det = [res?.details, res?.code, res?.suberror, res?.correlationId].filter(Boolean).join(' | ');
                    setError(det ? `${msg}: ${det}` : msg);
                  }
                }}
              >Send Test Email</button>
            </div>
          </div>
        </div>
      </div>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}

function PlatformSection({ branding }) {
  const [platform, setPlatform] = React.useState({ organization_name: '', platform_name: 'Member Voting' });
  const [status, setStatus] = React.useState({ error: '', success: '' });
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/platform-settings', 'GET', undefined, token).then(res => {
      if (res && !res.error) setPlatform(p => ({ ...p, ...res }));
    });
  }, []);
  return (
    <div style={{
      margin: '1em 0',
      padding: '1em',
      border: `1px solid ${branding?.box_border_color || '#ccc'}`,
      borderRadius: '8px',
      background: branding?.box_bg_color || '#f9f9f9',
      boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`,
    }}>
      <h4>Platform & Organization</h4>
      <div style={{display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center'}}>
        <label>Organization Name <input value={platform.organization_name || ''} onChange={e => setPlatform(p => ({ ...p, organization_name: e.target.value }))} placeholder="Your organization" /></label>
        <label>Platform Name <input value={platform.platform_name || ''} onChange={e => setPlatform(p => ({ ...p, platform_name: e.target.value }))} placeholder="Member Voting" /></label>
        <button
          onClick={async () => {
            setStatus({ error: '', success: '' });
            const token = localStorage.getItem('token');
            const res = await apiRequest('/platform-settings', 'PUT', platform, token);
            if (res && !res.error) setStatus({ success: 'Saved platform settings.', error: '' });
            else setStatus({ error: res?.error || 'Save failed', success: '' });
          }}
          style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}
        >Save</button>
      </div>
      {status.error && <div style={{color:'red', marginTop:'6px'}}>{status.error}</div>}
      {status.success && <div style={{color:'green', marginTop:'6px'}}>{status.success}</div>}
    </div>
  );
}
