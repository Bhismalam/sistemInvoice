import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, formatDate, getStatusLabel } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderDocumentDetail(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales';
  const documentType = routeParams.documentType || 'order';

  // Determine from URL hash if params not set
  const hash = window.location.hash;
  const actualTransactionType = hash.includes('/sales/') ? 'sales' : hash.includes('/purchases/') ? 'purchase' : transactionType;
  const actualDocumentType = hash.includes('/invoices/') ? 'invoice' : hash.includes('/orders/') ? 'order' : documentType;

  let typeTitle = 'Dokumen';
  if (actualTransactionType === 'sales') typeTitle = actualDocumentType === 'order' ? 'Order Penjualan' : 'Invoice Penjualan';
  if (actualTransactionType === 'purchase') typeTitle = actualDocumentType === 'order' ? 'Order Pembelian' : 'Invoice Pembelian';

  const basePath = `#/${actualTransactionType === 'sales' ? 'sales' : 'purchases'}/${actualDocumentType}s`;

  const page = renderLayout(container, `${actualTransactionType}-${actualDocumentType}`);
  page.innerHTML = `<div class="page-loading"><div class="spinner spinner-lg"></div></div>`;

  api(`/documents/${routeParams.id}`).then(res => {
    const doc = res.data;
    const isInvoice = doc.document_type === 'invoice';
    const isSales = doc.transaction_type === 'sales';
    const isPurchase = doc.transaction_type === 'purchase';

    // Calculate days until due
    const dueDate = new Date(doc.due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0 && doc.status !== 'paid' && doc.status !== 'cancelled';

    // Build due date warning
    let dueDateWarning = '';
    if (isInvoice && doc.status !== 'paid' && doc.status !== 'cancelled') {
      if (isOverdue) {
        dueDateWarning = `<div class="due-warning due-warning--overdue">
          <span class="due-warning__icon"><iconify-icon icon="lucide:alert-triangle" width="20" height="20"></iconify-icon></span>
          <div>
            <strong>Jatuh tempo ${Math.abs(daysUntilDue)} hari yang lalu!</strong>
            <p>Segera lakukan pembayaran untuk menghindari denda keterlambatan.</p>
          </div>
        </div>`;
      } else if (daysUntilDue <= 3) {
        dueDateWarning = `<div class="due-warning due-warning--urgent">
          <span class="due-warning__icon"><iconify-icon icon="lucide:bell-ring" width="20" height="20"></iconify-icon></span>
          <div>
            <strong>Jatuh tempo dalam ${daysUntilDue} hari!</strong>
            <p>Pastikan pembayaran dilakukan sebelum tanggal ${formatDate(doc.due_date)}.</p>
          </div>
        </div>`;
      } else if (daysUntilDue <= 7) {
        dueDateWarning = `<div class="due-warning due-warning--soon">
          <span class="due-warning__icon"><iconify-icon icon="lucide:calendar" width="20" height="20"></iconify-icon></span>
          <div>
            <strong>Jatuh tempo dalam ${daysUntilDue} hari</strong>
            <p>Pengingat: Pembayaran jatuh tempo ${formatDate(doc.due_date)}.</p>
          </div>
        </div>`;
      }
    }

    // Cancelled auto-delete timer
    let cancelledTimer = '';
    if (doc.status === 'cancelled' && doc.cancelled_at) {
      const cancelTime = new Date(doc.cancelled_at);
      const deleteTime = new Date(cancelTime.getTime() + 24 * 60 * 60 * 1000);
      const hoursLeft = Math.max(0, Math.ceil((deleteTime - now) / (1000 * 60 * 60)));
      cancelledTimer = `<div class="due-warning due-warning--cancelled">
        <span class="due-warning__icon"><iconify-icon icon="lucide:trash-2" width="20" height="20"></iconify-icon></span>
        <div>
          <strong>Dokumen dibatalkan</strong>
          <p>Invoice ini akan dihapus otomatis dalam ${hoursLeft} jam.</p>
        </div>
      </div>`;
    }

    const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
    const companySession = JSON.parse(sessionStorage.getItem('company') || '{}');
    const senderName = companySession.name || userSession.business_name || 'InvoiceFlow';
    const senderAddress = companySession.address || userSession.business_address || '';
    const senderNpwp = companySession.npwp || userSession.npwp || '';

    page.innerHTML = `<div class="animate-slide-up">
      <div class="page-header">
        <div class="flex items-center gap-lg">
          <a href="${basePath}" class="btn btn-ghost">← Kembali</a>
          <div><h1 class="page-title">${doc.document_number}</h1><p class="page-subtitle">Dibuat ${formatDate(doc.created_at)}</p></div>
        </div>
        <span class="badge badge-${doc.status}" style="font-size:0.9rem;padding:6px 16px">${getStatusLabel(doc.status)}</span>
      </div>

      ${dueDateWarning}
      ${cancelledTimer}

      <div class="grid-sidebar">
        <div class="glass-card" style="padding:var(--space-2xl)">
          <div style="background:var(--bg-primary);border-radius:var(--radius-md);padding:var(--space-2xl)">
            <div class="flex justify-between" style="margin-bottom:var(--space-2xl)">
              <div><h2 style="font-size:1.5rem;font-weight:700">${typeTitle.toUpperCase()}</h2><p class="text-muted">${doc.document_number}</p></div>
<<<<<<< HEAD
              <div style="text-align:right">
                <p style="font-weight:600">${senderName}</p>
                ${senderAddress ? `<p class="text-muted" style="font-size:0.85rem;max-width:250px;margin-left:auto;white-space:pre-wrap;">${senderAddress}</p>` : ''}
                ${senderNpwp ? `<p class="text-muted" style="font-size:0.85rem;margin-top:4px;">NPWP: ${senderNpwp}</p>` : ''}
              </div>
=======
              <div style="text-align:right"><p style="font-weight:600">${JSON.parse(sessionStorage.getItem('user') || '{}').business_name || 'InvoiceFlow'}</p></div>
>>>>>>> af6e3ad08e0407e14461c5ba21eba775a0cd3eb9
            </div>
            <div class="grid-2" style="margin-bottom:var(--space-xl)">
              <div>
                <p class="form-label">Kepada</p>
                <p style="font-weight:600">${doc.contact_name || '-'}</p>
                <p class="text-muted" style="font-size:0.85rem">${doc.contact_email || ''}</p>
                ${doc.contact_address ? `<p class="text-muted" style="font-size:0.85rem;white-space:pre-wrap;margin-top:4px;">${doc.contact_address}</p>` : ''}
              </div>
              <div style="text-align:right"><p class="form-label">Tanggal</p><p>${formatDate(doc.issue_date)}</p><p class="form-label" style="margin-top:var(--space-sm)">Jatuh Tempo</p><p>${formatDate(doc.due_date)}</p></div>
            </div>
            <table class="data-table">
              <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Harga</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>${(doc.items || []).map(item => `<tr><td>${item.description}</td><td style="text-align:right">${item.quantity}</td><td style="text-align:right">${formatCurrency(item.unit_price)}</td><td style="text-align:right;font-weight:600">${formatCurrency(item.total)}</td></tr>`).join('')}</tbody>
            </table>
            
            <div class="grid-2" style="margin-top:var(--space-xl);border-top:1px solid rgba(255,255,255,0.08);padding-top:var(--space-base);gap:var(--space-xl)">
              <div>
                ${(companySession.bank_name && companySession.bank_account_number) ? `
                <p class="form-label" style="margin-bottom:8px">Instruksi Pembayaran</p>
                <div style="background:rgba(255,255,255,0.03);padding:var(--space-md);border-radius:var(--radius-sm);border:1px solid var(--border)">
                  <p style="font-weight:600;margin-bottom:4px">${companySession.bank_name}</p>
                  <p style="font-family:monospace;font-size:1.1rem;color:var(--accent-primary);margin-bottom:4px;letter-spacing:1px">${companySession.bank_account_number}</p>
                  <p class="text-muted" style="font-size:0.85rem">A/N: ${companySession.bank_account_name || senderName}</p>
                </div>
                ` : ''}
                ${doc.notes ? `<div style="margin-top:var(--space-md);"><p class="form-label">Catatan</p><p class="text-muted" style="font-size:0.85rem">${doc.notes}</p></div>` : ''}
              </div>
              <div style="width:100%;max-width:300px;margin-left:auto;">
                <div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">Subtotal</span><span>${formatCurrency(doc.subtotal)}</span></div>
                ${doc.discount_amount > 0 ? `<div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">Diskon (${doc.discount_percent}%)</span><span>-${formatCurrency(doc.discount_amount)}</span></div>` : ''}
                <div class="flex justify-between" style="margin-bottom:4px"><span class="text-muted">PPN (${doc.tax_percent}%)</span><span>${formatCurrency(doc.tax_amount)}</span></div>
                <div class="flex justify-between" style="font-size:1.2rem;font-weight:700;margin-top:var(--space-md);padding-top:var(--space-md);border-top:2px solid var(--accent-primary)"><span>Total</span><span style="color:var(--accent-primary)">${formatCurrency(doc.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <!-- PAYMENT ACTIONS -->
          <div class="glass-card" style="padding:var(--space-xl);margin-bottom:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:zap" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Aksi Pembayaran</h3>
            <div class="flex flex-col gap-sm" id="payment-actions">
              <!-- BUTTON PRATINJAU / UNDUH PDF -->
              <button class="btn btn-secondary w-full" id="btn-pdf" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary)">
                <iconify-icon icon="lucide:file-down" width="16" height="16" style="vertical-align:-2px;margin-right:6px"></iconify-icon> Pratinjau / Unduh PDF
              </button>

              ${doc.document_type === 'order' ? `
                <a href="#/${actualTransactionType === 'sales' ? 'sales' : 'purchases'}/invoices/new?source_order=${doc.id}" class="btn btn-primary w-full"><iconify-icon icon="lucide:file-text" width="16" height="16"></iconify-icon> Buat Invoice dari Order</a>
              ` : ''}
              ${doc.status === 'draft' ? `
                <button class="btn btn-primary w-full" id="btn-send"><iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon> Kirim ${actualDocumentType === 'order' ? 'Order' : 'Invoice'}</button>
              ` : ''}
              ${(doc.status === 'sent' || doc.status === 'overdue' || doc.status === 'paid') ? `
                <button class="btn btn-secondary w-full" id="btn-resend-email" style="margin-bottom:var(--space-xs)">
                  <iconify-icon icon="lucide:mail" width="16" height="16" style="vertical-align:-2px;margin-right:6px"></iconify-icon> Kirim via Email
                </button>
              ` : ''}
                ${(doc.status === 'sent' || doc.status === 'overdue' || doc.status === 'paid') && isSales ? `
                  <button class="btn w-full" id="btn-send-wa" style="margin-bottom:var(--space-xs); background:#25D366; color:#ffffff; border:none; display:flex; align-items:center; justify-content:center; gap:6px;">
                    <iconify-icon icon="logos:whatsapp-icon" width="16" height="16"></iconify-icon> Kirim via WhatsApp
                  </button>
                ` : ''}
              ${(doc.status === 'sent' || doc.status === 'overdue') && isInvoice && isSales ? `
                <div class="payment-method-box">
                  <p class="form-label" style="margin-bottom:var(--space-sm)">Metode Pembayaran</p>
                  <select class="form-select" id="pay-method" style="margin-bottom:var(--space-sm)">
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai</option>
                    <option value="qris">QRIS</option>
                    <option value="e-wallet">E-Wallet</option>
                    <option value="kartu_kredit">Kartu Kredit</option>
                  </select>
                  <button class="btn btn-success w-full" id="btn-pay">
                    <iconify-icon icon="lucide:banknote" width="16" height="16"></iconify-icon> Tandai Sudah Dibayar
                  </button>
                </div>
                <button class="btn btn-primary w-full" id="pay-midtrans-btn" data-id="${doc.id}" style="padding:14px 20px;font-size:1rem"><iconify-icon icon="lucide:credit-card" width="16" height="16"></iconify-icon> Bayar Online (Midtrans)</button>
                <p class="text-muted" style="font-size:0.8rem;text-align:center;margin-top:var(--space-sm)">Kirim link pembayaran online ke pelanggan.</p>
                <button class="btn btn-danger-outline w-full" id="btn-cancel"><iconify-icon icon="lucide:x-circle" width="16" height="16"></iconify-icon> Batalkan Pembayaran</button>
              ` : ''}
              ${(doc.status === 'sent' || doc.status === 'overdue') && isInvoice && isPurchase ? `
                <div class="payment-method-box">
                  <p class="form-label" style="margin-bottom:var(--space-sm)">Metode Pembayaran</p>
                  <select class="form-select" id="pay-method" style="margin-bottom:var(--space-sm)">
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai</option>
                    <option value="qris">QRIS</option>
                    <option value="e-wallet">E-Wallet</option>
                    <option value="kartu_kredit">Kartu Kredit</option>
                  </select>
                  <button class="btn btn-success w-full" id="btn-pay">
                    <iconify-icon icon="lucide:banknote" width="16" height="16"></iconify-icon> Bayar Invoice
                  </button>
                </div>
                <button class="btn btn-danger-outline w-full" id="btn-cancel"><iconify-icon icon="lucide:x-circle" width="16" height="16"></iconify-icon> Batalkan Pembayaran</button>
              ` : ''}
              ${doc.status === 'paid' ? `
                <div class="payment-status-box payment-status-box--paid">
                  <span class="payment-status-icon"><iconify-icon icon="lucide:check-circle" width="24" height="24"></iconify-icon></span>
                  <div>
                    <strong>Sudah Dibayar</strong>
                    <p>${doc.paid_at ? `Dibayar pada ${formatDate(doc.paid_at)}` : 'Pembayaran sudah dikonfirmasi'}</p>
                    <p class="text-muted" style="font-size:0.8rem;margin-top:4px">Masuk ke ${isSales ? 'Kuitansi Penjualan' : 'Kuitansi Pembelian'}</p>
                  </div>
                </div>
              ` : ''}
              ${doc.status === 'cancelled' ? `
                <div class="payment-status-box payment-status-box--cancelled">
                  <span class="payment-status-icon"><iconify-icon icon="lucide:x-circle" width="24" height="24"></iconify-icon></span>
                  <div>
                    <strong>Dibatalkan</strong>
                    <p>Invoice ini telah dibatalkan dan akan dihapus otomatis dalam 24 jam.</p>
                  </div>
                </div>
              ` : ''}
              <a href="${basePath}" class="btn btn-ghost w-full">← Kembali ke Daftar</a>
            </div>
          </div>

          <!-- INFO & TRACKING -->
          <div class="glass-card" style="padding:var(--space-xl);margin-bottom:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:clipboard-list" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Info Dokumen</h3>
            <div style="display:flex;flex-direction:column;gap:var(--space-md);font-size:0.85rem">
              <div class="flex justify-between"><span class="text-muted">Status</span><span class="badge badge-${doc.status}">${getStatusLabel(doc.status)}</span></div>
              <div class="flex justify-between"><span class="text-muted">Tipe</span><span>${typeTitle}</span></div>
              <div class="flex justify-between"><span class="text-muted">Dibuat</span><span>${formatDate(doc.created_at)}</span></div>
              <div class="flex justify-between"><span class="text-muted">Jatuh Tempo</span><span class="${isOverdue ? 'text-danger' : ''}">${formatDate(doc.due_date)} ${isOverdue ? '(Lewat!)' : ''}</span></div>
              ${doc.paid_at ? `<div class="flex justify-between"><span class="text-muted">Dibayar</span><span class="text-success">${formatDate(doc.paid_at)}</span></div>` : ''}
              ${doc.cancelled_at ? `<div class="flex justify-between"><span class="text-muted">Dibatalkan</span><span class="text-danger">${formatDate(doc.cancelled_at)}</span></div>` : ''}
              ${isInvoice && doc.status !== 'paid' && doc.status !== 'cancelled' ? `
                <div class="flex justify-between"><span class="text-muted">Sisa Hari</span><span class="${daysUntilDue <= 3 ? 'text-danger' : daysUntilDue <= 7 ? 'text-warning' : 'text-success'}">${daysUntilDue} hari</span></div>
              ` : ''}
            </div>
          </div>

          ${isInvoice ? `
          <!-- PAYMENT TRACKER -->
          <div class="glass-card" style="padding:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:bell" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Pengingat Pembayaran</h3>
            <div id="payment-reminders" style="font-size:0.85rem">
              <div class="spinner" style="margin:var(--space-base) auto"></div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
    <div id="email-modal-portal"></div>
    <div id="wa-modal-portal"></div>`;

    // Load payment reminders if invoice
    if (isInvoice) {
      loadReminders(doc.id);
    }

    // Helper function to show Email Modal
    
    // Helper function to show WhatsApp Modal
    function showWhatsAppModal(docData) {
      const portal = document.getElementById('wa-modal-portal');
      if (!portal) return;

      const businessName = JSON.parse(sessionStorage.getItem('user') || '{}').business_name || 'InvoiceFlow';
      const contactPhone = docData.contact_phone || '';
      
      const typeLabel = docData.document_type === 'invoice' ? 'INVOICE' : 'ORDER';
      const totalFormatted = formatCurrency(docData.total);
      const dueDate = formatDate(docData.due_date);

      let defaultMessage = `📄 *${typeLabel} BARU*\n\n`;
      defaultMessage += `Halo ${docData.contact_name || 'Pelanggan'},\n\n`;
      defaultMessage += `Berikut ${typeLabel.toLowerCase()} dari *${businessName}*:\n\n`;
      defaultMessage += `📋 No: ${docData.document_number}\n`;
      defaultMessage += `💰 Total: *${totalFormatted}*\n`;
      defaultMessage += `📅 Jatuh Tempo: ${dueDate}\n`;

      if (docData.payment_link) {
        const paymentUrl = `${window.location.origin}/#/pay/${docData.payment_link}`;
        defaultMessage += `\n🔗 Lihat & Bayar: ${paymentUrl}\n`;
      }
<<<<<<< HEAD
      
      const companySession = JSON.parse(sessionStorage.getItem('company') || '{}');
      if (companySession.bank_name && companySession.bank_account_number) {
        defaultMessage += `\nAtau transfer bank ke:\n`;
        defaultMessage += `*${companySession.bank_name} - ${companySession.bank_account_number}*\n`;
        defaultMessage += `A/N: ${companySession.bank_account_name || businessName}\n`;
      }
=======
>>>>>>> af6e3ad08e0407e14461c5ba21eba775a0cd3eb9

      defaultMessage += `\nTerima kasih! 🙏\n— ${businessName}`;

      portal.innerHTML = `
        <div class="modal-overlay" id="wa-modal-bg">
          <div class="modal-content" style="max-width:550px">
            <div class="modal-header">
              <h2 class="modal-title" style="display:flex;align-items:center;gap:8px">
                <iconify-icon icon="logos:whatsapp-icon" width="22" height="22"></iconify-icon>
                Kirim via WhatsApp
              </h2>
              <button class="modal-close" id="wa-modal-close">×</button>
            </div>
            <form id="wa-form">
              <div class="form-group">
                <label class="form-label">Nomor WhatsApp Tujuan</label>
                <input type="text" class="form-input" id="wa-phone" value="${contactPhone}" required placeholder="contoh: 081234567890" />
                <p class="text-muted" style="font-size:0.75rem;margin-top:4px">Format: 08xxx, +628xxx, atau 628xxx</p>
              </div>
              <div class="form-group">
                <label class="form-label">Pratinjau Pesan</label>
                <textarea class="form-input" id="wa-message" rows="8" required style="resize:vertical;font-family:inherit;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);padding:10px;border-radius:4px">${defaultMessage}</textarea>
              </div>
              
              <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-base);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-sm)" id="wa-pdf-attachment-info">
                <iconify-icon icon="lucide:file-text" width="20" height="20" style="color:var(--accent-primary)"></iconify-icon>
                <div>
                  <p style="font-size:0.85rem;font-weight:600;margin:0">${docData.document_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf</p>
                  <p class="text-muted" style="font-size:0.75rem;margin:0">Lampiran dokumen PDF (jika dikirim dengan opsi PDF)</p>
                </div>
              </div>
              
              <div id="wa-status-message" class="wa-status" style="display:none;margin-bottom:var(--space-md);padding:var(--space-sm);border-radius:var(--radius-sm);font-size:0.85rem"></div>

              <div class="flex gap-md" style="margin-top:var(--space-lg)">
                <button type="button" class="btn btn-primary" id="wa-send-pdf-btn" style="background:#25D366;border-color:#25D366;color:#ffffff">Kirim PDF + Pesan</button>
                <button type="button" class="btn btn-secondary" id="wa-send-text-btn">Kirim Teks Saja</button>
                <button type="button" class="btn btn-ghost" id="wa-modal-cancel">Batal</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const close = () => { portal.innerHTML = ''; };
      document.getElementById('wa-modal-close').addEventListener('click', close);
      document.getElementById('wa-modal-cancel').addEventListener('click', close);
      document.getElementById('wa-modal-bg').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });

      let isSending = false;
      const statusEl = document.getElementById('wa-status-message');

      const setStatus = (msg, type) => {
        statusEl.style.display = 'block';
        statusEl.textContent = msg;
        if (type === 'loading') {
          statusEl.style.background = 'rgba(59, 130, 246, 0.1)';
          statusEl.style.color = '#3b82f6';
          statusEl.style.border = '1px solid rgba(59, 130, 246, 0.2)';
        } else if (type === 'success') {
          statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
          statusEl.style.color = '#10b981';
          statusEl.style.border = '1px solid rgba(16, 185, 129, 0.2)';
        } else if (type === 'error') {
          statusEl.style.background = 'rgba(239, 68, 68, 0.1)';
          statusEl.style.color = '#ef4444';
          statusEl.style.border = '1px solid rgba(239, 68, 68, 0.2)';
        }
      };

      // Handle Kirim PDF
      document.getElementById('wa-send-pdf-btn').addEventListener('click', async () => {
        if (isSending) return;
        const phone = document.getElementById('wa-phone').value.trim();
        if (!phone) { showToast('Masukkan nomor WhatsApp tujuan!', 'error'); return; }

        isSending = true;
        const btn = document.getElementById('wa-send-pdf-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Mengirim...';
        setStatus('Sedang membuat PDF & mengirim via WhatsApp...', 'loading');

        try {
          const response = await api(`/whatsapp/send-invoice/${docData.id}`, {
            method: 'POST',
            body: { phoneNumber: phone }
          });
          setStatus(response.message || 'Invoice berhasil dikirim via WhatsApp!', 'success');
          showToast(response.message || 'Invoice terkirim via WhatsApp!', 'success');
          setTimeout(() => { close(); window.location.reload(); }, 2000);
        } catch (err) {
          setStatus('Gagal: ' + err.message, 'error');
          showToast('Gagal mengirim: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = originalText;
          isSending = false;
        }
      });

      // Handle Kirim Teks Saja
      document.getElementById('wa-send-text-btn').addEventListener('click', async () => {
        if (isSending) return;
        const phone = document.getElementById('wa-phone').value.trim();
        const message = document.getElementById('wa-message').value.trim();
        if (!phone) { showToast('Masukkan nomor WhatsApp tujuan!', 'error'); return; }

        isSending = true;
        const btn = document.getElementById('wa-send-text-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Mengirim...';
        setStatus('Sedang mengirim rincian via WhatsApp...', 'loading');

        try {
          const response = await api(`/whatsapp/send-text/${docData.id}`, {
            method: 'POST',
            body: { phoneNumber: phone, customMessage: message }
          });
          setStatus(response.message || 'Rincian invoice berhasil dikirim!', 'success');
          showToast(response.message || 'Rincian invoice terkirim!', 'success');
          setTimeout(() => { close(); window.location.reload(); }, 2000);
        } catch (err) {
          setStatus('Gagal: ' + err.message, 'error');
          showToast('Gagal mengirim: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = originalText;
          isSending = false;
        }
      });
    }

    function showEmailModal(docData) {
      const portal = document.getElementById('email-modal-portal');
      if (!portal) return;

      const businessName = JSON.parse(sessionStorage.getItem('user') || '{}').business_name || 'InvoiceFlow';
      const companySession = JSON.parse(sessionStorage.getItem('company') || '{}');
      
      let paymentInfoText = '';
      if (companySession.bank_name && companySession.bank_account_number) {
        paymentInfoText = `\n\nAtau Anda dapat mentransfer langsung ke rekening berikut:\nBank: ${companySession.bank_name}\nNo Rek: ${companySession.bank_account_number}\nA/N: ${companySession.bank_account_name || businessName}`;
      }

      const defaultSubject = `[${typeLabel}] No. ${docData.document_number} - ${businessName}`;
      
      let defaultMessage = `Halo ${docData.contact_name || 'Pelanggan'},\n\nBerikut kami lampirkan ${typeLabel.toLowerCase()} dengan nomor ${docData.document_number} sebesar ${formatCurrency(docData.total)} yang jatuh tempo pada tanggal ${formatDate(docData.due_date)}.`;
      
      if (docData.payment_link) {
        defaultMessage += `\n\nAnda dapat melakukan pembayaran langsung melalui tautan berikut:\n${window.location.origin}/#/pay/${docData.payment_link}`;
      }
      
      if (paymentInfoText) {
        defaultMessage += paymentInfoText;
      }
      
      defaultMessage += `\n\nTerima kasih atas kerja samanya.\n\nSalam,\n${businessName}`;

      portal.innerHTML = `
        <div class="modal-overlay" id="email-modal-bg">
          <div class="modal-content" style="max-width:550px">
            <div class="modal-header">
              <h2 class="modal-title">Kirim Invoice via Email</h2>
              <button class="modal-close" id="email-modal-close">✕</button>
            </div>
            <form id="email-form">
              <div class="form-group">
                <label class="form-label">Email Penerima</label>
                <input type="email" class="form-input" id="email-to" value="${docData.contact_email || ''}" required placeholder="nama@email.com" />
              </div>
              <div class="form-group">
                <label class="form-label">Subjek</label>
                <input type="text" class="form-input" id="email-subject" value="${defaultSubject}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Isi Pesan</label>
                <textarea class="form-input" id="email-message" rows="8" required style="resize:vertical;font-family:inherit;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);padding:10px;border-radius:4px">${defaultMessage}</textarea>
              </div>
              <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-base);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-sm)">
                <iconify-icon icon="lucide:file-text" width="20" height="20" style="color:var(--accent-primary)"></iconify-icon>
                <div>
                  <p style="font-size:0.85rem;font-weight:600;margin:0">invoice_${docData.document_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf</p>
                  <p class="text-muted" style="font-size:0.75rem;margin:0">Lampiran dokumen PDF (Otomatis)</p>
                </div>
              </div>
              <div class="flex gap-md">
                <button type="submit" class="btn btn-primary" id="email-submit-btn">Kirim Sekarang</button>
                <button type="button" class="btn btn-secondary" id="email-modal-cancel">Batal</button>
              </div>
            </form>
          </div>
        </div>
      `;

      const close = () => { portal.innerHTML = ''; };
      document.getElementById('email-modal-close').addEventListener('click', close);
      document.getElementById('email-modal-cancel').addEventListener('click', close);
      document.getElementById('email-modal-bg').addEventListener('click', e => { if (e.target === e.currentTarget) close(); });

      let isSending = false;
      document.getElementById('email-form').addEventListener('submit', async e => {
        e.preventDefault();
        if (isSending) return;

        const submitBtn = document.getElementById('email-submit-btn');
        isSending = true;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Mengirim...';

        try {
          const to = document.getElementById('email-to').value;
          const subject = document.getElementById('email-subject').value;
          const message = document.getElementById('email-message').value;

          const response = await api(`/documents/${docData.id}/send-email`, {
            method: 'POST',
            body: { to, subject, message }
          });

          showToast(response.message || 'Invoice berhasil dikirim!', 'success');
          close();
          setTimeout(() => { window.location.reload(); }, 1500);
        } catch (err) {
          showToast(err.message, 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Kirim Sekarang';
          isSending = false;
        }
      });
    }

    // Send button event listener
    document.getElementById('btn-send')?.addEventListener('click', () => {
      showEmailModal(doc);
    });

    // Resend email event listener
    document.getElementById('btn-resend-email')?.addEventListener('click', () => {
      showEmailModal(doc);
    });

      // Send WhatsApp event listener
      document.getElementById('btn-send-wa')?.addEventListener('click', () => {
        showWhatsAppModal(doc);
      });

    // PDF download event listener
    document.getElementById('btn-pdf')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-pdf');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Mengunduh...';
      btn.disabled = true;
      try {
        const token = sessionStorage.getItem('accessToken');
        const configApiUrl = import.meta.env.VITE_API_URL || '/api';
        const url = `${configApiUrl.endsWith('/') ? configApiUrl.slice(0, -1) : configApiUrl}/documents/${doc.id}/pdf`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal mengunduh PDF.');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `invoice_${doc.document_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        
        showToast('PDF berhasil diunduh!', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
      }
    });

    // Pay button
    document.getElementById('btn-pay')?.addEventListener('click', async () => {
      const method = document.getElementById('pay-method')?.value || 'transfer';

      // If midtrans selected, trigger Midtrans flow instead
      if (method === 'midtrans') {
        document.getElementById('pay-midtrans-btn')?.click();
        return;
      }

      const btn = document.getElementById('btn-pay');
      btn.innerHTML = '<span class="spinner"></span> Memproses...';
      btn.disabled = true;
      try {
        const result = await api(`/documents/${doc.id}/pay`, {
          method: 'POST',
          body: { payment_method: method }
        });
        showToast(result.message || 'Pembayaran berhasil! ✅', 'success');
        window.location.reload();
      } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = `<iconify-icon icon="lucide:banknote" width="16" height="16"></iconify-icon> ${isSales ? 'Tandai Sudah Dibayar' : 'Bayar Invoice'}`;
        btn.disabled = false;
      }
    });

    // Cancel button
    document.getElementById('btn-cancel')?.addEventListener('click', async () => {
      if (!await showConfirm('Yakin ingin membatalkan pembayaran ini? Invoice akan dihapus otomatis dalam 24 jam.')) return;
      const btn = document.getElementById('btn-cancel');
      btn.innerHTML = '<span class="spinner"></span> Membatalkan...';
      btn.disabled = true;
      try {
        const result = await api(`/documents/${doc.id}/cancel`, { method: 'POST' });
        showToast(result.message || 'Dokumen dibatalkan', 'warning');
        window.location.reload();
      } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = '<iconify-icon icon="lucide:x-circle" width="16" height="16"></iconify-icon> Batalkan Pembayaran';
        btn.disabled = false;
      }
    });

    // Midtrans button
    document.getElementById('pay-midtrans-btn')?.addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.innerHTML;
      try {
        btn.innerHTML = '<span class="spinner"></span> Memproses...';
        btn.disabled = true;
        const res = await api('/payments/charge', { method: 'POST', body: { document_id: doc.id } });
        if (res.data && res.data.token && window.snap) {
          window.snap.pay(res.data.token, {
            onSuccess: async function (result) {
              showToast('Pembayaran Berhasil! ✅ Menyinkronkan status...', 'success');
              if (result.order_id) {
                try { await api(`/payments/status/${result.order_id}`); } catch (e) { }
              }
              window.location.reload();
            },
            onPending: function (result) { showToast('Menunggu Pembayaran...', 'warning'); window.location.reload(); },
            onError: function (result) { showToast('Pembayaran Gagal!', 'error'); btn.innerHTML = originalText; btn.disabled = false; },
            onClose: function () { btn.innerHTML = originalText; btn.disabled = false; }
          });
        }
      } catch (err) {
        showToast('Gagal memproses: ' + err.message, 'error');
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

  }).catch(err => {
    page.innerHTML = `<div class="empty-state"><p class="text-danger">Gagal memuat dokumen: ${err.message}</p><a href="${basePath}" class="btn btn-secondary">← Kembali</a></div>`;
  });

  async function loadReminders(docId) {
    try {
      const trackerRes = await api(`/documents/${docId}/tracker`);
      const tracker = trackerRes.data;
      const remindersEl = document.getElementById('payment-reminders');
      if (!remindersEl) return;

      let html = '';

      // Payment progress bar
      if (tracker.document.status !== 'cancelled') {
        html += `<div class="payment-progress">
          <div class="payment-progress__bar">
            <div class="payment-progress__fill" style="width:${tracker.percentPaid}%"></div>
          </div>
          <div class="flex justify-between" style="margin-top:4px">
            <span class="text-muted">Dibayar: ${formatCurrency(tracker.totalPaid)}</span>
            <span class="${tracker.remaining > 0 ? 'text-warning' : 'text-success'}">Sisa: ${formatCurrency(tracker.remaining)}</span>
          </div>
        </div>`;
      }

      // Reminders list
      if (tracker.reminders && tracker.reminders.length > 0) {
        html += `<div style="margin-top:var(--space-base)">`;
        for (const r of tracker.reminders) {
          const isSent = r.is_sent;
          const reminderDate = new Date(r.reminder_date);
          const isPast = reminderDate < new Date();
          html += `<div class="reminder-item ${isSent ? 'reminder-item--sent' : ''} ${isPast && !isSent ? 'reminder-item--missed' : ''}">
            <span class="reminder-item__icon">${isSent ? '<iconify-icon icon="lucide:check-circle" width="16" height="16"></iconify-icon>' : isPast ? '<iconify-icon icon="lucide:alert-triangle" width="16" height="16"></iconify-icon>' : '<iconify-icon icon="lucide:bell" width="16" height="16"></iconify-icon>'}</span>
            <div class="reminder-item__content">
              <p>${r.message || 'Pengingat pembayaran'}</p>
              <span class="text-muted">${formatDate(r.reminder_date)}</span>
            </div>
          </div>`;
        }
        html += `</div>`;
      } else {
        html += `<p class="text-muted" style="margin-top:var(--space-sm)">Belum ada pengingat.</p>`;
      }

      remindersEl.innerHTML = html;
    } catch (err) {
      const el = document.getElementById('payment-reminders');
      if (el) el.innerHTML = `<p class="text-muted">-</p>`;
    }
  }
}
