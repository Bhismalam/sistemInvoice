import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format.js';

export function renderDocumentDetail(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales';
  const documentType = routeParams.documentType || 'invoice';

  let typeTitle = 'Dokumen';
  if (transactionType === 'sales') typeTitle = documentType === 'order' ? 'Order Penjualan' : 'Invoice Penjualan';
  if (transactionType === 'purchase') typeTitle = documentType === 'order' ? 'Order Pembelian' : 'Invoice Pembelian';

  const basePath = `#/${transactionType === 'sales' ? 'sales' : 'purchases'}/${documentType}s`;

  const page = renderLayout(container, `${transactionType}-${documentType}`);
  page.innerHTML = `<div class="page-loading"><div class="spinner spinner-lg"></div></div>`;

  api(`/documents/${routeParams.id}`).then(res => {
    const doc = res.data;
    page.innerHTML = `<div class="animate-slide-up">
      <div class="page-header">
        <div class="flex items-center gap-lg">
          <a href="${basePath}" class="btn btn-ghost">← Kembali</a>
          <div><h1 class="page-title">${doc.document_number}</h1><p class="page-subtitle">Dibuat ${formatDate(doc.created_at)}</p></div>
        </div>
        <span class="badge badge-${doc.status}" style="font-size:0.9rem;padding:6px 16px">${getStatusLabel(doc.status)}</span>
      </div>
      <div class="grid-sidebar">
        <div class="glass-card" style="padding:var(--space-2xl)">
          <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-2xl)">
            <div class="flex justify-between" style="margin-bottom:var(--space-2xl)">
              <div><h2 style="font-size:1.5rem;font-weight:700">${typeTitle.toUpperCase()}</h2><p class="text-muted">${doc.document_number}</p></div>
              <div style="text-align:right"><p style="font-weight:600">${JSON.parse(localStorage.getItem('user') || '{}').business_name || 'InvoiceFlow'}</p></div>
            </div>
            <div class="grid-2" style="margin-bottom:var(--space-xl)">
              <div><p class="form-label">Kepada</p><p style="font-weight:600">${doc.contact_name || '-'}</p><p class="text-muted" style="font-size:0.85rem">${doc.contact_email || ''}</p></div>
              <div style="text-align:right"><p class="form-label">Tanggal</p><p>${formatDate(doc.issue_date)}</p><p class="form-label" style="margin-top:var(--space-sm)">Jatuh Tempo</p><p>${formatDate(doc.due_date)}</p></div>
            </div>
            <table class="data-table">
              <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>${(doc.items || []).map(item => `<tr><td>${item.description}</td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.unit_price)}</td><td style="text-align:right;font-weight:600">${formatCurrency(item.total)}</td></tr>`).join('')}</tbody>
            </table>
            <div style="max-width:300px;margin-left:auto;margin-top:var(--space-xl);border-top:1px solid rgba(255,255,255,0.08);padding-top:var(--space-base)">
              <div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">Subtotal</span><span>${formatCurrency(doc.subtotal)}</span></div>
              ${doc.discount_amount > 0 ? `<div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">Diskon (${doc.discount_percent}%)</span><span>-${formatCurrency(doc.discount_amount)}</span></div>` : ''}
              <div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">PPN (${doc.tax_percent}%)</span><span>${formatCurrency(doc.tax_amount)}</span></div>
              <div class="flex justify-between" style="font-size:1.2rem;font-weight:700;margin-top:var(--space-md);padding-top:var(--space-md);border-top:2px solid var(--accent-primary)"><span>Total</span><span style="color:var(--accent-primary)">${formatCurrency(doc.total)}</span></div>
            </div>
            ${doc.notes ? `<div style="margin-top:var(--space-xl);padding-top:var(--space-base);border-top:1px solid rgba(255,255,255,0.06)"><p class="form-label">Catatan</p><p class="text-muted">${doc.notes}</p></div>` : ''}
          </div>
        </div>
        <div>
          <div class="glass-card" style="padding:var(--space-xl);margin-bottom:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)">Aksi</h3>
            <div class="flex flex-col gap-sm">
              ${documentType === 'order' ? `
                <a href="#/${transactionType === 'sales' ? 'sales' : 'purchases'}/invoices/new?source_order=${doc.id}" class="btn btn-primary w-full">📄 Buat Invoice dari Order</a>
              ` : ''}
              ${doc.status === 'draft' ? `<button class="btn btn-secondary w-full" onclick="(async()=>{await fetch('/api/documents/${doc.id}/status',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('accessToken')},body:JSON.stringify({status:'sent'})});location.reload()})()">📤 Kirim ${documentType === 'order' ? 'Order' : 'Invoice'}</button>` : ''}
              ${doc.status === 'sent' && documentType === 'invoice' ? `
                <button class="btn btn-primary w-full" id="pay-midtrans-btn" data-id="${doc.id}">💳 Bayar Online (Midtrans)</button>
                <button class="btn btn-secondary w-full" onclick="(async()=>{await fetch('/api/documents/${doc.id}/status',{method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('accessToken')},body:JSON.stringify({status:'paid'})});location.reload()})()">💰 Tandai Lunas Manual</button>
              ` : ''}
              <a href="${basePath}" class="btn btn-ghost w-full">← Kembali ke Daftar</a>
            </div>
          </div>
          <div class="glass-card" style="padding:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)">Info</h3>
            <div style="display:flex;flex-direction:column;gap:var(--space-md);font-size:0.85rem">
              <div class="flex justify-between"><span class="text-muted">Status</span><span class="badge badge-${doc.status}">${getStatusLabel(doc.status)}</span></div>
              <div class="flex justify-between"><span class="text-muted">Dibuat</span><span>${formatDate(doc.created_at)}</span></div>
              <div class="flex justify-between"><span class="text-muted">Jatuh Tempo</span><span>${formatDate(doc.due_date)}</span></div>
              ${doc.paid_at ? `<div class="flex justify-between"><span class="text-muted">Dibayar</span><span class="text-success">${formatDate(doc.paid_at)}</span></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>`;

    document.getElementById('pay-midtrans-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.innerHTML;
      try {
        btn.innerHTML = '<span class="spinner"></span> Memproses...';
        btn.disabled = true;
        const res = await api('/payments/charge', { method: 'POST', body: { document_id: doc.id } });
        if (res.data && res.data.token && window.snap) {
          window.snap.pay(res.data.token, {
            onSuccess: function(result){ alert("Pembayaran Berhasil!"); location.reload(); },
            onPending: function(result){ alert("Menunggu Pembayaran!"); location.reload(); },
            onError: function(result){ alert("Pembayaran Gagal!"); btn.innerHTML = originalText; btn.disabled = false; },
            onClose: function(){ btn.innerHTML = originalText; btn.disabled = false; }
          });
        }
      } catch (err) {
        alert("Gagal memproses pembayaran: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

  }).catch(err => { page.innerHTML = `<div class="empty-state"><p class="text-danger">Gagal memuat dokumen: ${err.message}</p><a href="${basePath}" class="btn btn-secondary">← Kembali</a></div>`; });
}
