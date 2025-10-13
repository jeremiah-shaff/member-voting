import React, { useEffect, useState } from 'react';
import { apiRequest, getRegistrationEnabled, setRegistrationEnabled } from '../api';

export default function MemberManagementPage({ branding }) {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ username: '', password: '', is_admin: false });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', is_admin: false });
  const [registrationEnabled, setRegistrationEnabledState] = useState(true);
  const [allowAbstain, setAllowAbstain] = useState(branding?.allow_abstain !== false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCount, setInviteCount] = useState(1);
  const [inviteHours, setInviteHours] = useState(72);
  const [invites, setInvites] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [csvExpires, setCsvExpires] = useState(72);
  const [csvSend, setCsvSend] = useState(true);

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    const res = await apiRequest('/members', 'GET', null, token);
    if (Array.isArray(res)) setMembers(res);
    else setError(res.error || 'Failed to load members');
  };

  useEffect(() => { fetchMembers(); }, []);
  const fetchInvites = async () => {
    const token = localStorage.getItem('token');
    const res = await apiRequest('/invites', 'GET', null, token);
    if (Array.isArray(res)) setInvites(res);
  };
  useEffect(() => { fetchInvites(); }, []);

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabledState);
  }, []);

  useEffect(() => {
    if (branding) {
      setAllowAbstain(branding.allow_abstain !== false);
    }
  }, [branding]);

  const handleAdd = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest('/members', 'POST', form, token);
    if (res.id) {
      setSuccess('Member added!');
      setError('');
      setForm({ username: '', password: '', is_admin: false });
      fetchMembers();
    } else {
      setError(res.error || 'Add failed');
      setSuccess('');
    }
  };

  const handleEdit = member => {
    setEditId(member.id);
    setEditForm({ username: member.username, password: '', is_admin: member.is_admin });
  };

  const handleUpdate = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/members/${editId}`, 'PUT', editForm, token);
    if (res.id) {
      setSuccess('Member updated!');
      setError('');
      setEditId(null);
      setEditForm({ username: '', password: '', is_admin: false });
      fetchMembers();
    } else {
      setError(res.error || 'Update failed');
      setSuccess('');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this member?')) return;
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/members/${id}`, 'DELETE', null, token);
    if (res.success) {
      setSuccess('Member deleted!');
      setError('');
      fetchMembers();
    } else {
      setError(res.error || 'Delete failed');
      setSuccess('');
    }
  };

  const handleToggle = async () => {
    const newVal = !registrationEnabled;
    await setRegistrationEnabled(newVal);
    setRegistrationEnabledState(newVal);
  };

  const handleToggleAbstain = async () => {
    const updated = { ...(branding || {}), allow_abstain: !allowAbstain };
    await apiRequest('/branding', 'PUT', updated, localStorage.getItem('token'));
    setAllowAbstain(!allowAbstain);
  };

  const handleCreateInvites = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest('/invites', 'POST', { email: inviteEmail, count: Number(inviteCount), expires_in_hours: Number(inviteHours) }, token);
    if (Array.isArray(res)) {
      setSuccess(`Created ${res.length} invite(s).`);
      setError('');
      setInviteEmail('');
      fetchInvites();
    } else {
      setError(res.error || 'Failed to create invites');
      setSuccess('');
    }
  };

  const handleSendInvite = async (id) => {
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/invites/${id}/send`, 'POST', {}, token);
    if (res.success) {
      setSuccess('Invite email sent.');
      setError('');
    } else {
      setError(res.error || 'Failed to send invite');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Member Management</h2>
      <form onSubmit={handleAdd} style={{marginBottom:'2em'}}>
        <h4>Add Member</h4>
        <input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        <input type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        <label style={{marginLeft:'1em'}}>
          <input type="checkbox" checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))} /> Admin
        </label>
  <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Add</button>
      </form>
      <div style={{
  margin: '1em 0',
  padding: '1em',
  border: `1px solid ${branding?.box_border_color || '#ccc'}`,
  borderRadius: '8px',
  background: branding?.box_bg_color || '#f9f9f9',
  boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`,
}}>
  <label style={{ fontWeight: 'bold' }}>
    <input type="checkbox" checked={registrationEnabled} onChange={handleToggle} style={{marginRight:'8px'}}/>
    Enable new user registration
  </label>
</div>
<div style={{
  margin: '1em 0',
  padding: '1em',
  border: `1px solid ${branding?.box_border_color || '#ccc'}`,
  borderRadius: '8px',
  background: branding?.box_bg_color || '#f9f9f9',
  boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`,
}}>
        <label>
          <input
            type="checkbox"
            checked={allowAbstain}
            onChange={handleToggleAbstain}
            style={{marginRight:'8px'}}
          />
          Enable "Abstain" voting option for members
        </label>
      </div>
      <div style={{
  margin: '1em 0',
  padding: '1em',
  border: `1px solid ${branding?.box_border_color || '#ccc'}`,
  borderRadius: '8px',
  background: branding?.box_bg_color || '#f9f9f9',
  boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`,
}}>
        <h4>Registration Invites</h4>
        <form onSubmit={handleCreateInvites} style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
          <label><input type="email" placeholder="Invitee Email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />Email</label>
          <label><input type="number" min="1" max="100" placeholder="Count" value={inviteCount} onChange={e => setInviteCount(e.target.value)} style={{width:'90px'}} />Count</label>
          <label><input type="number" min="1" max="8760" placeholder="Expires in hours" value={inviteHours} onChange={e => setInviteHours(e.target.value)} style={{width:'140px'}} />Expires in hours</label>
          <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Create</button>
        </form>
        <div style={{marginTop:'12px', maxHeight:'220px', overflowY:'auto'}}>
          <table border="1" cellPadding="6" style={{borderCollapse:'collapse', minWidth:'400px'}}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Token</th>
                <th>Expires</th>
                <th>Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.id}</td>
                  <td>{inv.email}</td>
                  <td style={{fontFamily:'monospace'}}>{inv.token}</td>
                  <td>{new Date(inv.expires_at).toLocaleString()}</td>
                  <td>{inv.used_at ? new Date(inv.used_at).toLocaleString() : ''}</td>
                  <td style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/register?invite=${inv.token}`)} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Copy Link</button>
                    <button onClick={() => handleSendInvite(inv.id)} disabled={!inv.email} title={inv.email ? '' : 'Set email to send'} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Send Email</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:'16px', paddingTop:'12px', borderTop:'1px dashed #ccc'}}>
          <h5>Bulk Invites (CSV)</h5>
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center'}}>
            <input type="file" accept=".csv,text/csv,text/plain" onChange={e => setCsvFile(e.target.files?.[0] || null)} />
            <label><input type="number" min="1" max="8760" value={csvExpires} onChange={e => setCsvExpires(e.target.value)} style={{width:'140px'}} /> Expires in hours</label>
            <label><input type="checkbox" checked={csvSend} onChange={e => setCsvSend(e.target.checked)} /> Send emails immediately</label>
            <button
              onClick={async () => {
                setError(''); setSuccess('');
                if (!csvFile) { setError('Choose a CSV file first.'); return; }
                const fd = new FormData();
                fd.append('file', csvFile);
                fd.append('expires_in_hours', String(csvExpires));
                fd.append('send_immediately', String(csvSend));
                try {
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/invites/bulk-csv', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: fd,
                  });
                  const data = await res.json();
                  if (data && data.success) {
                    setSuccess(`Created ${data.created} invite(s)${csvSend ? ` and sent ${data.sent}` : ''}.`);
                    setCsvFile(null);
                    fetchInvites();
                  } else {
                    setError(data?.error || 'Bulk invite failed');
                  }
                } catch (e) {
                  setError('Network error: ' + e.toString());
                }
              }}
              style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}
            >Upload CSV</button>
          </div>
          <div style={{fontSize:'0.85em', opacity:0.8, marginTop:'6px'}}>
            Accepted formats: a single column of emails (with or without a header named "email"), or a CSV with an "email" column. Max 1000 rows.
          </div>
        </div>
      </div>
      <h4>Members</h4>
      <table border="1" cellPadding="6" style={{borderCollapse:'collapse', minWidth:'400px'}}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Admin</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{editId === m.id ? (
                <input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} />
              ) : m.username}</td>
              <td>{editId === m.id ? (
                <input type="checkbox" checked={editForm.is_admin} onChange={e => setEditForm(f => ({ ...f, is_admin: e.target.checked }))} />
              ) : (m.is_admin ? 'Yes' : 'No')}</td>
              <td>{new Date(m.created_at).toLocaleString()}</td>
              <td>
                {editId === m.id ? (
                  <>
                    <input type="password" placeholder="New password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} />
                    <button onClick={handleUpdate} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px', marginRight:'8px'}}>Save</button>
                    <button onClick={() => setEditId(null)} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Cancel</button>
                  </>
                ) : (
                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => handleEdit(m)} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Edit</button>
                    <button onClick={() => handleDelete(m.id)} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Delete</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
