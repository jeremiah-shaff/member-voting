import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api.jsx';
import { DateTime } from 'luxon';

export default function BallotListPage({ branding }) {
  const [ballots, setBallots] = useState([]);
  const [error, setError] = useState('');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  useEffect(() => {
    const token = localStorage.getItem('token');
    apiRequest('/ballots', 'GET', null, token).then(res => {
      if (Array.isArray(res)) {
        let filtered = res;
        if (!isAdmin) {
          const timezone = branding?.timezone || 'UTC';
          const now = DateTime.now().setZone(timezone);
          filtered = res.filter(b => {
            const timezone = branding?.timezone || 'UTC';
            const now = DateTime.now().setZone(timezone);
            // Ballot is listed only if now >= start_time and now < end_time
            if (!b.start_time || !b.end_time) return false;
            const start = DateTime.fromISO(b.start_time, { zone: timezone });
            const end = DateTime.fromISO(b.end_time, { zone: timezone });
            return now >= start && now < end;
          });
        }
        setBallots(filtered);
      } else setError(res.error || 'Failed to load ballots');
    });
  }, []);

  return (
    <div>
      <h2>Ballots</h2>
      {error && <div style={{color:'red'}}>{error}</div>}
      <ul>
        {ballots.map(b => {
          // Ballot expired logic for admin
          let expired = false;
          if (isAdmin && b.end_time) {
            const timezone = branding?.timezone || 'UTC';
            const now = DateTime.now().setZone(timezone);
            const end = b.end_time;
            expired = end <= now;
          }
          return (
            <li key={b.id}>
              <a href={`/ballots/${b.id}`}>{b.title}</a>
              <span style={{marginLeft:'12px', fontStyle:'italic', color:'#666'}}>
                {Array.isArray(b.committee_names) && b.committee_names.filter(n => n).length > 0
                  ? `Assigned to: ${b.committee_names.filter(n => n).join(', ')}`
                  : 'Open to all members'}
              </span>
              {/* Show voted status for members */}
              {b.has_voted && (
                <span style={{marginLeft:'12px', color:'green', fontWeight:'bold'}}>Voted</span>
              )}
              {/* Show expired status for admins */}
              {isAdmin && expired && (
                <span style={{marginLeft:'12px', color:'red', fontWeight:'bold'}}>Expired</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
