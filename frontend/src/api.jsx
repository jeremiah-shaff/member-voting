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
