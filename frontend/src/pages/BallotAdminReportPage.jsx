import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';

export default function BallotAdminReportPage({ branding }) {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest(`/ballots/${id}/results`, 'GET', undefined, token)
      .then(r => {
        setReport(r);
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
    <div style={{ maxWidth: 600, margin: '2em auto', background: branding?.bg_color || '#fff', borderRadius: 12, boxShadow: '0 2px 8px #ccc', padding: '2em', color: branding?.text_color || '#222' }}>
      <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Ballot Report</h2>
      <div style={{ marginBottom: '2em' }}>
        <strong>Ballot Title:</strong> {report.title}<br />
        <strong>Description:</strong> {report.description}
      </div>
      {report.measures && report.measures.map((m, idx) => (
        <div key={m.id || idx} style={{ marginBottom: '1.5em', padding: '1em', border: '1px solid #eee', borderRadius: '8px', background: branding?.nav_color || '#f9f9f9' }}>
          <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '0.5em' }}>{m.measure_text}</div>
          {m.measure_description && <div style={{ marginBottom: '0.5em', color: branding?.text_color || '#555' }}>{m.measure_description}</div>}
          <div>
            <strong>Results:</strong>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {m.results && m.results.map((r, i) => (
                <li key={i} style={{ marginBottom: '0.3em' }}>
                  <span style={{ fontWeight: 'bold' }}>{r.value}:</span> {r.count}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
