import { getInitials } from '../utils/format.js';
import { LOGO_ICON_SVG } from '../utils/logo.js';


// The menu structure is now hardcoded below since it has categories

export function renderLayout(container, activePage) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const company = JSON.parse(sessionStorage.getItem('company') || '{}');
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  const currentPath = window.location.hash;

  container.innerHTML = `
    <aside class="sidebar ${collapsed ? 'collapsed' : ''}" id="sidebar">
      <a href="#/dashboard" class="sidebar__logo">
        <div class="sidebar__logo-icon">${LOGO_ICON_SVG}</div>
        <div class="sidebar__logo-text">Invoice<span>Flow</span></div>
      </a>
      <nav class="sidebar__nav">
        <div class="sidebar__section-label">Menu</div>
          <a href="#/dashboard" class="nav-item ${currentPath === '#/dashboard' ? 'active' : ''}">
            <span class="nav-item__icon"><iconify-icon icon="lucide:layout-dashboard"></iconify-icon></span>
            <span class="nav-item__text">Dashboard</span>
          </a>
          
          <div class="sidebar__divider"></div>
          
          <!-- Penjualan Dropdown -->
          <div class="nav-group ${currentPath.startsWith('#/sales') ? 'open active' : ''}">
            <button class="nav-group-toggle">
              <span class="nav-item__icon"><iconify-icon icon="lucide:briefcase"></iconify-icon></span>
              <span class="nav-item__text">Penjualan</span>
              <span class="nav-group-chevron"><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></span>
            </button>
            <div class="nav-group-menu">
              <a href="#/sales/orders" class="nav-item ${currentPath.startsWith('#/sales/orders') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:clipboard-list"></iconify-icon></span>
                <span class="nav-item__text">Order Penjualan</span>
              </a>
              <a href="#/sales/invoices" class="nav-item ${currentPath.startsWith('#/sales/invoices') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:file-text"></iconify-icon></span>
                <span class="nav-item__text">Invoice Penjualan</span>
              </a>
              <a href="#/sales/receipts" class="nav-item ${currentPath.startsWith('#/sales/receipts') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:receipt"></iconify-icon></span>
                <span class="nav-item__text">Kuitansi Penjualan</span>
              </a>
              <a href="#/sales/debts" class="nav-item ${currentPath.startsWith('#/sales/debts') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:credit-card"></iconify-icon></span>
                <span class="nav-item__text">Piutang & Pengingat</span>
              </a>
            </div>
          </div>

          <!-- Pembelian Dropdown -->
          <div class="nav-group ${currentPath.startsWith('#/purchases') ? 'open active' : ''}">
            <button class="nav-group-toggle">
              <span class="nav-item__icon"><iconify-icon icon="lucide:shopping-cart"></iconify-icon></span>
              <span class="nav-item__text">Pembelian</span>
              <span class="nav-group-chevron"><iconify-icon icon="lucide:chevron-down" width="14" height="14"></iconify-icon></span>
            </button>
            <div class="nav-group-menu">
              <a href="#/purchases/orders" class="nav-item ${currentPath.startsWith('#/purchases/orders') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:package"></iconify-icon></span>
                <span class="nav-item__text">Order Pembelian</span>
              </a>
              <a href="#/purchases/invoices" class="nav-item ${currentPath.startsWith('#/purchases/invoices') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:file-down"></iconify-icon></span>
                <span class="nav-item__text">Invoice Pembelian</span>
              </a>
              <a href="#/purchases/receipts" class="nav-item ${currentPath.startsWith('#/purchases/receipts') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:receipt"></iconify-icon></span>
                <span class="nav-item__text">Kuitansi Pembelian</span>
              </a>
              <a href="#/purchases/debts" class="nav-item ${currentPath.startsWith('#/purchases/debts') ? 'active' : ''}">
                <span class="nav-item__icon"><iconify-icon icon="lucide:credit-card"></iconify-icon></span>
                <span class="nav-item__text">Manajemen Hutang</span>
              </a>
            </div>
          </div>

          <div class="sidebar__divider"></div>
          
          <a href="#/contacts" class="nav-item ${currentPath.startsWith('#/contacts') ? 'active' : ''}">
            <span class="nav-item__icon"><iconify-icon icon="lucide:users"></iconify-icon></span>
            <span class="nav-item__text">Mitra / Kontak</span>
          </a>
          <a href="#/products" class="nav-item ${currentPath.startsWith('#/products') ? 'active' : ''}">
            <span class="nav-item__icon"><iconify-icon icon="lucide:box"></iconify-icon></span>
            <span class="nav-item__text">Produk</span>
          </a>
          <a href="#/reports" class="nav-item ${currentPath.startsWith('#/reports') ? 'active' : ''}">
            <span class="nav-item__icon"><iconify-icon icon="lucide:trending-up"></iconify-icon></span>
            <span class="nav-item__text">Laporan</span>
          </a>
          
          <div class="sidebar__divider"></div>
          
          <a href="#/company" class="nav-item ${currentPath.startsWith('#/company') ? 'active' : ''}">
            <span class="nav-item__icon"><iconify-icon icon="lucide:settings"></iconify-icon></span>
            <span class="nav-item__text">Pengaturan</span>
          </a>
        </nav>
      <div class="sidebar__footer">
        <a class="nav-item" href="#" id="logout-btn">
          <span class="nav-item__icon"><iconify-icon icon="lucide:log-out"></iconify-icon></span>
          <span class="nav-item__label">Keluar</span>
        </a>
      </div>
    </aside>

    <div class="sidebar-overlay" id="sidebar-overlay"></div>

    <div class="${collapsed ? 'sidebar-collapsed' : ''} main-wrapper" style="flex:1;display:flex;flex-direction:column;min-width:0;" id="main-wrapper">
      <header class="header">
        <button class="header__toggle" id="sidebar-toggle"><iconify-icon icon="lucide:menu" width="20" height="20"></iconify-icon></button>
        <div class="header__search" style="position:relative;">
          <span class="header__search-icon"><iconify-icon icon="lucide:search" width="16" height="16"></iconify-icon></span>
          <input type="text" placeholder="Cari dokumen, invoice, kontak..." id="global-search" autocomplete="off" />
          <div class="search-dropdown" id="search-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); box-shadow:0 8px 24px rgba(0,0,0,0.5); margin-top:0.5rem; z-index:1000; max-height:400px; overflow-y:auto;">
            <!-- Results injected here -->
          </div>
        </div>
        <div class="header__actions">
          <button class="header__toggle" id="theme-btn" title="Ganti Tema">
            <iconify-icon icon="${localStorage.getItem('theme') === 'light' ? 'lucide:moon' : 'lucide:sun'}" width="18" height="18"></iconify-icon>
          </button>
          <div class="header__notification-wrapper" style="position:relative;">
            <button class="header__notification" id="notification-btn">
              <iconify-icon icon="lucide:bell" width="18" height="18"></iconify-icon><span class="header__notification-dot" id="notification-badge" style="display:none;"></span>
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
      <main class="main-content" id="page-content" style="margin-top:var(--header-height);min-width:0;">
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
                  <div style="font-size:0.875rem; color:var(--text-secondary);">${item.contact_name || 'Tanpa Kontak'} &middot; ${formatDate(item.issue_date)}</div>
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

  // Sidebar toggle — mobile overlay vs desktop collapse
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  const closeMobileSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('sidebar-open');
    if (overlay) overlay.classList.remove('active');
  };

  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const header = container.querySelector('.header');
    const wrapper = document.getElementById('main-wrapper');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileQuery.matches) {
      // Mobile: toggle overlay sidebar
      const isOpen = sidebar.classList.toggle('sidebar-open');
      if (isOpen) {
        overlay?.classList.add('active');
      } else {
        overlay?.classList.remove('active');
      }
    } else {
      // Desktop: toggle collapse
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarCollapsed', isCollapsed);
      if (isCollapsed) {
        wrapper.classList.add('sidebar-collapsed');
      } else {
        wrapper.classList.remove('sidebar-collapsed');
      }
    }
  });

  // Close sidebar on overlay click (mobile)
  document.getElementById('sidebar-overlay')?.addEventListener('click', closeMobileSidebar);

  // Close sidebar on nav link click (mobile)
  container.querySelectorAll('.sidebar .nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (mobileQuery.matches) {
        closeMobileSidebar();
      }
    });
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const { showConfirm } = await import('../utils/confirm.js');
    const confirmed = await showConfirm('Apakah Anda yakin ingin keluar dari akun Anda?', 'Konfirmasi Keluar');
    if (!confirmed) return;

    const { clearTokens } = await import('../utils/api.js');
    clearTokens();
    window.location.hash = '#/login';
  });

  // Theme Toggle
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    const themeBtn = document.getElementById('theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = `<iconify-icon icon="${isLight ? 'lucide:moon' : 'lucide:sun'}" width="18" height="18"></iconify-icon>`;
    }
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
            let iconStr = '<iconify-icon icon="lucide:plus" width="16" height="16"></iconify-icon>';
            const actionStr = n.action.toLowerCase();
            if (actionStr.includes('update') || actionStr.includes('changed status')) { iconClass = 'update'; iconStr = '<iconify-icon icon="lucide:pencil" width="16" height="16"></iconify-icon>'; }
            if (actionStr.includes('delete') || actionStr.includes('cancel')) { iconClass = 'delete'; iconStr = '<iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon>'; }
            if (actionStr.includes('payment') || actionStr.includes('receipt')) { iconClass = 'payment'; iconStr = '<iconify-icon icon="lucide:banknote" width="16" height="16"></iconify-icon>'; }

            const docNumStr = n.document_number 
              ? ` <span class="notification-doc-number" style="font-weight: 600; color: var(--accent-primary); font-family: monospace; font-size: 0.75rem; background: rgba(59, 130, 246, 0.1); padding: 1px 4px; border-radius: 4px; margin-left: 4px;">${n.document_number}</span>` 
              : '';

            const hasLink = n.document_id && n.transaction_type && n.document_type;
            const linkAttrs = hasLink ? `data-doc-id="${n.document_id}" data-tx-type="${n.transaction_type}" data-doc-type="${n.document_type}"` : '';
            const isClickableClass = hasLink ? 'notification-item--clickable' : '';

            return `
              <div class="notification-item ${isClickableClass}" ${linkAttrs}>
                <div class="notification-icon ${iconClass}">${iconStr}</div>
                <div class="notification-content">
                  <div class="notification-text">${n.action}${docNumStr}</div>
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

  notifDropdown?.addEventListener('click', async (e) => {
    e.stopPropagation();
    
    const item = e.target.closest('.notification-item--clickable');
    if (item) {
      const docId = item.getAttribute('data-doc-id');
      const txType = item.getAttribute('data-tx-type');
      const docType = item.getAttribute('data-doc-type');
      
      if (docId && txType && docType) {
        notifDropdown.classList.remove('open');
        
        // Auto Mark-As-Read when clicked
        try {
          const { api } = await import('../utils/api.js');
          await api('/notifications/read', { method: 'POST' });
          if (notifBadge) notifBadge.style.display = 'none';
          if (markReadBtn) markReadBtn.style.display = 'none';
        } catch (err) {
          console.error('Error marking notifications as read on click:', err);
        }
        
        // Navigation segment mapping
        const txSegment = txType === 'sales' ? 'sales' : 'purchases';
        const docSegment = docType === 'order' ? 'orders' : 'invoices';
        window.location.hash = `#/${txSegment}/${docSegment}/${docId}`;
      }
    }
  });

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
