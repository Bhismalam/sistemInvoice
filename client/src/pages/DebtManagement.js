import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderDebtManagement(container, routeParams = {}) {
  const page = renderLayout(container, 'debt-management');

  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header">
      <div>
        <h1 class="page-title"><iconify-icon icon="lucide:credit-card" width="24" height="24" style="vertical-align:-4px"></iconify-icon> Manajemen Hutang & Piutang</h1>
        <p class="page-subtitle">Lacak semua tagihan yang harus dibayar dan yang harus diterima</p>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="debt-summary-grid" id="debt-summary">
      <div class="page-loading"><div class="spinner"></div></div>
    </div>

    <!-- Tabs -->
    <div class="glass-card" style="padding:var(--space-xl);margin-top:var(--space-xl)">
      <div class="flex items-center gap-lg" style="margin-bottom:var(--space-xl);flex-wrap:wrap">
        <div class="tabs" id="debt-tabs">
          <button class="tab-btn active" data-tab="purchase-debt">Hutang (ke Supplier)</button>
          <button class="tab-btn" data-tab="sales-debt">Piutang (dari Pelanggan)</button>
          <button class="tab-btn" data-tab="reminders">Pengingat</button>
        </div>
      </div>
      <div id="debt-content"><div class="page-loading"><div class="spinner"></div></div></div>
    </div>
  </div>`;

  let currentTab = 'purchase-debt';

  document.getElementById('debt-tabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      document.querySelectorAll('#debt-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentTab = e.target.dataset.tab;
      loadContent();
    }
  });

  async function loadSummary() {
    try {
      const res = await api('/debts/summary');
      const data = res.data;
      
      document.getElementById('debt-summary').innerHTML = `
        <div class="debt-card debt-card--danger">
          <div class="debt-card__icon"><iconify-icon icon="lucide:arrow-up-right" width="24" height="24"></iconify-icon></div>
          <div class="debt-card__content">
            <p class="debt-card__label">Total Hutang (ke Supplier)</p>
            <p class="debt-card__amount">${formatCurrency(data.purchase.total_amount)}</p>
            <div class="debt-card__detail">
              <span class="text-danger">${data.purchase.overdue.length} jatuh tempo</span>
              <span class="text-muted">•</span>
              <span>${data.purchase.upcoming.length} mendatang</span>
            </div>
          </div>
          ${data.purchase.overdue_amount > 0 ? `<div class="debt-card__badge debt-card__badge--danger">Rp${Number(data.purchase.overdue_amount).toLocaleString('id-ID')} overdue</div>` : ''}
        </div>
        <div class="debt-card debt-card--warning">
          <div class="debt-card__icon"><iconify-icon icon="lucide:arrow-down-left" width="24" height="24"></iconify-icon></div>
          <div class="debt-card__content">
            <p class="debt-card__label">Total Piutang (dari Pelanggan)</p>
            <p class="debt-card__amount">${formatCurrency(data.sales.total_amount)}</p>
            <div class="debt-card__detail">
              <span class="text-danger">${data.sales.overdue.length} jatuh tempo</span>
              <span class="text-muted">•</span>
              <span>${data.sales.upcoming.length} mendatang</span>
            </div>
          </div>
          ${data.sales.overdue_amount > 0 ? `<div class="debt-card__badge debt-card__badge--warning">Rp${Number(data.sales.overdue_amount).toLocaleString('id-ID')} overdue</div>` : ''}
        </div>
        <div class="debt-card debt-card--info">
          <div class="debt-card__icon"><iconify-icon icon="lucide:bar-chart-3" width="24" height="24"></iconify-icon></div>
          <div class="debt-card__content">
            <p class="debt-card__label">Selisih Bersih</p>
            <p class="debt-card__amount ${data.sales.total_amount - data.purchase.total_amount >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(data.sales.total_amount - data.purchase.total_amount)}</p>
            <div class="debt-card__detail">
              <span>Piutang - Hutang</span>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('debt-summary').innerHTML = `<p class="text-danger">Gagal memuat ringkasan: ${err.message}</p>`;
    }
  }

  async function loadContent() {
    const contentEl = document.getElementById('debt-content');
    contentEl.innerHTML = `<div class="page-loading"><div class="spinner"></div></div>`;

    if (currentTab === 'reminders') {
      await loadReminders(contentEl);
    } else {
      await loadDebtTable(contentEl, currentTab === 'purchase-debt' ? 'purchase' : 'sales');
    }
  }

  async function loadDebtTable(el, type) {
    try {
      const res = await api('/debts/summary');
      const data = type === 'purchase' ? res.data.purchase : res.data.sales;
      const allItems = [...data.overdue, ...data.upcoming];
      const typeLabel = type === 'purchase' ? 'purchases' : 'sales';

      if (allItems.length === 0) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-state__icon"><iconify-icon icon="${type === 'purchase' ? 'lucide:arrow-up-right' : 'lucide:arrow-down-left'}" width="48" height="48"></iconify-icon></div>
          <p class="empty-state__title">Tidak ada ${type === 'purchase' ? 'hutang' : 'piutang'} saat ini</p>
          <p class="empty-state__text">Semua tagihan sudah terbayar 🎉</p>
        </div>`;
        return;
      }

      el.innerHTML = `
        ${data.overdue.length > 0 ? `
          <div class="debt-section">
            <h4 class="debt-section__title debt-section__title--danger">
              <span><iconify-icon icon="lucide:alert-triangle" width="16" height="16"></iconify-icon></span> Jatuh Tempo (${data.overdue.length})
              <span class="text-danger" style="margin-left:auto;font-weight:700">${formatCurrency(data.overdue_amount)}</span>
            </h4>
            <table class="data-table">
              <thead><tr>
                <th>Invoice</th><th>Kontak</th><th>Total</th><th>Jatuh Tempo</th><th>Lewat</th><th></th>
              </tr></thead>
              <tbody>
                ${data.overdue.map(d => `
                  <tr class="row-overdue">
                    <td><a href="#/${typeLabel}/invoices/${d.id}" style="font-weight:600;color:var(--accent-primary)">${d.document_number}</a></td>
                    <td>${d.contact_name || '-'}</td>
                    <td style="font-weight:600">${formatCurrency(d.total)}</td>
                    <td>${formatDate(d.due_date)}</td>
                    <td><span class="due-badge due-badge--overdue">${d.days_overdue} hari</span></td>
                    <td>
                      <button class="btn btn-primary btn-sm quick-pay" data-id="${d.id}" data-type="${typeLabel}"><iconify-icon icon="lucide:banknote" width="14" height="14"></iconify-icon> Bayar</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${data.upcoming.length > 0 ? `
          <div class="debt-section" style="margin-top:var(--space-xl)">
            <h4 class="debt-section__title">
              <span><iconify-icon icon="lucide:calendar" width="16" height="16"></iconify-icon></span> Mendatang (${data.upcoming.length})
              <span class="text-muted" style="margin-left:auto;font-weight:700">${formatCurrency(data.upcoming.reduce((s, d) => s + d.total, 0))}</span>
            </h4>
            <table class="data-table">
              <thead><tr>
                <th>Invoice</th><th>Kontak</th><th>Total</th><th>Jatuh Tempo</th><th>Sisa</th><th></th>
              </tr></thead>
              <tbody>
                ${data.upcoming.map(d => {
                  const daysLeft = Math.abs(d.days_until_due);
                  const urgency = daysLeft <= 3 ? 'due-badge--overdue' : daysLeft <= 7 ? 'due-badge--soon' : '';
                  return `
                  <tr class="${daysLeft <= 3 ? 'row-due-soon' : ''}">
                    <td><a href="#/${typeLabel}/invoices/${d.id}" style="font-weight:600;color:var(--accent-primary)">${d.document_number}</a></td>
                    <td>${d.contact_name || '-'}</td>
                    <td style="font-weight:600">${formatCurrency(d.total)}</td>
                    <td>${formatDate(d.due_date)}</td>
                    <td><span class="due-badge ${urgency}">${daysLeft} hari</span></td>
                    <td>
                      <button class="btn btn-ghost btn-sm quick-pay" data-id="${d.id}" data-type="${typeLabel}"><iconify-icon icon="lucide:banknote" width="14" height="14"></iconify-icon></button>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      `;

      // Quick pay handlers
      el.querySelectorAll('.quick-pay').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!await showConfirm('Konfirmasi pembayaran?')) return;
          try {
            btn.innerHTML = '<span class="spinner"></span>';
            btn.disabled = true;
            const result = await api(`/documents/${btn.dataset.id}/pay`, { method: 'POST', body: { payment_method: 'transfer' } });
            showToast(result.message || 'Pembayaran berhasil! ✅', 'success');
            loadSummary();
            loadContent();
          } catch (err) {
            showToast(err.message, 'error');
            btn.innerHTML = '<iconify-icon icon="lucide:banknote" width="14" height="14"></iconify-icon> Bayar';
            btn.disabled = false;
          }
        });
      });

    } catch (err) {
      el.innerHTML = `<p class="text-danger">Gagal memuat data: ${err.message}</p>`;
    }
  }

  async function loadReminders(el) {
    try {
      const [remindersRes, upcomingRes] = await Promise.all([
        api('/debts/reminders?limit=50'),
        api('/debts/reminders/upcoming?days=14')
      ]);

      const reminders = remindersRes.data;
      const upcoming = upcomingRes.data;

      if (reminders.length === 0 && upcoming.length === 0) {
        el.innerHTML = `<div class="empty-state">
          <div class="empty-state__icon"><iconify-icon icon="lucide:bell" width="48" height="48"></iconify-icon></div>
          <p class="empty-state__title">Belum ada pengingat pembayaran</p>
          <p class="empty-state__text">Pengingat akan dibuat otomatis saat invoice dikirim</p>
        </div>`;
        return;
      }

      let html = '';
      
      // Upcoming alerts
      if (upcoming.length > 0) {
        html += `<div class="reminder-section">
          <h4 class="debt-section__title debt-section__title--warning">
            <span><iconify-icon icon="lucide:bell-ring" width="16" height="16"></iconify-icon></span> Pengingat Mendatang (${upcoming.length})
          </h4>
          <div class="reminder-list">
            ${upcoming.map(r => {
              const typeLabel = r.transaction_type === 'purchase' ? 'purchases' : 'sales';
              return `<div class="reminder-card">
                <div class="reminder-card__icon"><iconify-icon icon="${r.reminder_type === 'on_due' ? 'lucide:alarm-clock' : r.reminder_type === 'after_due' ? 'lucide:alert-triangle' : 'lucide:bell'}" width="18" height="18"></iconify-icon></div>
                <div class="reminder-card__body">
                  <p class="reminder-card__message">${r.message}</p>
                  <div class="reminder-card__meta">
                    <a href="#/${typeLabel}/invoices/${r.document_id}" style="color:var(--accent-primary)">${r.document_number}</a>
                    <span class="text-muted">•</span>
                    <span>${r.contact_name || '-'}</span>
                    <span class="text-muted">•</span>
                    <span class="text-warning">${formatDate(r.reminder_date)}</span>
                  </div>
                </div>
                <div class="reminder-card__amount">${formatCurrency(r.total)}</div>
                <button class="btn btn-ghost btn-sm reminder-delete" data-id="${r.id}" title="Hapus">✕</button>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }

      // All reminders
      if (reminders.length > 0) {
        html += `<div class="reminder-section" style="margin-top:var(--space-xl)">
          <h4 class="debt-section__title">
            <span><iconify-icon icon="lucide:clipboard-list" width="16" height="16"></iconify-icon></span> Semua Pengingat (${reminders.length})
          </h4>
          <table class="data-table">
            <thead><tr><th>Dokumen</th><th>Kontak</th><th>Tipe</th><th>Tanggal</th><th>Status</th><th>Jumlah</th><th></th></tr></thead>
            <tbody>
              ${reminders.map(r => {
                const typeLabel = r.transaction_type === 'purchase' ? 'purchases' : 'sales';
                return `<tr>
                  <td><a href="#/${typeLabel}/invoices/${r.document_id}" style="color:var(--accent-primary);font-weight:600">${r.document_number}</a></td>
                  <td>${r.contact_name || '-'}</td>
                  <td><span class="badge badge-${r.transaction_type === 'purchase' ? 'sent' : 'draft'}">${r.transaction_type === 'purchase' ? 'Hutang' : 'Piutang'}</span></td>
                  <td>${formatDate(r.reminder_date)}</td>
                  <td>${r.is_sent ? '<span class="badge badge-paid">Terkirim</span>' : '<span class="badge badge-draft">Pending</span>'}</td>
                  <td style="font-weight:600">${formatCurrency(r.total)}</td>
                  <td><button class="btn btn-ghost btn-sm reminder-delete" data-id="${r.id}" style="color:var(--danger)"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
      }

      el.innerHTML = html;

      // Delete reminder handlers
      el.querySelectorAll('.reminder-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api(`/debts/reminders/${btn.dataset.id}`, { method: 'DELETE' });
            showToast('Pengingat dihapus', 'success');
            loadContent();
          } catch (err) { showToast(err.message, 'error'); }
        });
      });

    } catch (err) {
      el.innerHTML = `<p class="text-danger">Gagal memuat pengingat: ${err.message}</p>`;
    }
  }

  // Initial load
  loadSummary();
  loadContent();
}
