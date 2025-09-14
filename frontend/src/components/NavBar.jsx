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

  const links = [];
  if (!token) {
    links.push(<Link key="login" to="/" style={linkStyle}>Login</Link>);
    links.push(<Link key="register" to="/register" style={linkStyle}>Register</Link>);
  }
  if (token) {
    links.push(<Link key="ballots" to="/ballots" style={linkStyle}>Vote</Link>);
  }
  if (isAdmin) {
    links.push(<Link key="admin" to="/admin" style={linkStyle}>Ballots</Link>);
    links.push(<Link key="create-ballot" to="/admin/create-ballot" style={linkStyle}>Create Ballot</Link>);
    links.push(<Link key="members" to="/admin/members" style={linkStyle}>Member Management</Link>);
    links.push(<Link key="committees" to="/admin/committees" style={linkStyle}>Committees</Link>);
    links.push(<Link key="branding" to="/admin/branding" style={linkStyle}>Branding</Link>);
  }
  if (token && !isAdmin) {
    links.push(
      <Link key="change-password" to="/change-password" style={linkStyle}>
        Change Password
      </Link>
    );
  }
  if (token) {
    links.push(<button key="logout" style={buttonStyle} onClick={() => {
      localStorage.removeItem('token');
      localStorage.removeItem('is_admin');
      window.location.href = '/';
    }}>Logout</button>);
  }
  return (
    <nav style={navStyle}>
      {links.map((link, idx) => (
        <span key={idx} style={{marginRight: idx < links.length - 1 ? '16px' : '0'}}>{link}</span>
      ))}
    </nav>
  );
}
