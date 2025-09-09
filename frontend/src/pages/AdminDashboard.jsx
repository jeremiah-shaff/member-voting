import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';

export default function AdminDashboard() {
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

  const fetchReport = async (id) => {
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/ballots/${id}/report`, 'GET', null, token);
    setReport(res);
    setSelectedBallot(id);
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <ul>
        {ballots.map(b => (
          <li key={b.id}>
            {b.title} <button onClick={() => fetchReport(b.id)}>View Report</button>
          </li>
        ))}
      </ul>
      {report && (
        <div>
          <h3>Report for Ballot {selectedBallot}</h3>
          <pre>{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
