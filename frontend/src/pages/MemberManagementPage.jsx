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
  const [allowAbstain, setAllowAbstain] = useState(true);

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    const res = await apiRequest('/members', 'GET', null, token);
    if (Array.isArray(res)) setMembers(res);
    else setError(res.error || 'Failed to load members');
  };

  useEffect(() => { fetchMembers(); }, []);

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabledState);
  }, []);

  useEffect(() => {
      setAllowAbstain(branding.allow_abstain !== false);
  }, []);

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
    const updated = { ...branding, allow_abstain: !allowAbstain };
    await apiRequest('/branding', 'PUT', updated, localStorage.getItem('token'));
    setAllowAbstain(!allowAbstain);
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
