import React from 'react';
import { Link } from 'react-router-dom';

export default function NavBar() {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  return (
    <nav style={{marginBottom: '20px'}}>
      <Link to="/">Login</Link> |{' '}
      <Link to="/register">Register</Link> |{' '}
      {token && <Link to="/ballots">Ballots</Link>}
      {isAdmin && (
        <>
          {' '}| <Link to="/admin">Admin Dashboard</Link>
          {' '}| <Link to="/admin/create-ballot">Create Ballot</Link>
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
