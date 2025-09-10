import React from 'react';
import { Link } from 'react-router-dom';

export default function NavBar({ branding }) {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  const navStyle = {
    marginBottom: '20px',
    background: branding?.nav_color || '#333',
    color: branding?.nav_text_color || branding?.text_color || '#fff',
    padding: '8px 16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: '48px',
  };

  const linkStyle = {
    color: branding?.nav_text_color || branding?.text_color || '#fff',
    textDecoration: 'none',
    fontWeight: 'bold',
    margin: '0 16px',
    display: 'inline-block',
  };

  const buttonStyle = {
    background: branding?.button_color || '#007bff',
    color: branding?.nav_text_color || branding?.text_color || '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    marginLeft: '4px',
    cursor: 'pointer'
  };

  return (
    <nav style={navStyle}>
      {!token && <><Link to="/" style={linkStyle}>Login</Link> |{' '}<Link to="/register" style={linkStyle}>Register</Link> |{' '}</>}
      {token && <Link to="/ballots" style={linkStyle}>Ballots</Link>}
      {isAdmin && (
        <>
          {' '}| <Link to="/admin" style={linkStyle}>Admin Dashboard</Link>
          {' '}| <Link to="/admin/create-ballot" style={linkStyle}>Create Ballot</Link>
          {' '}| <Link to="/admin/members" style={linkStyle}>Member Management</Link>
          {' '}| <Link to="/admin/branding" style={linkStyle}>Branding</Link>
        </>
      )}
      {token && (
        <>
          {' '}| <button style={buttonStyle} onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('is_admin');
            window.location.href = '/';
          }}>Logout</button>
        </>
      )}
    </nav>
  );
}
