import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function BallotAdminReportPage({ branding }) {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest(`/ballots/${id}/report`, 'GET', null, token)
      .then(res => {
        setReport(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 600, margin: '2em auto', textAlign: 'center', background: branding?.bg_color || '#fff', borderRadius: 12, boxShadow: '0 2px 8px #ccc', padding: '2em', color: branding?.text_color || '#222' }}>
        <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Ballot Report</h2>
        <p>You must be logged in to view this page.</p>
        <button onClick={() => navigate('/login')} style={{ background: branding?.button_color || '#007bff', color: branding?.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 'bold', marginTop: '1em' }}>Go to Login</button>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (!report) return <div>Report not found.</div>;

  return (
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
                const yes = Number(e.target[`yes_${m.measure_id}`].value);
                const no = Number(e.target[`no_${m.measure_id}`].value);
                const abstain = Number(e.target[`abstain_${m.measure_id}`].value);
                const res = await apiRequest(`/ballots/${id}/paper-votes`, 'POST', {
                  measure_id: m.measure_id,
                  yes,
                  no,
                  abstain
                }, token);
                if (res.success) {
                  setError('');
                  // Refresh report
                  apiRequest(`/ballots/${id}/report`, 'GET', null, token).then(setReport);
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
              {error && <div style={{ color: 'red', marginTop: '1em' }}>{error}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}