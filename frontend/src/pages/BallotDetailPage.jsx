import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api';

export default function BallotDetailPage() {
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

  return (
    <div>
      <h2>{ballot.title}</h2>
      <p>{ballot.description}</p>
      <form onSubmit={handleVote}>
        {ballot.measures.map(m => (
          <div key={m.id}>
            <label>{m.measure_text}</label>
            <select onChange={e => setVotes(v => ({ ...v, [m.id]: e.target.value }))}>
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="abstain">Abstain</option>
            </select>
          </div>
        ))}
        <button type="submit">Submit Vote</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
