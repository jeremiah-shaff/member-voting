// Basic API client for member-voting backend
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function apiRequest(path, method = 'GET', body, token) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    // Try to parse error message
    let errorMsg = '';
    try {
      const data = await res.clone().json();
      errorMsg = data.error || '';
    } catch {}
    // If login failed due to bad credentials, do NOT redirect
    if (path === '/auth/login' && errorMsg && errorMsg.toLowerCase().includes('invalid credentials')) {
      return { error: errorMsg || 'Invalid credentials' };
    }
    // Token expired or invalid, redirect to login
    localStorage.removeItem('token');
    window.location.href = '/';
    return { error: 'Authentication required' };
  }
  if (res.status === 403) {
    // Forbidden, just return error for UI
    return { error: 'You are not authorized to perform this action.' };
  }
  return res.json();
}

export async function getRegistrationEnabled() {
  const res = await fetch('/api/registration-enabled');
  if (!res.ok) throw new Error('Failed to fetch registration status');
  return (await res.json()).enabled;
}
export async function setRegistrationEnabled(enabled) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/registration-enabled', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ enabled }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to update registration status');
  return (await res.json()).enabled;
}

export async function changePassword(oldPassword, newPassword) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ oldPassword, newPassword }),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to change password');
  }
  return await res.json();
}
