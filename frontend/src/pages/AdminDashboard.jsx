import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

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
            {' '}<a href={`/admin/edit-ballot/${b.id}`}><button>Edit</button></a>
          </li>
        ))}
      </ul>
      {report && (
        <div style={{marginTop: '2em'}}>
          <h3>Report for Ballot: {report.title}</h3>
          <div>
            Quorum Required: <strong>{report.quorum}</strong><br />
            Acceptance Threshold: <strong>{report.acceptance_threshold}%</strong><br />
            Total Voters: <strong>{report.total_voters}</strong><br />
            Quorum Status: <span style={{
              color: 'white',
              background: report.quorum_met ? 'green' : 'red',
              padding: '2px 8px',
              borderRadius: '8px',
              fontWeight: 'bold'
            }}>{report.quorum_met ? 'Met' : 'Not Met'}</span>
          </div>
          <hr />
          <h4>Measures</h4>
          {report.results.map((m, idx) => {
            const acceptance = report.acceptance.find(a => a.measure_id === m.measure_id)?.accepted;
            const totalVotes = m.votes.reduce((sum, v) => sum + v.count, 0);
            return (
              <div key={m.measure_id} style={{marginBottom: '2em', border: '1px solid #ccc', borderRadius: '8px', padding: '1em'}}>
                <div style={{fontWeight:'bold'}}>{m.measure_text}</div>
                <div style={{marginBottom:'0.5em'}}>Accepted: <span style={{color: acceptance ? 'green' : 'red', fontWeight:'bold'}}>{acceptance ? 'Yes' : 'No'}</span></div>
                <div style={{display:'flex', gap:'1em'}}>
                  {['yes','no','abstain'].map(voteType => {
                    const vote = m.votes.find(v => v.value === voteType);
                    const count = vote ? vote.count : 0;
                    return (
                      <div key={voteType} style={{textAlign:'center'}}>
                        <div style={{fontWeight:'bold'}}>{voteType.charAt(0).toUpperCase()+voteType.slice(1)}</div>
                        <div style={{
                          background:'#007bff',
                          height:'24px',
                          width: Math.max(30, (count/Math.max(1,totalVotes))*120),
                          color:'white',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          borderRadius:'4px',
                          margin:'4px 0'
                        }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:'0.9em', color:'#555'}}>Total votes: {totalVotes}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
