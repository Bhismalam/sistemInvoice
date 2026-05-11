import { getInitials } from '../utils/format.js';

// The menu structure is now hardcoded below since it has categories

export function renderLayout(container, activePage) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const company = JSON.parse(localStorage.getItem('company') || '{}');
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  const currentPath = window.location.hash;

  container.innerHTML = `
    <aside class="sidebar ${collapsed ? 'collapsed' : ''}" id="sidebar">
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">IF</div>
        <div class="sidebar__logo-text"><span>Invoice</span>Flow</div>
      </div>
      <nav class="sidebar__nav">
        <div class="sidebar__section-label">Menu</div>
          <a href="#/dashboard" class="nav-item ${currentPath === '/dashboard' ? 'active' : ''}">
            <span class="nav-item__icon">📊</span>
            <span class="nav-item__text">Dashboard</span>
          </a>
          
          <div class="sidebar__divider"></div>
          
          <!-- Penjualan Dropdown -->
          <div class="nav-group ${currentPath.startsWith('#/sales') ? 'open active' : ''}">
            <button class="nav-group-toggle">
              <span class="nav-item__icon">💼</span>
              <span class="nav-item__text">Penjualan</span>
              <span class="nav-group-chevron">▼</span>
            </button>
            <div class="nav-group-menu">
              <a href="#/sales/orders" class="nav-item ${currentPath.startsWith('#/sales/orders') ? 'active' : ''}">
                <span class="nav-item__icon">📝</span>
                <span class="nav-item__text">Order Penjualan</span>
              </a>
              <a href="#/sales/invoices" class="nav-item ${currentPath.startsWith('#/sales/invoices') ? 'active' : ''}">
                <span class="nav-item__icon">📄</span>
                <span class="nav-item__text">Invoice Penjualan</span>
              </a>
              <a href="#/sales/receipts" class="nav-item ${currentPath.startsWith('#/sales/receipts') ? 'active' : ''}">
                <span class="nav-item__icon">🧾</span>
                <span class="nav-item__text">Kuitansi Penjualan</span>
              </a>
              <a href="#/sales/debts" class="nav-item ${currentPath.startsWith('#/sales/debts') ? 'active' : ''}">
                <span class="nav-item__icon">💳</span>
                <span class="nav-item__text">Piutang & Pengingat</span>
              </a>
            </div>
          </div>

          <!-- Pembelian Dropdown -->
          <div class="nav-group ${currentPath.startsWith('#/purchases') ? 'open active' : ''}">
            <button class="nav-group-toggle">
              <span class="nav-item__icon">🛒</span>
              <span class="nav-item__text">Pembelian</span>
              <span class="nav-group-chevron">▼</span>
            </button>
            <div class="nav-group-menu">
              <a href="#/purchases/orders" class="nav-item ${currentPath.startsWith('#/purchases/orders') ? 'active' : ''}">
                <span class="nav-item__icon">📦</span>
                <span class="nav-item__text">Order Pembelian</span>
              </a>
              <a href="#/purchases/invoices" class="nav-item ${currentPath.startsWith('#/purchases/invoices') ? 'active' : ''}">
                <span class="nav-item__icon">📥</span>
                <span class="nav-item__text">Invoice Pembelian</span>
              </a>
              <a href="#/purchases/receipts" class="nav-item ${currentPath.startsWith('#/purchases/receipts') ? 'active' : ''}">
                <span class="nav-item__icon">🧾</span>
                <span class="nav-item__text">Kuitansi Pembelian</span>
              </a>
              <a href="#/purchases/debts" class="nav-item ${currentPath.startsWith('#/purchases/debts') ? 'active' : ''}">
                <span class="nav-item__icon">💳</span>
                <span class="nav-item__text">Manajemen Hutang</span>
              </a>
            </div>
          </div>

          <div class="sidebar__divider"></div>
          
          <a href="#/contacts" class="nav-item ${currentPath.startsWith('#/contacts') ? 'active' : ''}">
            <span class="nav-item__icon">👥</span>
            <span class="nav-item__text">Mitra / Kontak</span>
          </a>
          <a href="#/products" class="nav-item ${currentPath.startsWith('#/products') ? 'active' : ''}">
            <span class="nav-item__icon">📦</span>
            <span class="nav-item__text">Produk</span>
          </a>
          <a href="#/reports" class="nav-item ${currentPath.startsWith('#/reports') ? 'active' : ''}">
            <span class="nav-item__icon">📈</span>
            <span class="nav-item__text">Laporan</span>
          </a>
          
          <div class="sidebar__divider"></div>
          
          <a href="#/settings" class="nav-item ${currentPath.startsWith('#/settings') ? 'active' : ''}">
            <span class="nav-item__icon">⚙️</span>
            <span class="nav-item__text">Pengaturan Akun</span>
          </a>
          <a href="#/company" class="nav-item ${currentPath.startsWith('#/company') ? 'active' : ''}">
            <span class="nav-item__icon">🏢</span>
            <span class="nav-item__text">Perusahaan</span>
          </a>
        </nav>
      <div class="sidebar__footer">
        <a class="nav-item" href="#" id="logout-btn">
          <span class="nav-item__icon">🚪</span>
          <span class="nav-item__label">Keluar</span>
        </a>
      </div>
    </aside>

    <div style="flex:1;display:flex;flex-direction:column;margin-left:${collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'};transition:margin-left var(--transition-base);" id="main-wrapper">
      <header class="header" style="left:${collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}">
        <button class="header__toggle" id="sidebar-toggle">☰</button>
        <div class="header__search" style="position:relative;">
          <span class="header__search-icon">🔍</span>
          <input type="text" placeholder="Cari dokumen, invoice, kontak..." id="global-search" autocomplete="off" />
          <div class="search-dropdown" id="search-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); box-shadow:0 8px 24px rgba(0,0,0,0.5); margin-top:0.5rem; z-index:1000; max-height:400px; overflow-y:auto;">
            <!-- Results injected here -->
          </div>
        </div>
        <div class="header__actions">
          <button class="header__toggle" id="theme-btn" title="Ganti Tema">
            ${localStorage.getItem('theme') === 'light' ? '🌙' : '☀️'}
          </button>
          <div class="header__notification-wrapper" style="position:relative;">
            <button class="header__notification" id="notification-btn">
              🔔<span class="header__notification-dot" id="notification-badge" style="display:none;"></span>
            </button>
            <div class="notification-dropdown" id="notification-dropdown">
              <div class="notification-header">
                <h3>Notifikasi</h3>
                <button class="notification-mark-read" id="notification-mark-read" style="display:none;">Tandai dibaca</button>
              </div>
              <div class="notification-list" id="notification-list">
                <div class="notification-empty">Memuat...</div>
              </div>
            </div>
          </div>
          <button class="header__profile" id="profile-btn">
            <div class="header__avatar">${getInitials(user.name || 'U')}</div>
            <div class="header__profile-info">
              <span class="header__username">${user.name || 'User'}</span>
              ${company.name ? `<span class="header__company-name">${company.name}</span>` : ''}
            </div>
          </button>
        </div>
      </header>
      <main class="main-content" id="page-content" style="margin-left:0;margin-top:var(--header-height);">
      </main>
    </div>
  `;

  // Search logic
  const searchInput = document.getElementById('global-search');
  const searchDropdown = document.getElementById('search-dropdown');
  let searchTimeout;

  if (searchInput && searchDropdown) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchTimeout);
      if (q.length < 2) {
        searchDropdown.style.display = 'none';
        return;
      }
      searchTimeout = setTimeout(async () => {
        try {
          const { api } = await import('../utils/api.js');
          const { formatCurrency, formatDate } = await import('../utils/format.js');
          const res = await api(`/search?q=${encodeURIComponent(q)}`);
          if (res.data && res.data.length > 0) {
            searchDropdown.innerHTML = res.data.map(item => `
              <a href="#/${item.transaction_type === 'sales' ? 'sales' : 'purchases'}/${item.document_type === 'invoice' ? 'invoices' : 'orders'}/${item.id}" class="search-result-item" style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; border-bottom:1px solid var(--border-color); text-decoration:none; color:inherit; background:var(--bg-secondary);" onmouseover="this.style.background='var(--bg-elevated)'" onmouseout="this.style.background='var(--bg-secondary)'">
                <div>
                  <div style="font-weight:600; margin-bottom:0.25rem;">${item.document_number}</div>
                  <div style="font-size:0.875rem; color:var(--text-secondary);">${item.contact_name || 'Tanpa Kontak'} • ${formatDate(item.issue_date)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:600; color:var(--primary-color);">${formatCurrency(item.total)}</div>
                  <span class="badge badge--${item.status}" style="font-size:0.75rem;">${item.status.toUpperCase()}</span>
                </div>
              </a>
            `).join('');
            searchDropdown.style.display = 'block';
          } else {
            searchDropdown.innerHTML = '<div style="padding:1rem; text-align:center; color:var(--text-secondary);">Tidak ada hasil ditemukan.</div>';
            searchDropdown.style.display = 'block';
          }
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 300);
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
      }
    });
  }

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const header = container.querySelector('.header');
    const wrapper = document.getElementById('main-wrapper');
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
    header.style.left = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
    wrapper.style.marginLeft = isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)';
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { clearTokens } = await import('../utils/api.js');
    clearTokens();
    window.location.hash = '#/login';
  });

  // Theme Toggle
  document.getElementById('theme-btn')?.addEventListener('click', (e) => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    e.target.textContent = isLight ? '🌙' : '☀️';
  });

  // Nav Group Dropdown Toggle
  container.querySelectorAll('.nav-group-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const group = btn.closest('.nav-group');
      group.classList.toggle('open');
      
      // If sidebar is collapsed, open it when a dropdown is clicked
      const sidebar = document.getElementById('sidebar');
      if (sidebar.classList.contains('collapsed')) {
        document.getElementById('sidebar-toggle')?.click();
      }
    });
  });

  // Notifications logic
  const notifBtn = document.getElementById('notification-btn');
  const notifDropdown = document.getElementById('notification-dropdown');
  const notifList = document.getElementById('notification-list');
  const notifBadge = document.getElementById('notification-badge');
  const markReadBtn = document.getElementById('notification-mark-read');
  let notificationsLoaded = false;

  const fetchNotifications = async () => {
    try {
      const { api } = await import('../utils/api.js');
      const { timeAgo } = await import('../utils/format.js');
      const res = await api('/notifications');
      
      if (res.success && res.data) {
        const { notifications, unreadCount } = res.data;
        
        // Update badge
        if (unreadCount > 0) {
          notifBadge.style.display = 'block';
          markReadBtn.style.display = 'block';
        } else {
          notifBadge.style.display = 'none';
          markReadBtn.style.display = 'none';
        }

        // Render list
        if (notifications.length === 0) {
          notifList.innerHTML = '<div class="notification-empty">Belum ada notifikasi baru</div>';
        } else {
          notifList.innerHTML = notifications.map(n => {
            let iconClass = 'create';
            let iconStr = '➕';
            const actionStr = n.action.toLowerCase();
            if (actionStr.includes('update') || actionStr.includes('changed status')) { iconClass = 'update'; iconStr = '✏️'; }
            if (actionStr.includes('delete') || actionStr.includes('cancel')) { iconClass = 'delete'; iconStr = '🗑️'; }
            if (actionStr.includes('payment') || actionStr.includes('receipt')) { iconClass = 'payment'; iconStr = '💰'; }

            return `
              <div class="notification-item">
                <div class="notification-icon ${iconClass}">${iconStr}</div>
                <div class="notification-content">
                  <div class="notification-text">${n.action}</div>
                  <div class="notification-time">${timeAgo(n.created_at)}</div>
                </div>
              </div>
            `;
          }).join('');
        }
        notificationsLoaded = true;
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      notifList.innerHTML = '<div class="notification-empty">Gagal memuat notifikasi</div>';
    }
  };

  // Fetch initially to get the badge count
  if (notifBtn) fetchNotifications();

  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('open');
    if (notifDropdown.classList.contains('open') && !notificationsLoaded) {
      fetchNotifications();
    }
  });

  notifDropdown?.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', (e) => {
    if (notifDropdown?.classList.contains('open') && !notifBtn.contains(e.target) && !notifDropdown.contains(e.target)) {
      notifDropdown.classList.remove('open');
    }
  });

  markReadBtn?.addEventListener('click', async () => {
    try {
      const { api } = await import('../utils/api.js');
      await api('/notifications/read', { method: 'POST' });
      notifBadge.style.display = 'none';
      markReadBtn.style.display = 'none';
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  });

  return document.getElementById('page-content');
}
