import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.jsx';

export default function EditBallotPage({ branding }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ballot, setBallot] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest(`/ballots/${id}`, 'GET', null, token).then(res => {
      if (res.id) {
        setBallot(res);
        // Parse measures from API response
        if (Array.isArray(res.measures)) {
          setMeasures(res.measures.map(m => ({
            title: m.measure_text || '',
            description: m.measure_description || ''
          })));
        } else {
          setMeasures([]);
        }
      } else setError(res.error || 'Failed to load ballot');
    });
  }, [id]);

  // Measures editing handlers
  const handleMeasureChange = (idx, value) => {
    setMeasures(m => m.map((v, i) => i === idx ? value : v));
  };

  const addMeasure = () => setMeasures([...measures, { title: '', description: '' }]);
  const removeMeasure = idx => setMeasures(measures.filter((_, i) => i !== idx));

  const handleChange = e => {
    setBallot({ ...ballot, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await apiRequest(`/ballots/${id}`, 'PUT', {
      title: ballot.title,
      description: ballot.description,
      start_time: ballot.start_time,
      end_time: ballot.end_time,
      quorum: Number(ballot.quorum),
      acceptance_threshold: Number(ballot.acceptance_threshold),
      measures: measures.filter(m => m.title && m.title.trim()).map(m => `${m.title}||${m.description || ''}`)
    }, token);
    if (res.id) {
      setSuccess('Ballot updated!');
      setError('');
      setTimeout(() => navigate(`/ballots/${id}`), 1000);
    } else {
      setError(res.error || 'Update failed');
      setSuccess('');
    }
  };

  if (!ballot) return <div>Loading...</div>;

  return (
    <div>
      <h2>Edit Ballot</h2>
      <form onSubmit={handleSubmit}>
        <label>Ballot Title<br />
          <input name="title" placeholder="Title of the ballot (e.g. Board Elections)" value={ballot.title} onChange={handleChange} />
        </label><br />
        <label>Ballot Description<br />
          <textarea name="description" placeholder="Describe the purpose or context of this ballot" value={ballot.description} onChange={handleChange} />
        </label><br />
        <label>Voting Start Time<br />
          <input name="start_time" type="datetime-local" value={ballot.start_time?.slice(0,16)} onChange={handleChange} />
        </label><br />
        <label>Voting End Time<br />
          <input name="end_time" type="datetime-local" value={ballot.end_time?.slice(0,16)} onChange={handleChange} />
        </label><br />
        <label>Quorum<br />
          <input name="quorum" type="number" placeholder="Minimum number of votes required" value={ballot.quorum} onChange={handleChange} />
        </label><br />
        <label>Acceptance Threshold (%)<br />
          <input name="acceptance_threshold" type="number" placeholder="Percentage of 'Yes' votes required to pass" value={ballot.acceptance_threshold} onChange={handleChange} />
        </label><br />
        <h4>Ballot Measures</h4>
        {measures.map((m, idx) => (
          <div key={idx} style={{marginBottom: '10px'}}>
            <label>Measure Title<br />
              <input value={m.title} onChange={e => handleMeasureChange(idx, { ...m, title: e.target.value })} placeholder={`Measure ${idx+1} title`} />
            </label><br />
            <label>Measure Description<br />
              <textarea value={m.description} onChange={e => handleMeasureChange(idx, { ...m, description: e.target.value })} placeholder={`Describe measure ${idx+1}`} />
            </label><br />
            <button type="button" onClick={() => removeMeasure(idx)} disabled={measures.length === 1} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Remove</button>
          </div>
        ))}
  <button type="button" onClick={addMeasure} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Add Measure</button>
        <br />
  <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Update Ballot</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
