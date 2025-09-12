import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function CommitteeManagementPage({ branding }) {
  const [committees, setCommittees] = useState([]);
  const [members, setMembers] = useState([]);
  const [ballots, setBallots] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState(null);
  const [committeeForm, setCommitteeForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/committees', 'GET', null, token).then(setCommittees);
    apiRequest('/members', 'GET', null, token).then(setMembers);
    apiRequest('/ballots', 'GET', null, token).then(setBallots);
  }, []);

  const handleCreateCommittee = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest('/committees', 'POST', committeeForm, token);
    if (res.id) {
      setSuccess('Committee created!');
      setError('');
      setCommitteeForm({ name: '', description: '' });
      apiRequest('/committees', 'GET', null, token).then(setCommittees);
    } else {
      setError(res.error || 'Create failed');
      setSuccess('');
    }
  };

  const handleAssignMember = async (committeeId, memberId) => {
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/committees/${committeeId}/members`, 'POST', { member_id: memberId }, token);
    if (res.success) {
      setSuccess('Member assigned!');
      setError('');
    } else {
      setError(res.error || 'Assign failed');
      setSuccess('');
    }
  };

  const handleAssignBallot = async (committeeId, ballotId) => {
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/ballots/${ballotId}/committees`, 'POST', { committee_id: committeeId }, token);
    if (res.success) {
      setSuccess('Ballot assigned!');
      setError('');
    } else {
      setError(res.error || 'Assign failed');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Committee Management</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
      <form onSubmit={handleCreateCommittee} style={{marginBottom:'2em'}}>
        <label>Name <input value={committeeForm.name} onChange={e => setCommitteeForm(f => ({ ...f, name: e.target.value }))} /></label><br />
        <label>Description <input value={committeeForm.description} onChange={e => setCommitteeForm(f => ({ ...f, description: e.target.value }))} /></label><br />
        <button type="submit" style={{background: branding?.button_color || '#007bff', color: branding?.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginTop:'8px'}}>Create Committee</button>
      </form>
      <h3>Committees</h3>
      <ul>
        {committees.map(c => (
          <li key={c.id}>
            <strong>{c.name}</strong> - {c.description}
            <div>
              <h4>Assign Members</h4>
              <ul>
                {members.map(m => (
                  <li key={m.id}>
                    {m.username}
                    <button onClick={() => handleAssignMember(c.id, m.id)} style={{marginLeft:'8px'}}>Assign</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Assign Ballots</h4>
              <ul>
                {ballots.map(b => (
                  <li key={b.id}>
                    {b.title}
                    <button onClick={() => handleAssignBallot(c.id, b.id)} style={{marginLeft:'8px'}}>Assign</button>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
