import React from 'react';
import { Link } from 'react-router-dom';

export default function NavBar({ branding }) {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  return (
    <nav style={{
      marginBottom: '20px',
      background: branding?.nav_color || '#333',
      color: branding?.text_color || '#fff',
      padding: '8px 16px',
      borderRadius: '8px'
    }}>
      {!token && <><Link to="/">Login</Link> |{' '}<Link to="/register">Register</Link> |{' '}</>}
      {token && <Link to="/ballots">Ballots</Link>}
      {isAdmin && (
        <>
          {' '}| <Link to="/admin">Admin Dashboard</Link>
          {' '}| <Link to="/admin/create-ballot">Create Ballot</Link>
          {' '}| <Link to="/admin/members">Member Management</Link>
          {' '}| <Link to="/admin/branding">Branding</Link>
        </>
      )}
      {token && (
        <>
          {' '}| <button onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('is_admin');
            window.location.href = '/';
          }}>Logout</button>
        </>
      )}
    </nav>
  );
}
