import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.jsx';
import { DateTime } from 'luxon';

export default function EditBallotPage({ branding }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ballot, setBallot] = useState(null);
  const [measures, setMeasures] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/committees', 'GET', null, token).then(setCommittees);
  }, []);
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
        // Set selected committee if assigned
        if (Array.isArray(res.committee_ids) && res.committee_ids.length > 0) {
          setSelectedCommittee(res.committee_ids[0]);
        } else {
          setSelectedCommittee('');
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
    // Send measures as objects with id, title, description if id exists
    const formattedMeasures = measures.filter(m => m.title && m.title.trim()).map((m, idx) => {
      const measureId = ballot.measures && ballot.measures[idx] && ballot.measures[idx].id;
      if (measureId) {
        return { id: measureId, title: m.title, description: m.description };
      } else {
        return { title: m.title, description: m.description };
      }
    });
    const res = await apiRequest(`/ballots/${id}`, 'PUT', {
      title: ballot.title,
      description: ballot.description,
      start_time: ballot.start_time,
      end_time: ballot.end_time,
      quorum: Number(ballot.quorum),
      acceptance_threshold: Number(ballot.acceptance_threshold),
      measures: formattedMeasures
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
    <div style={{
      marginBottom: '2em',
      padding: '2em',
      borderRadius: '12px',
      background: branding?.box_bg_color || branding?.bg_color || '#fff',
      border: `2px solid ${branding?.box_border_color || '#eee'}`,
      boxShadow: `0 2px 8px ${branding?.box_shadow_color || '#ccc'}`,
    }}>
      <h2>Edit Ballot</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'16px', maxWidth:'500px', margin:'0 auto'}}>
        <label>Assign to Committee (optional)<br />
          <select value={selectedCommittee} onChange={e => setSelectedCommittee(e.target.value)} style={{width:'100%'}}>
            <option value="">Open to all members</option>
            {committees.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label>Ballot Title<br />
          <input name="title" placeholder="Title of the ballot (e.g. Board Elections)" value={ballot.title} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <label>Ballot Description<br />
          <textarea name="description" placeholder="Describe the purpose or context of this ballot" value={ballot.description} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <label>Voting Start Time<br />
          <input name="start_time" type="datetime-local" value={ballot.start_time ? DateTime.fromISO(ballot.start_time, { zone: branding?.timezone || 'UTC' }).toFormat("yyyy-MM-dd'T'HH:mm") : ''} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <label>Voting End Time<br />
          <input name="end_time" type="datetime-local" value={ballot.end_time ? DateTime.fromISO(ballot.end_time, { zone: branding?.timezone || 'UTC' }).toFormat("yyyy-MM-dd'T'HH:mm") : ''} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <label>Quorum<br />
          <input name="quorum" type="number" placeholder="Minimum number of votes required" value={ballot.quorum} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <label>Acceptance Threshold (%)<br />
          <input name="acceptance_threshold" type="number" placeholder="Percentage of 'Yes' votes required to pass" value={ballot.acceptance_threshold} onChange={handleChange} style={{width:'100%'}} />
        </label>
        <h4>Ballot Measures</h4>
        {measures.map((m, idx) => (
          <div key={idx} style={{marginBottom: '10px'}}>
            <label>Measure Title<br />
              <input value={m.title} onChange={e => handleMeasureChange(idx, { ...m, title: e.target.value })} placeholder={`Measure ${idx+1} title`} style={{width:'100%'}} />
            </label><br />
            <label>Measure Description<br />
              <textarea value={m.description} onChange={e => handleMeasureChange(idx, { ...m, description: e.target.value })} placeholder={`Describe measure ${idx+1}`} style={{width:'100%'}} />
            </label><br />
            <button type="button" onClick={() => removeMeasure(idx)} disabled={measures.length === 1} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Remove</button>
          </div>
        ))}
        <button type="button" onClick={addMeasure} style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Add Measure</button>
        <br /><br />
        <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Update Ballot</button>
      </form>
      <div style={{marginTop:'8px', color:'red', fontSize:'0.95em'}}>* Required fields: Title, Start Time, End Time, at least one Measure with a title</div>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );
}
