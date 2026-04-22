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
      <div style="margin-top:var(--space-xl);display:flex;gap:var(--space-md);">
        <a href="#/sales/invoices/new" class="btn btn-secondary">📄 Buat Invoice</a>
        <a href="#/contacts" class="btn btn-secondary">👥 Tambah Mitra</a>
        <a href="#/products" class="btn btn-secondary">📦 Tambah Produk</a>
        <a href="#/purchases/receipts" class="btn btn-secondary">💸 Catat Biaya</a>
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
          <span class="stat-card__icon" style="background:var(--success-bg);color:var(--success)">💰</span>
        </div>
        <div class="stat-card__label">Total Revenue</div>
        <div class="stat-card__value text-success">${formatCurrency(s.total_revenue)}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--warning-bg);color:var(--warning)">⏳</span>
        </div>
        <div class="stat-card__label">Outstanding</div>
        <div class="stat-card__value text-warning">${formatCurrency(s.outstanding)}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--danger-bg);color:var(--danger)">🔴</span>
        </div>
        <div class="stat-card__label">Overdue</div>
        <div class="stat-card__value text-danger">${formatCurrency(s.overdue)}</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center justify-between" style="margin-bottom:var(--space-md)">
          <span class="stat-card__icon" style="background:var(--info-bg);color:var(--info)">📊</span>
        </div>
        <div class="stat-card__label">Total Invoice</div>
        <div class="stat-card__value">${counts.total}</div>
      </div>
    `;

    // Recent invoices
    const invoices = recentRes.data;
    document.getElementById('recent-invoices').innerHTML = invoices.length ? `
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
      <div style="margin-top:var(--space-base);text-align:right"><a href="#/sales/invoices" class="auth-link">Lihat Semua →</a></div>
    ` : '<div class="empty-state"><div class="empty-state__icon">📄</div><p class="empty-state__title">Belum ada invoice</p><a href="#/sales/invoices/new" class="btn btn-primary btn-sm">Buat Invoice Pertama</a></div>';

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
    document.getElementById('stat-cards').innerHTML = '<div class="stat-card"><p class="text-danger">Gagal memuat data</p></div>';
  }
}
