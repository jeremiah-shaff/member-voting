import React, { useState } from 'react';
import { apiRequest } from '../api';

export default function CreateBallotPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quorum, setQuorum] = useState(0);
  const [acceptanceThreshold, setAcceptanceThreshold] = useState(50);
  const [measures, setMeasures] = useState(['']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleMeasureChange = (idx, value) => {
    setMeasures(m => m.map((v, i) => i === idx ? value : v));
  };

  const addMeasure = () => setMeasures([...measures, '']);
  const removeMeasure = idx => setMeasures(measures.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest('/ballots', 'POST', {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      quorum: Number(quorum),
      acceptance_threshold: Number(acceptanceThreshold),
      measures: measures.filter(m => m.trim())
    }, token);
    if (res.ballot_id) {
      setSuccess('Ballot created!');
      setError('');
    } else {
      setError(res.error || 'Creation failed');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Create Ballot</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
        <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
        <input type="number" placeholder="Quorum" value={quorum} onChange={e => setQuorum(e.target.value)} />
        <input type="number" placeholder="Acceptance Threshold (%)" value={acceptanceThreshold} onChange={e => setAcceptanceThreshold(e.target.value)} />
        <h4>Measures</h4>
        {measures.map((m, idx) => (
          <div key={idx}>
            <input value={m} onChange={e => handleMeasureChange(idx, e.target.value)} placeholder={`Measure ${idx+1}`} />
            <button type="button" onClick={() => removeMeasure(idx)} disabled={measures.length === 1}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addMeasure}>Add Measure</button>
        <br />
        <button type="submit">Create Ballot</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
