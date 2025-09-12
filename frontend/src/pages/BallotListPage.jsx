import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

export default function BallotListPage({ branding }) {
  const [ballots, setBallots] = useState([]);
  const [error, setError] = useState('');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/ballots', 'GET', null, token).then(res => {
      if (Array.isArray(res)) {
        let filtered = res;
        if (!isAdmin) {
          const now = new Date();
          filtered = res.filter(b => {
            if (!b.end_time) return true;
            const end = new Date(b.end_time);
            return end > now;
          });
        }
        setBallots(filtered);
      } else setError(res.error || 'Failed to load ballots');
    });
  }, []);

  return (
    <div>
      <h2>Ballots</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <ul>
        {ballots.map(b => (
          <li key={b.id}>
            <a href={`/ballots/${b.id}`}>{b.title}</a>
            <span style={{marginLeft:'12px', fontStyle:'italic', color:'#666'}}>
              {Array.isArray(b.committee_names) && b.committee_names.filter(n => n).length > 0
                ? `Assigned to: ${b.committee_names.filter(n => n).join(', ')}`
                : 'Open to all members'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
