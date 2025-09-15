import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api.jsx';
import { DateTime } from 'luxon';

export default function BallotDetailPage({ branding }) {
  const { id } = useParams();
  const [ballot, setBallot] = useState(null);
  const [votes, setVotes] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest(`/ballots/${id}`, 'GET', null, token).then(res => {
      if (res.id) setBallot(res);
      else setError(res.error || 'Failed to load ballot');
    });
  }, [id]);

  const handleVote = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const voteArr = Object.entries(votes).map(([measure_id, vote_value]) => ({ measure_id: Number(measure_id), vote_value }));
    const res = await apiRequest(`/ballots/${id}/vote`, 'POST', { votes: voteArr }, token);
    if (res.success) {
      setSuccess('Vote submitted!');
      setError('');
    } else {
      setError(res.error || 'Voting failed');
      setSuccess('');
    }
  };

  if (!ballot) return <div>Loading...</div>;

  // Ballot expired and not-yet-open logic
  let expired = false;
  let notYetOpen = false;
  if (ballot.end_time && ballot.start_time) {
    const timezone = branding?.timezone || 'UTC';
    const now = DateTime.now().setZone(timezone);
    const start = DateTime.fromISO(ballot.start_time, { zone: timezone });
    const end = DateTime.fromISO(ballot.end_time, { zone: timezone });
    expired = now >= end;
    notYetOpen = now < start;
  }

  return (
    <div>
      <h2>{ballot.title}</h2>
      <p>{ballot.description}</p>
      {ballot.has_voted ? (
        <div style={{color:'green', fontWeight:'bold', marginBottom:'1em'}}>You have already voted on this ballot.</div>
      ) : null}
      <form onSubmit={handleVote}>
        {ballot.measures.map(m => (
          <div key={m.id} style={{marginBottom: '16px'}}>
            <label><strong>{m.measure_text}</strong></label><br />
            {m.measure_description && <div style={{fontStyle:'italic', color:'#555'}}>{m.measure_description}</div>}
            <select onChange={e => setVotes(v => ({ ...v, [m.id]: e.target.value }))} disabled={ballot.has_voted || expired || notYetOpen}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              {/* Only show Abstain if allowed in branding */}
              {branding?.allow_abstain !== false && (
                <option value="Abstain">Abstain</option>
              )}
            </select>
          </div>
        ))}
        <button
          type="submit"
          disabled={ballot.has_voted || expired || notYetOpen}
          style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}
          title={expired ? 'This ballot is expired and cannot be voted on.' : notYetOpen ? 'Voting has not started yet.' : ballot.has_voted ? 'You have already voted.' : ''}
        >Submit Vote</button>
      </form>
      {expired && (
        <div style={{color:'red', fontWeight:'bold', marginTop:'1em'}}>This ballot is expired and cannot be voted on.</div>
      )}
      {notYetOpen && (
        <div style={{color:'orange', fontWeight:'bold', marginTop:'1em'}}>Voting has not started yet for this ballot.</div>
      )}
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
