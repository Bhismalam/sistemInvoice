// API Client — centralized fetch wrapper with JWT auth
let BASE_URL = import.meta.env.VITE_API_URL || '/api';
if (BASE_URL.endsWith('/')) {
  BASE_URL = BASE_URL.slice(0, -1);
}

let accessToken = sessionStorage.getItem('accessToken') || '';
let refreshToken = sessionStorage.getItem('refreshToken') || '';

export function setTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  sessionStorage.setItem('accessToken', access);
  sessionStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = '';
  refreshToken = '';
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
  sessionStorage.removeItem('company');
}

export function getAccessToken() { return accessToken; }

let isRefreshing = false;
let refreshQueue = [];

async function refreshAccessToken() {
  const currentRefreshToken = sessionStorage.getItem('refreshToken') || refreshToken;
  if (!currentRefreshToken) {
    clearTokens();
    window.location.hash = '#/login';
    return false;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: currentRefreshToken })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    accessToken = data.data.accessToken;
    sessionStorage.setItem('accessToken', accessToken);
    
    // Resolve all waiting requests in the queue with true
    refreshQueue.forEach(resolve => resolve(true));
    refreshQueue = [];
    isRefreshing = false;
    return true;
  } catch {
    // Resolve all waiting requests in the queue with false
    refreshQueue.forEach(resolve => resolve(false));
    refreshQueue = [];
    isRefreshing = false;
    clearTokens();
    window.location.hash = '#/login';
    return false;
  }
}

export async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const currentAccessToken = sessionStorage.getItem('accessToken') || accessToken;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(currentAccessToken && { 'Authorization': `Bearer ${currentAccessToken}` }),
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
    const currentRefreshToken = sessionStorage.getItem('refreshToken') || refreshToken;
    if (currentRefreshToken) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        const latestAccessToken = sessionStorage.getItem('accessToken') || accessToken;
        config.headers['Authorization'] = `Bearer ${latestAccessToken}`;
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
