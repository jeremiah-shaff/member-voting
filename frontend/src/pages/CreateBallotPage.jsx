import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api.jsx';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quorum, setQuorum] = useState(0);
  const [acceptanceThreshold, setAcceptanceThreshold] = useState(50);
  const [measures, setMeasures] = useState([{ title: '', description: '' }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [committees, setCommittees] = useState([]);
  const [selectedCommittee, setSelectedCommittee] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/committees', 'GET', null, token).then(setCommittees);
  }, []);

  const handleMeasureChange = (idx, value) => {
    setMeasures(m => m.map((v, i) => i === idx ? value : v));
  };

  const addMeasure = () => setMeasures([...measures, { title: '', description: '' }]);
  const removeMeasure = idx => setMeasures(measures.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const ballotRes = await apiRequest('/ballots', 'POST', {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      quorum: Number(quorum),
      acceptance_threshold: Number(acceptanceThreshold),
      measures: measures.filter(m => m.title && m.title.trim()).map(m => `${m.title}||${m.description || ''}`)
    }, token);
    if (ballotRes.ballot_id) {
      // Optionally assign to committee
      if (selectedCommittee) {
        const assignRes = await apiRequest(`/ballots/${ballotRes.ballot_id}/committees`, 'POST', { committee_id: selectedCommittee }, token);
        if (!assignRes.success) {
          setError(assignRes.error || 'Ballot created, but committee assignment failed');
          setSuccess('');
          return;
        }
      }
      setSuccess('Ballot created!');
      setError('');
    } else {
      setError(ballotRes.error || 'Creation failed');
      setSuccess('');
    }
  };

  return (
    <div>
      <h2>Create Ballot</h2>
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
          <input placeholder="Title of the ballot (e.g. Board Elections)" value={title} onChange={e => setTitle(e.target.value)} style={{width:'100%'}} />
        </label>
        <label>Ballot Description<br />
          <textarea placeholder="Describe the purpose or context of this ballot" value={description} onChange={e => setDescription(e.target.value)} style={{width:'100%'}} />
        </label>
        <label>Voting Start Time<br />
          <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={{width:'100%'}} />
        </label>
        <label>Voting End Time<br />
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} style={{width:'100%'}} />
        </label>
        <label>Quorum<br />
          <input type="number" placeholder="Minimum number of votes required" value={quorum} onChange={e => setQuorum(e.target.value)} style={{width:'100%'}} />
        </label>
        <label>Acceptance Threshold (%)<br />
          <input type="number" placeholder="Percentage of 'Yes' votes required to pass" value={acceptanceThreshold} onChange={e => setAcceptanceThreshold(e.target.value)} />
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
        <br /><br />
  <button type="submit" style={{background: (branding?.button_color || '#007bff'), color: (branding?.text_color || '#fff'), border: 'none', borderRadius: '4px', padding: '4px 12px'}}>Create Ballot</button>
      </form>
      {error && <div style={{color:'red'}}>{error}</div>}
      {success && <div style={{color:'green'}}>{success}</div>}
    </div>
  );

