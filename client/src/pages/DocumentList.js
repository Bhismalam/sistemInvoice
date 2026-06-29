import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderDocumentList(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales'; // 'sales' or 'purchase'
  const documentType = routeParams.documentType || 'invoice'; // 'order' or 'invoice'

  let title = 'Dokumen';
  if (transactionType === 'sales') title = documentType === 'order' ? 'Order Penjualan' : 'Invoice Penjualan';
  if (transactionType === 'purchase') title = documentType === 'order' ? 'Order Pembelian' : 'Invoice Pembelian';

  const basePath = `#/${transactionType === 'sales' ? 'sales' : 'purchases'}/${documentType}s`;
  const isInvoice = documentType === 'invoice';

  const page = renderLayout(container, `${transactionType}-${documentType}`);
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header">
      <div><h1 class="page-title">${title}</h1><p class="page-subtitle">Kelola semua ${title.toLowerCase()} Anda</p></div>
      <a href="${basePath}/new" class="btn btn-primary">+ Buat ${title}</a>
    </div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <div class="flex items-center gap-lg" style="margin-bottom:var(--space-xl);flex-wrap:wrap">
        <div class="tabs" id="status-tabs">
          <button class="tab-btn active" data-status="all">Semua</button>
          <button class="tab-btn" data-status="draft">Draft</button>
          <button class="tab-btn" data-status="sent">${isInvoice ? 'Menunggu' : 'Terkirim'}</button>
          <button class="tab-btn" data-status="paid">${isInvoice ? 'Lunas' : 'Lunas'}</button>
          <button class="tab-btn" data-status="overdue">Jatuh Tempo</button>
          <button class="tab-btn" data-status="cancelled">Dibatalkan</button>
        </div>
        <input type="text" class="form-input" placeholder="Cari nomor atau kontak..." id="search-input" style="max-width:260px" />
      </div>
      <div id="document-table"><div class="page-loading"><div class="spinner"></div></div></div>
    </div>
  </div>`;

  let currentStatus = 'all', currentSearch = '', currentPage = 1;

  document.getElementById('status-tabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentStatus = e.target.dataset.status;
      currentPage = 1;
      loadDocuments();
    }
  });

  document.getElementById('search-input')?.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => { currentPage = 1; loadDocuments(); }, 300);
  });

  async function loadDocuments() {
    try {
      const params = new URLSearchParams({ 
        transaction_type: transactionType,
        document_type: documentType,
        status: currentStatus, 
        search: currentSearch, 
        page: currentPage, 
        limit: 10 
      });
      const res = await api(`/documents?${params}`);
      const docs = res.data;
      const meta = res.meta || { total: docs.length, totalPages: 1 };

      document.getElementById('document-table').innerHTML = docs.length ? `
        <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>No. Dokumen</th><th>Kontak</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${docs.map(doc => {
              const dueDate = new Date(doc.due_date);
              const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
              const isDueSoon = daysLeft <= 3 && daysLeft >= 0 && doc.status !== 'paid' && doc.status !== 'cancelled';
              const isOverdue = daysLeft < 0 && doc.status !== 'paid' && doc.status !== 'cancelled';
              
              return `
              <tr class="${isOverdue ? 'row-overdue' : isDueSoon ? 'row-due-soon' : ''}">
                <td><a href="${basePath}/${doc.id}" style="font-weight:600;color:var(--accent-primary)">${doc.document_number}</a></td>
                <td>${doc.contact_name || '-'}</td>
                <td>${formatDate(doc.issue_date)}</td>
                <td>
                  ${formatDate(doc.due_date)}
                  ${isDueSoon ? `<span class="due-badge due-badge--soon"><iconify-icon icon="lucide:alarm-clock" width="14" height="14" style="vertical-align:-2px"></iconify-icon> ${daysLeft}h</span>` : ''}
                  ${isOverdue ? `<span class="due-badge due-badge--overdue"><iconify-icon icon="lucide:alert-triangle" width="14" height="14" style="vertical-align:-2px"></iconify-icon> Lewat</span>` : ''}
                </td>
                <td style="font-weight:600">${formatCurrency(doc.total)}</td>
                <td><span class="badge badge-${doc.status}">${getStatusLabel(doc.status)}</span></td>
                <td>
                  <div style="display:flex;gap:4px;flex-wrap:wrap">
                    ${doc.status === 'draft' ? `<button class="btn btn-ghost btn-sm send-btn" data-id="${doc.id}" title="Kirim"><iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon></button>` : ''}
                    ${(doc.status === 'sent' || doc.status === 'overdue') && isInvoice ? `
                      <button class="btn btn-ghost btn-sm pay-btn" data-id="${doc.id}" title="Bayar"><iconify-icon icon="lucide:banknote" width="16" height="16"></iconify-icon></button>
                      <button class="btn btn-ghost btn-sm cancel-btn" data-id="${doc.id}" title="Batalkan" style="color:var(--danger)"><iconify-icon icon="lucide:x-circle" width="16" height="16"></iconify-icon></button>
                    ` : ''}
                    ${doc.status !== 'paid' ? `<button class="btn btn-ghost btn-sm del-btn" data-id="${doc.id}" title="Hapus"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button>` : ''}
                  </div>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
        </div>
        <div class="flex justify-between items-center" style="margin-top:var(--space-base);padding-top:var(--space-base);border-top:1px solid rgba(255,255,255,0.05)">
          <span class="text-muted" style="font-size:0.8rem">Menampilkan ${docs.length} dari ${meta.total} dokumen</span>
          <div class="pagination">
            ${currentPage > 1 ? `<button class="page-btn" id="prev-page">←</button>` : ''}
            <span class="page-btn active">${currentPage}</span>
            ${currentPage < meta.totalPages ? `<button class="page-btn" id="next-page">→</button>` : ''}
          </div>
        </div>
      ` : `<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:file-text" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada ${title.toLowerCase()}</p><p class="empty-state__text">Buat ${title.toLowerCase()} pertama Anda</p><a href="${basePath}/new" class="btn btn-primary">+ Buat Baru</a></div>`;

      // Event handlers
      document.querySelectorAll('.send-btn').forEach(b => b.addEventListener('click', () => updateStatus(b.dataset.id, 'sent')));
      document.querySelectorAll('.pay-btn').forEach(b => b.addEventListener('click', () => processPayment(b.dataset.id)));
      document.querySelectorAll('.cancel-btn').forEach(b => b.addEventListener('click', () => cancelDocument(b.dataset.id)));
      document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => deleteDocument(b.dataset.id)));
      document.getElementById('prev-page')?.addEventListener('click', () => { currentPage--; loadDocuments(); });
      document.getElementById('next-page')?.addEventListener('click', () => { currentPage++; loadDocuments(); });
    } catch (err) { document.getElementById('document-table').innerHTML = `<p class="text-danger">Gagal memuat: ${err.message}</p>`; }
  }

  let isProcessing = false;

  async function updateStatus(id, status) {
    if (isProcessing) return;
    isProcessing = true;
    try { 
      await api(`/documents/${id}/status`, { method: 'PATCH', body: { status } }); 
      showToast('Dokumen berhasil dikirim!', 'success'); 
      loadDocuments(); 
    } catch (err) { showToast(err.message, 'error'); }
    finally { isProcessing = false; }
  }

  async function processPayment(id) {
    if (isProcessing) return;
    if (!await showConfirm('Konfirmasi pembayaran untuk dokumen ini?')) return;
    isProcessing = true;
    try { 
      const result = await api(`/documents/${id}/pay`, { method: 'POST', body: { payment_method: 'transfer' } }); 
      showToast(result.message || 'Pembayaran berhasil! ✅', 'success'); 
      loadDocuments(); 
    } catch (err) { showToast(err.message, 'error'); }
    finally { isProcessing = false; }
  }

  async function cancelDocument(id) {
    if (isProcessing) return;
    if (!await showConfirm('Yakin ingin membatalkan? Invoice akan dihapus otomatis dalam 24 jam.')) return;
    isProcessing = true;
    try { 
      const result = await api(`/documents/${id}/cancel`, { method: 'POST' }); 
      showToast(result.message || 'Dokumen dibatalkan', 'warning'); 
      loadDocuments(); 
    } catch (err) { showToast(err.message, 'error'); }
    finally { isProcessing = false; }
  }

  async function deleteDocument(id) {
    if (isProcessing) return;
    if (!await showConfirm('Hapus dokumen ini?')) return;
    isProcessing = true;
    try { 
      await api(`/documents/${id}`, { method: 'DELETE' }); 
      showToast('Dokumen dihapus', 'success'); 
      loadDocuments(); 
    } catch (err) { showToast(err.message, 'error'); }
    finally { isProcessing = false; }
  }

  loadDocuments();
}
