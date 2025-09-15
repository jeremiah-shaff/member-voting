import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';
import { Link } from 'react-router-dom';

export default function AdminDashboard({ branding }) {
  const handleDeleteBallot = async (id) => {
    if (!window.confirm('Delete this ballot and all related measures and votes?')) return;
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/ballots/${id}`, 'DELETE', null, token);
    if (res.success) {
      setBallots(ballots => ballots.filter(b => b.id !== id));
      setError('');
      if (selectedBallot === id) setReport(null);
    } else {
      setError(res.error || 'Delete failed');
    }
  };
  const [ballots, setBallots] = useState([]);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [selectedBallot, setSelectedBallot] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/ballots', 'GET', null, token).then(res => {
      if (Array.isArray(res)) setBallots(res);
      else setError(res.error || 'Failed to load ballots');
    });
  }, []);

  return (
    <div>
      <h2>Ballot Reports</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <ul>
        {ballots.map(b => {
          // Disable Edit button if is_visible is false
          return (
            <li key={b.id}>
              <Link to={`/admin/ballot/${b.id}/report`} style={{
                  fontWeight: 'bold',
                }}>{b.title}</Link>
              <span style={{marginLeft:'12px', fontStyle:'italic', color:'#666'}}>
                {Array.isArray(b.committee_names) && b.committee_names.filter(n => n).length > 0
                  ? `Assigned to: ${b.committee_names.filter(n => n).join(', ')}`
                  : 'Open to all members'}
              </span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                <Link to={`/admin/ballot/${b.id}/qr`} style={{
                  background: branding?.button_color || '#1976d2',
                  color: branding?.text_color || '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  minWidth: '70px',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}>Live</Link>
                <Link to={`/admin/ballot/${b.id}/audit`} style={{
                  background: branding?.button_color || '#6c757d',
                  color: branding?.text_color || '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  minWidth: '70px',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                }}>Audit</Link>
                {b.is_visible === false ? (
                  <span
                    aria-disabled="true"
                    title="You do not have permission to edit this ballot."
                    style={{
                      background: (branding?.button_color || '#007bff'),
                      color: branding?.text_color || '#fff',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      fontWeight: 'bold',
                      minWidth: '70px',
                      textAlign: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                  >Edit</span>
                ) : (
                  <Link to={`/admin/edit-ballot/${b.id}`} style={{
                    background: branding?.button_color || '#007bff',
                    color: branding?.text_color || '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    minWidth: '70px',
                    textAlign: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}>Edit</Link>
                )}
                <button onClick={() => handleDeleteBallot(b.id)} style={{background: 'red', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft:'8px'}}>Delete</button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
