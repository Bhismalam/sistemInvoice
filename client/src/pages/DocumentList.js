import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format.js';
import { showToast } from '../router.js';

export function renderDocumentList(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales'; // 'sales' or 'purchase'
  const documentType = routeParams.documentType || 'invoice'; // 'order' or 'invoice'

  let title = 'Dokumen';
  if (transactionType === 'sales') title = documentType === 'order' ? 'Order Penjualan' : 'Invoice Penjualan';
  if (transactionType === 'purchase') title = documentType === 'order' ? 'Order Pembelian' : 'Invoice Pembelian';

  const basePath = `#/${transactionType === 'sales' ? 'sales' : 'purchases'}/${documentType}s`;

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
          <button class="tab-btn" data-status="sent">Terkirim</button>
          <button class="tab-btn" data-status="paid">Lunas</button>
          <button class="tab-btn" data-status="overdue">Jatuh Tempo</button>
        </div>
        <input type="text" class="form-input" placeholder="🔍 Cari nomor atau kontak..." id="search-input" style="max-width:260px" />
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
        <table class="data-table">
          <thead><tr><th>No. Dokumen</th><th>Kontak</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${docs.map(doc => `
              <tr>
                <td><a href="${basePath}/${doc.id}" style="font-weight:600;color:var(--accent-primary)">${doc.document_number}</a></td>
                <td>${doc.contact_name || '-'}</td>
                <td>${formatDate(doc.issue_date)}</td>
                <td>${formatDate(doc.due_date)}</td>
                <td style="font-weight:600">${formatCurrency(doc.total)}</td>
                <td><span class="badge badge-${doc.status}">${getStatusLabel(doc.status)}</span></td>
                <td>
                  <div style="display:flex;gap:4px">
                    ${doc.status === 'draft' ? `<button class="btn btn-ghost btn-sm send-btn" data-id="${doc.id}">📤 Kirim</button>` : ''}
                    ${doc.status === 'sent' && documentType === 'invoice' ? `<button class="btn btn-ghost btn-sm pay-btn" data-id="${doc.id}">💰 Lunas</button>` : ''}
                    <button class="btn btn-ghost btn-sm del-btn" data-id="${doc.id}">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="flex justify-between items-center" style="margin-top:var(--space-base);padding-top:var(--space-base);border-top:1px solid rgba(255,255,255,0.05)">
          <span class="text-muted" style="font-size:0.8rem">Menampilkan ${docs.length} dari ${meta.total} dokumen</span>
          <div class="pagination">
            ${currentPage > 1 ? `<button class="page-btn" id="prev-page">←</button>` : ''}
            <span class="page-btn active">${currentPage}</span>
            ${currentPage < meta.totalPages ? `<button class="page-btn" id="next-page">→</button>` : ''}
          </div>
        </div>
      ` : `<div class="empty-state"><div class="empty-state__icon">📄</div><p class="empty-state__title">Belum ada ${title.toLowerCase()}</p><p class="empty-state__text">Buat ${title.toLowerCase()} pertama Anda</p><a href="${basePath}/new" class="btn btn-primary">+ Buat Baru</a></div>`;

      // Event handlers
      document.querySelectorAll('.send-btn').forEach(b => b.addEventListener('click', () => updateStatus(b.dataset.id, 'sent')));
      document.querySelectorAll('.pay-btn').forEach(b => b.addEventListener('click', () => updateStatus(b.dataset.id, 'paid')));
      document.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => deleteDocument(b.dataset.id)));
      document.getElementById('prev-page')?.addEventListener('click', () => { currentPage--; loadDocuments(); });
      document.getElementById('next-page')?.addEventListener('click', () => { currentPage++; loadDocuments(); });
    } catch (err) { document.getElementById('document-table').innerHTML = `<p class="text-danger">Gagal memuat: ${err.message}</p>`; }
  }

  async function updateStatus(id, status) {
    try { await api(`/documents/${id}/status`, { method: 'PATCH', body: { status } }); showToast(`Dokumen berhasil di${status === 'paid' ? 'bayar' : 'kirim'}!`, 'success'); loadDocuments(); } catch (err) { showToast(err.message, 'error'); }
  }
  async function deleteDocument(id) {
    if (!confirm('Hapus dokumen ini?')) return;
    try { await api(`/documents/${id}`, { method: 'DELETE' }); showToast('Dokumen dihapus', 'success'); loadDocuments(); } catch (err) { showToast(err.message, 'error'); }
  }

  loadDocuments();
}
