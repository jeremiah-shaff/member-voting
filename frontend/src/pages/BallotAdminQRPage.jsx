import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { apiRequest } from '../api';

export default function BallotAdminQRPage({ branding }) {
  const { id } = useParams();
  const [ballot, setBallot] = useState(null);
  const [loading, setLoading] = useState(true);
  const ballotUrl = `${window.location.origin}/ballot/${id}`;
  const reportUrl = `/admin/ballot/${id}/report`;
  const navigate = useNavigate();

  // Check authentication
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  useEffect(() => {
    if (!isAuthenticated) return;
    apiRequest(`/ballots/${id}`, 'GET', undefined, token)
      .then(b => {
        setBallot(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, isAuthenticated, token]);

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 500, margin: '2em auto', textAlign: 'center', background: branding?.bg_color || '#fff', borderRadius: 12, boxShadow: '0 2px 8px #ccc', padding: '2em', color: branding?.text_color || '#222' }}>
        <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Live Voting QR Code</h2>
        <p>You must be logged in to view this page.</p>
        <button onClick={() => navigate('/login')} style={{ background: branding?.button_color || '#007bff', color: branding?.text_color || '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontWeight: 'bold', marginTop: '1em' }}>Go to Login</button>
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (!ballot) return <div>Ballot not found.</div>;

  return (
    <div style={{
      maxWidth: 500,
      margin: '2em auto',
      textAlign: 'center',
      background: branding?.bg_color || '#fff',
      borderRadius: 12,
      boxShadow: '0 2px 8px #ccc',
      padding: '2em',
      color: branding?.text_color || '#222',
    }}>
      <h2 style={{ color: branding?.nav_text_color || branding?.text_color || '#222' }}>Live Voting QR Code</h2>
      <p>Members can scan this QR code to quickly access the ballot during a live vote.</p>
      <div style={{ background: branding?.bg_color || '#fff', padding: '16px', display: 'inline-block', borderRadius: '8px' }}>
        <QRCode value={ballotUrl} size={220} fgColor={branding?.nav_text_color || '#222'} />
      </div>
      <div style={{ marginTop: '1.5em' }}>
        <Link to={reportUrl} style={{
          fontWeight: 'bold',
          color: branding?.button_color || '#1976d2',
          textDecoration: 'none',
          fontSize: '1.1em',
          borderRadius: '4px',
          padding: '8px 16px',
          background: branding?.nav_color || '#f5f5f5',
          display: 'inline-block',
        }}>
          View Ballot Report
        </Link>
      </div>
    </div>
  );
}
