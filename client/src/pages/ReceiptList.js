import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderReceiptList(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales'; // 'sales' or 'purchase'
  
  let title = transactionType === 'sales' ? 'Kuitansi Penjualan' : 'Kuitansi Pembelian';
  const basePath = `#/${transactionType === 'sales' ? 'sales' : 'purchases'}/receipts`;

  const page = renderLayout(container, `${transactionType}-receipt`);
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header">
      <div><h1 class="page-title">${title}</h1><p class="page-subtitle">Riwayat pembayaran ${transactionType === 'sales' ? 'masuk' : 'keluar'}</p></div>
    </div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <div id="receipt-list"><div class="page-loading"><div class="spinner"></div></div></div>
    </div>
  </div>`;

  async function load() {
    try {
      const res = await api('/receipts?limit=50');
      
      // Filter the receipts on the frontend for now, or assume the backend sends all
      // The better approach is if backend can filter by transaction_type, but let's filter here just in case.
      const receipts = res.data.filter(r => r.transaction_type === transactionType);

      document.getElementById('receipt-list').innerHTML = receipts.length ? `<table class="data-table">
        <thead>
          <tr>
            <th>No. Kuitansi</th>
            <th>Dokumen Ref.</th>
            <th>Kontak</th>
            <th>Tanggal</th>
            <th>Metode</th>
            <th style="text-align:right">Jumlah</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
        ${receipts.map(r => `
          <tr>
            <td style="font-weight:600">${r.receipt_number}</td>
            <td><a href="#/${transactionType === 'sales' ? 'sales' : 'purchases'}/${r.document_type}s/${r.document_id}" style="color:var(--accent-primary)">${r.document_number}</a></td>
            <td>${r.contact_name || '-'}</td>
            <td>${formatDate(r.payment_date)}</td>
            <td><span class="badge badge-draft">${r.payment_method}</span></td>
            <td style="text-align:right;font-weight:600;color:${transactionType === 'sales' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(r.amount)}</td>
            <td><button class="btn btn-ghost btn-sm del-r" data-id="${r.id}" style="color:var(--danger)"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button></td>
          </tr>
        `).join('')}
        </tbody>
      </table>` : `<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:receipt" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada kuitansi</p></div>`;
      
      document.querySelectorAll('.del-r').forEach(b => b.addEventListener('click', async () => { 
        if(await showConfirm('Hapus kuitansi ini?')) { 
          await api(`/receipts/${b.dataset.id}`,{method:'DELETE'}); 
          showToast('Dihapus','success'); 
          load(); 
        }
      }));
    } catch(err) { document.getElementById('receipt-list').innerHTML = `<p class="text-danger">${err.message}</p>`; }
  }

  load();
}
