import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';

export default function BallotListPage() {
  const [ballots, setBallots] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/ballots', 'GET', null, token).then(res => {
      if (Array.isArray(res)) setBallots(res);
      else setError(res.error || 'Failed to load ballots');
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
          </li>
        ))}
      </ul>
    </div>
  );
}
