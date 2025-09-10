import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function MemberManagementPage() {
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ username: '', password: '', is_admin: false });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', is_admin: false });

  const fetchMembers = async () => {
    const token = localStorage.getItem('token');
    const res = await apiRequest('/members', 'GET', null, token);
    if (Array.isArray(res)) setMembers(res);
    else setError(res.error || 'Failed to load members');
  };

  useEffect(() => { fetchMembers(); }, []);

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
        <button type="submit">Add</button>
      </form>
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
                    <button onClick={handleUpdate}>Save</button>
                    <button onClick={() => setEditId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleEdit(m)}>Edit</button>
                    <button onClick={() => handleDelete(m.id)}>Delete</button>
                  </>
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
