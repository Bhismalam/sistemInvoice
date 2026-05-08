// API Client — centralized fetch wrapper with JWT auth
let BASE_URL = import.meta.env.VITE_API_URL || '/api';
if (BASE_URL.endsWith('/')) {
  BASE_URL = BASE_URL.slice(0, -1);
}

let accessToken = localStorage.getItem('accessToken') || '';
let refreshToken = localStorage.getItem('refreshToken') || '';

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = '';
  refreshToken = '';
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getAccessToken() { return accessToken; }

async function refreshAccessToken() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    accessToken = data.data.accessToken;
    localStorage.setItem('accessToken', accessToken);
    return true;
  } catch {
    clearTokens();
    window.location.hash = '#/login';
    return false;
  }
}

export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers
    },
    ...options
  };

  // Don't stringify if body is FormData
  if (options.body && !(options.body instanceof FormData)) {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  let res = await fetch(url, config);

  // Auto refresh on 401
  if (res.status === 401) {
    if (refreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        config.headers['Authorization'] = `Bearer ${accessToken}`;
        res = await fetch(url, config);
      } else {
        clearTokens();
        window.location.hash = '#/login';
        throw new Error('Sesi telah berakhir, silakan login kembali.');
      }
    } else {
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Sesi telah berakhir, silakan login kembali.');
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || 'Terjadi kesalahan');
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
