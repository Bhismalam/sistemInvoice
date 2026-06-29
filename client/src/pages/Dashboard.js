import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format.js';

export function renderDashboard(container) {
  const page = renderLayout(container, 'dashboard');

  page.innerHTML = `
    <div class="animate-slide-up">
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Ringkasan kesehatan keuangan bisnis Anda</p>
        </div>
        <a href="#/sales/invoices/new" class="btn btn-primary">+ Buat Invoice</a>
      </div>
      <div class="grid-4" id="stat-cards">
        <div class="stat-card"><div class="stat-card__label">Memuat...</div></div>
        <div class="stat-card"><div class="stat-card__label">Memuat...</div></div>
        <div class="stat-card"><div class="stat-card__label">Memuat...</div></div>
        <div class="stat-card"><div class="stat-card__label">Memuat...</div></div>
      </div>
      <div class="grid-2" style="margin-top:var(--space-xl)">
        <div class="glass-card" style="padding:var(--space-xl)">
          <h3 style="margin-bottom:var(--space-base);font-weight:600;">Invoice Terbaru</h3>
          <div id="recent-invoices"><div class="page-loading"><div class="spinner"></div></div></div>
        </div>
        <div class="glass-card" style="padding:var(--space-xl)">
          <h3 style="margin-bottom:var(--space-base);font-weight:600;">Status Invoice</h3>
          <div id="status-breakdown"><div class="page-loading"><div class="spinner"></div></div></div>
        </div>
      </div>
      <div style="margin-top:var(--space-xl);display:flex;gap:var(--space-md);flex-wrap:wrap;">
        <a href="#/sales/invoices/new" class="btn btn-secondary"><iconify-icon icon="lucide:file-text" width="16" height="16"></iconify-icon> Buat Invoice</a>
        <a href="#/contacts" class="btn btn-secondary"><iconify-icon icon="lucide:users" width="16" height="16"></iconify-icon> Tambah Mitra</a>
        <a href="#/products" class="btn btn-secondary"><iconify-icon icon="lucide:box" width="16" height="16"></iconify-icon> Tambah Produk</a>
        <a href="#/purchases/receipts" class="btn btn-secondary"><iconify-icon icon="lucide:wallet" width="16" height="16"></iconify-icon> Catat Biaya</a>
      </div>
    </div>
  `;

  loadDashboardData();
}

async function loadDashboardData() {
  try {
    const [statsRes, recentRes] = await Promise.all([
      api('/dashboard/stats'),
      api('/dashboard/recent')
    ]);

    const s = statsRes.data.stats;
    const counts = statsRes.data.counts;

    document.getElementById('stat-cards').innerHTML = `
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--success-bg);color:var(--success)"><iconify-icon icon="lucide:banknote" width="22" height="22"></iconify-icon></span>
        </div>
        <div class="stat-card__label">Keuangan (Profit)</div>
        <div class="stat-card__value text-success">${formatCurrency(s.net_profit)}</div>
        <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
          <div class="flex justify-between"><span>Penjualan:</span> <span class="text-success">${formatCurrency(s.total_revenue)}</span></div>
          <div class="flex justify-between"><span>Pembelian:</span> <span class="text-danger">${formatCurrency(s.total_expense)}</span></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--warning-bg);color:var(--warning)"><iconify-icon icon="lucide:clock" width="22" height="22"></iconify-icon></span>
        </div>
        <div class="stat-card__label">Outstanding</div>
        <div class="stat-card__value text-warning">${formatCurrency(s.outstanding)}</div>
        <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
          <div class="flex justify-between"><span>Piutang (Jual):</span> <span class="text-warning">${formatCurrency(s.outstanding_sales)}</span></div>
          <div class="flex justify-between"><span>Hutang (Beli):</span> <span class="text-warning">${formatCurrency(s.outstanding_purchase)}</span></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--danger-bg);color:var(--danger)"><iconify-icon icon="lucide:alert-circle" width="22" height="22"></iconify-icon></span>
        </div>
        <div class="stat-card__label">Overdue</div>
        <div class="stat-card__value text-danger">${formatCurrency(s.overdue)}</div>
        <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
          <div class="flex justify-between"><span>Penjualan:</span> <span class="text-danger">${formatCurrency(s.overdue_sales)}</span></div>
          <div class="flex justify-between"><span>Pembelian:</span> <span class="text-danger">${formatCurrency(s.overdue_purchase)}</span></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--info-bg);color:var(--info)"><iconify-icon icon="lucide:bar-chart-3" width="22" height="22"></iconify-icon></span>
        </div>
        <div class="stat-card__label">Total Invoice</div>
        <div class="stat-card__value">${counts.total}</div>
        <div style="font-size: 0.8rem; margin-top: 8px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
          <div class="flex justify-between"><span>Penjualan:</span> <span class="text-info">${s.total_invoices_sales || 0}</span></div>
          <div class="flex justify-between"><span>Pembelian:</span> <span class="text-info">${s.total_invoices_purchase || 0}</span></div>
        </div>
      </div>
    `;

    // Recent invoices
    const invoices = recentRes.data;
    document.getElementById('recent-invoices').innerHTML = invoices.length ? `
      <div class="table-responsive">
      <table class="data-table">
        <thead><tr><th>Invoice</th><th>Klien</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          ${invoices.map(inv => `
            <tr style="cursor:pointer" onclick="location.hash='#/sales/invoices/${inv.id}'">
              <td><strong>${inv.document_number}</strong><br><span class="text-muted" style="font-size:0.75rem">${formatDate(inv.issue_date)}</span></td>
              <td>${inv.contact_name || '-'}</td>
              <td>${formatCurrency(inv.total)}</td>
              <td><span class="badge badge-${inv.status}">${getStatusLabel(inv.status)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
      <div style="margin-top:var(--space-base);text-align:right"><a href="#/sales/invoices" class="auth-link">Lihat Semua →</a></div>
    ` : '<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:file-text" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada invoice</p><a href="#/sales/invoices/new" class="btn btn-primary btn-sm">Buat Invoice Pertama</a></div>';

    // Status breakdown
    document.getElementById('status-breakdown').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-md)">
        ${[
          { label: 'Draft', count: counts.draft, color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.12)' },
          { label: 'Terkirim', count: counts.sent, color: 'var(--info)', bg: 'var(--info-bg)' },
          { label: 'Lunas', count: counts.paid, color: 'var(--success)', bg: 'var(--success-bg)' },
          { label: 'Jatuh Tempo', count: counts.overdue, color: 'var(--danger)', bg: 'var(--danger-bg)' }
        ].map(s => {
          const pct = counts.total ? Math.round((s.count / counts.total) * 100) : 0;
          return `<div>
            <div class="flex justify-between" style="margin-bottom:4px"><span style="font-size:0.85rem">${s.label}</span><span style="font-weight:600;color:${s.color}">${s.count}</span></div>
            <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:var(--radius-full);overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${s.color};border-radius:var(--radius-full);transition:width 0.8s ease"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
  } catch (err) {
    document.getElementById('stat-cards').innerHTML = '<div class="stat-card" style="grid-column: 1 / -1;"><p class="text-danger" style="text-align:center;">Gagal memuat data keuangan. Harap refresh halaman atau login ulang.</p></div>';
    document.getElementById('recent-invoices').innerHTML = '<p class="text-danger">Gagal memuat data.</p>';
    document.getElementById('status-breakdown').innerHTML = '<p class="text-danger">Gagal memuat data.</p>';
  }
}
