// Toast notification system
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Simple SPA Router
export class Router {
  constructor() {
    this.routes = {};
    this.currentPage = null;
    window.addEventListener('hashchange', () => this.navigate());
  }

  add(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    if (path) window.location.hash = path;
    const fullHash = window.location.hash.slice(1) || '/login';
    const hashPath = fullHash.split('?')[0]; // Strip query params for routing
    const hashParts = hashPath.split('/').filter(Boolean);
    const firstSegment = '/' + (hashParts[0] || 'login');

    // Check auth
    const publicRoutes = ['/login', '/register', '/forgot-password', '/pay'];
    const isPublic = publicRoutes.some(r => firstSegment.startsWith(r));
    const isLoggedIn = !!localStorage.getItem('accessToken');

    if (!isPublic && !isLoggedIn) {
      window.location.hash = '#/login';
      return;
    }
    if ((firstSegment === '/login' || firstSegment === '/register') && isLoggedIn) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Find matching route — try EXACT match first (e.g. /invoices/new)
    let handler = this.routes[hashPath];
    let routeParams = {};

    if (!handler) {
      // Try parameterized routes like /invoices/:id
      // Sort routes by specificity (more segments first, non-param segments first)
      const sortedRoutes = Object.entries(this.routes).sort((a, b) => {
        const aHasParam = a[0].includes(':');
        const bHasParam = b[0].includes(':');
        if (aHasParam !== bHasParam) return aHasParam ? 1 : -1;
        return b[0].split('/').length - a[0].split('/').length;
      });

      for (const [pattern, h] of sortedRoutes) {
        const patternParts = pattern.split('/').filter(Boolean);
        if (patternParts.length !== hashParts.length) continue;
        let match = true;
        const p = {};
        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith(':')) {
            p[patternParts[i].slice(1)] = hashParts[i];
          } else if (patternParts[i] !== hashParts[i]) {
            match = false;
            break;
          }
        }
        if (match) { handler = h; routeParams = p; break; }
      }
    }

    if (handler) {
      const content = document.getElementById('app');
      content.innerHTML = '';
      const isAuthPage = ['/login', '/register', '/forgot-password'].includes(firstSegment);
      content.className = isAuthPage ? '' : 'app-layout';
      handler(content, routeParams);
    }
  }

  start() {
    if (!window.location.hash) window.location.hash = '#/login';
    this.navigate();
  }
}
