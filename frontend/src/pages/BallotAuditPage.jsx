import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function BallotAuditPage({ branding }) {
  const { id } = useParams();
  const [voters, setVoters] = useState([]);
  const [paperVotes, setPaperVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest(`/ballots/${id}/audit`, 'GET', null, token)
      .then(res => {
        setVoters(res.voters || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load audit data');
        setLoading(false);
      });
    // Fetch paper ballot summary
    apiRequest(`/ballots/${id}/report`, 'GET', null, token)
      .then(res => {
        if (res && res.results) {
          // Extract paper votes per measure
          const paperSummary = res.results.map(measure => {
            const paperVotes = measure.votes.filter(v => v.value === 'yes' || v.value === 'no' || v.value === 'abstain');
            return {
              measure_text: measure.measure_text,
              votes: paperVotes
            };
          });
          setPaperVotes(paperSummary);
        }
      });
  }, [id, isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 600, margin: '2em auto', textAlign: 'center', background: branding?.box_bg_color || branding?.bg_color || '#fff', borderRadius: 12, boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`, border: `2px solid ${branding?.box_border_color || '#eee'}`, padding: '2em', color: branding?.text_color || '#222' }}>
        <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Ballot Audit</h2>
        <p>You must be logged in as an admin to view this page.</p>
        <button onClick={() => navigate('/login')} style={{ background: branding?.button_color || '#007bff', color: branding?.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 'bold', marginTop: '1em' }}>Go to Login</button>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ maxWidth: 600, margin: '2em auto', background: branding?.box_bg_color || branding?.bg_color || '#fff', borderRadius: 12, boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`, border: `2px solid ${branding?.box_border_color || '#eee'}`, padding: '2em', color: branding?.text_color || '#222' }}>
      <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Ballot Audit</h2>
      <p>This report lists all members who voted on this ballot. No vote values are shown.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {voters.length === 0 ? (
          <li>No votes have been cast for this ballot.</li>
        ) : (
          voters.map(v => (
            <li key={v.id} style={{ marginBottom: '1em', border: `1px solid ${branding?.box_border_color || '#ccc'}`, borderRadius: '8px', background: branding?.box_bg_color || '#f9f9f9', boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`, padding: '1em' }}>
              <strong>{v.username}</strong><br />
              <span style={{ fontSize: '0.9em', color: branding?.text_color || '#555' }}>Voted at: {new Date(v.created_at).toLocaleString()}</span>
            </li>
          ))
        )}
      </ul>
      <h3 style={{ marginTop: '2em', color: branding?.nav_text_color || branding?.text_color || '#222' }}>Paper Ballots Recorded</h3>
      {paperVotes.length === 0 ? (
        <p>No paper ballots have been recorded for this ballot.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {paperVotes.map((measure, idx) => (
            <li key={idx} style={{ marginBottom: '1em', border: `1px solid ${branding?.box_border_color || '#ccc'}`, borderRadius: '8px', background: branding?.box_bg_color || '#f9f9f9', boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`, padding: '1em' }}>
              <strong>{measure.measure_text}</strong>
              <ul style={{ listStyle: 'none', paddingLeft: '1em' }}>
                {measure.votes.map((v, i) => (
                  <li key={i} style={{ color: branding?.text_color || '#555' }}>{v.value}: {v.count}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
