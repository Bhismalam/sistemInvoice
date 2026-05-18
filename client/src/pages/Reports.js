import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';

export function renderReports(container) {
  const page = renderLayout(container, 'reports');
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header"><h1 class="page-title">Laporan Keuangan</h1></div>
    <div class="grid-2">
      <div class="glass-card" style="padding:var(--space-xl)"><h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:bar-chart-3" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Aging Report</h3><div id="aging"><div class="page-loading"><div class="spinner"></div></div></div></div>
      <div class="glass-card" style="padding:var(--space-xl)"><h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:banknote" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Laba Rugi</h3><div id="pnl"><div class="page-loading"><div class="spinner"></div></div></div></div>
    </div></div>`;

  Promise.all([api('/reports/aging'), api('/reports/profit-loss')]).then(([agingRes, pnlRes]) => {
    document.getElementById('aging').innerHTML = agingRes.data.map(r => `
      <div style="margin-bottom:var(--space-base)"><div class="flex justify-between" style="margin-bottom:4px"><span style="font-size:0.85rem">${r.label}</span><span style="font-weight:600">${r.count} invoice</span></div>
      <div class="flex justify-between"><span class="text-muted" style="font-size:0.8rem">${formatCurrency(r.amount)}</span></div></div>`).join('');

    const pnl = pnlRes.data;
    document.getElementById('pnl').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:var(--space-base)">
        <div class="flex justify-between" style="padding:var(--space-md);background:var(--success-bg);border-radius:var(--radius-sm)"><span>Pendapatan</span><span class="text-success font-bold">${formatCurrency(pnl.income)}</span></div>
        <div class="flex justify-between" style="padding:var(--space-md);background:var(--danger-bg);border-radius:var(--radius-sm)"><span>Pengeluaran</span><span class="text-danger font-bold">${formatCurrency(pnl.expenses)}</span></div>
        <div class="flex justify-between" style="padding:var(--space-md);background:var(--accent-glow);border-radius:var(--radius-sm);font-size:1.1rem"><span class="font-bold">Laba Bersih</span><span class="font-bold" style="color:${pnl.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(pnl.profit)}</span></div>
      </div>`;
  }).catch(() => {});
}
