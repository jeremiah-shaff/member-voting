import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';

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
        {ballots.map(b => {
          // Ballot committee membership check for admin
          let adminIsCommitteeMember = true;
          if (Array.isArray(b.committee_ids) && b.committee_ids.length > 0) {
            const adminCommittees = (localStorage.getItem('committee_ids') || '').split(',').map(Number).filter(Boolean);
            // Only disable if ballot is assigned to committees and admin is not in any
            adminIsCommitteeMember = b.committee_ids.some(cid => adminCommittees.includes(cid));
          } else {
            // Ballot is open to all members, so allow edit
            adminIsCommitteeMember = true;
          }
          return (
            <li key={b.id}>
              {b.title}
              <span style={{marginLeft:'12px', fontStyle:'italic', color:'#666'}}>
                {Array.isArray(b.committee_names) && b.committee_names.filter(n => n).length > 0
                  ? `Assigned to: ${b.committee_names.filter(n => n).join(', ')}`
                  : 'Open to all members'}
              </span>
              <button onClick={() => fetchReport(b.id)} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft:'8px'}} >View Report</button>
              <a href={`/admin/edit-ballot/${b.id}`}>
                <button
                  style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft:'8px'}}
                  disabled={!adminIsCommitteeMember}
                  title={!adminIsCommitteeMember ? 'You are not a member of the relevant committee' : ''}
                >Edit</button>
              </a>
              <button onClick={() => handleDeleteBallot(b.id)} style={{background: 'red', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 12px', marginLeft:'8px'}}>Delete</button>
            </li>
          );
        })}
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
            // Find current paper ballot counts for this measure
            const paperYes = m.votes.find(v => v.value === 'yes' && v.type === 'paper')?.count || 0;
            const paperNo = m.votes.find(v => v.value === 'no' && v.type === 'paper')?.count || 0;
            const paperAbstain = m.votes.find(v => v.value === 'abstain' && v.type === 'paper')?.count || 0;
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
                <div style={{marginTop:'1em'}}>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const token = localStorage.getItem('token');
                    const yes = Number(e.target[`yes_${m.measure_id}`].value);
                    const no = Number(e.target[`no_${m.measure_id}`].value);
                    const abstain = Number(e.target[`abstain_${m.measure_id}`].value);
                    const res = await apiRequest(`/ballots/${selectedBallot}/paper-votes`, 'POST', {
                      measure_id: m.measure_id,
                      yes,
                      no,
                      abstain
                    }, token);
                    if (res.success) {
                      setError('');
                      fetchReport(selectedBallot); // refresh report
                    } else {
                      setError(res.error || 'Failed to record paper votes');
                    }
                  }} style={{display:'flex', gap:'1em', alignItems:'center'}}>
                    <span style={{fontWeight:'bold'}}>Record Paper Ballots:</span>
                    <label>Yes <input type="number" min="0" name={`yes_${m.measure_id}`} defaultValue={paperYes} style={{width:'60px'}} /></label>
                    <label>No <input type="number" min="0" name={`no_${m.measure_id}`} defaultValue={paperNo} style={{width:'60px'}} /></label>
                    <label>Abstain <input type="number" min="0" name={`abstain_${m.measure_id}`} defaultValue={paperAbstain} style={{width:'60px'}} /></label>
                    <button type="submit" style={{background:'#1e4166', color:'#fff', border:'none', borderRadius:'4px', padding:'4px 12px'}}>Save</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
