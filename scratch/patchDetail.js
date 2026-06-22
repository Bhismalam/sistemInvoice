const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../client/src/pages/DocumentDetail.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inject email-modal-portal at the end of the HTML template
const htmlTargetSimple = `          \${isInvoice ? \`
          <!-- PAYMENT TRACKER -->
          <div class="glass-card" style="padding:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:bell" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Pengingat Pembayaran</h3>
            <div id="payment-reminders" style="font-size:0.85rem">
              <div class="spinner" style="margin:var(--space-base) auto"></div>
            </div>
          </div>
          \` : ''}
        </div>
      </div>
    </div>\`;`;

const htmlReplacementSimple = `          \${isInvoice ? \`
          <!-- PAYMENT TRACKER -->
          <div class="glass-card" style="padding:var(--space-xl)">
            <h3 style="font-weight:600;margin-bottom:var(--space-base)"><iconify-icon icon="lucide:bell" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Pengingat Pembayaran</h3>
            <div id="payment-reminders" style="font-size:0.85rem">
              <div class="spinner" style="margin:var(--space-base) auto"></div>
            </div>
          </div>
          \` : ''}
        </div>
      </div>
    </div>
    <div id="email-modal-portal"></div>\`;`;


// 2. Modify payment-actions sidebar buttons
const sidebarTarget = `            <div class="flex flex-col gap-sm" id="payment-actions">
              \${doc.document_type === 'order' ? \`
                <a href="#/\${actualTransactionType === 'sales' ? 'sales' : 'purchases'}/invoices/new?source_order=\${doc.id}" class="btn btn-primary w-full"><iconify-icon icon="lucide:file-text" width="16" height="16"></iconify-icon> Buat Invoice dari Order</a>
              \` : ''}
              \${doc.status === 'draft' ? \`
                <button class="btn btn-secondary w-full" id="btn-send"><iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon> Kirim \${actualDocumentType === 'order' ? 'Order' : 'Invoice'}</button>
              \` : ''}`;

const sidebarReplacement = `            <div class="flex flex-col gap-sm" id="payment-actions">
              <!-- BUTTON PRATINJAU / UNDUH PDF -->
              <button class="btn btn-secondary w-full" id="btn-pdf" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary)">
                <iconify-icon icon="lucide:file-down" width="16" height="16" style="vertical-align:-2px;margin-right:6px"></iconify-icon> Pratinjau / Unduh PDF
              </button>

              \${doc.document_type === 'order' ? \`
                <a href="#/\${actualTransactionType === 'sales' ? 'sales' : 'purchases'}/invoices/new?source_order=\${doc.id}" class="btn btn-primary w-full"><iconify-icon icon="lucide:file-text" width="16" height="16"></iconify-icon> Buat Invoice dari Order</a>
              \` : ''}
              \${doc.status === 'draft' ? \`
                <button class="btn btn-primary w-full" id="btn-send"><iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon> Kirim \${actualDocumentType === 'order' ? 'Order' : 'Invoice'}</button>
              \` : ''}
              \${(doc.status === 'sent' || doc.status === 'overdue' || doc.status === 'paid') ? \`
                <button class="btn btn-secondary w-full" id="btn-resend-email" style="margin-bottom:var(--space-xs)">
                  <iconify-icon icon="lucide:mail" width="16" height="16" style="vertical-align:-2px;margin-right:6px"></iconify-icon> Kirim via Email
                </button>
              \` : ''}`;


// 3. Modify send click handler
const handlerTarget = `    // Send button
    document.getElementById('btn-send')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-send');
      btn.innerHTML = '<span class="spinner"></span> Mengirim...';
      btn.disabled = true;
      try {
        await api(\`/documents/\${doc.id}/status\`, { method: 'PATCH', body: { status: 'sent' } });
        showToast('Dokumen berhasil dikirim!', 'success');
        window.location.reload();
      } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = '<iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon> Kirim';
        btn.disabled = false;
      }
    });`;

const handlerReplacement = `    // Helper function to show Email Modal
    function showEmailModal(docData) {
      const portal = document.getElementById('email-modal-portal');
      if (!portal) return;

      const businessName = JSON.parse(sessionStorage.getItem('user') || '{}').business_name || 'InvoiceFlow';
      const defaultSubject = \`[Invoice] No. \${docData.document_number} - \${businessName}\`;
      const defaultMessage = \`Halo \${docData.contact_name || 'Pelanggan'},\\n\\nBerikut kami lampirkan invoice tagihan dengan nomor \${docData.document_number} sebesar \${formatCurrency(docData.total)} yang jatuh tempo pada tanggal \${formatDate(docData.due_date)}.\\n\\nAnda dapat melakukan pembayaran langsung melalui tautan berikut:\\n\${window.location.origin}/#/pay/\${docData.payment_link || ''}\\n\\nTerima kasih atas kerja samanya.\\n\\nSalam,\\n\${businessName}\`;

      portal.innerHTML = \`
        <div class="modal-overlay" id="email-modal-bg">
          <div class="modal-content" style="max-width:550px">
            <div class="modal-header">
              <h2 class="modal-title">Kirim Invoice via Email</h2>
              <button class="modal-close" id="email-modal-close">✕</button>
            </div>
            <form id="email-form">
              <div class="form-group">
                <label class="form-label">Email Penerima</label>
                <input type="email" class="form-input" id="email-to" value="\${docData.contact_email || ''}" required placeholder="nama@email.com" />
              </div>
              <div class="form-group">
                <label class="form-label">Subjek</label>
                <input type="text" class="form-input" id="email-subject" value="\${defaultSubject}" required />
              </div>
              <div class="form-group">
                <label class="form-label">Isi Pesan</label>
                <textarea class="form-input" id="email-message" rows="8" required style="resize:vertical;font-family:inherit;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border);padding:10px;border-radius:4px">\${defaultMessage}</textarea>
              </div>
              <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-base);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-sm)">
                <iconify-icon icon="lucide:file-text" width="20" height="20" style="color:var(--accent-primary)"></iconify-icon>
                <div>
                  <p style="font-size:0.85rem;font-weight:600;margin:0">invoice_\${docData.document_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf</p>
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
      \`;

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

          const response = await api(\`/documents/\${docData.id}/send-email\`, {
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

    // PDF download event listener
    document.getElementById('btn-pdf')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-pdf');
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Mengunduh...';
      btn.disabled = true;
      try {
        const token = sessionStorage.getItem('accessToken');
        const configApiUrl = import.meta.env.VITE_API_URL || '/api';
        const url = \`\${configApiUrl.endsWith('/') ? configApiUrl.slice(0, -1) : configApiUrl}/documents/\${doc.id}/pdf\`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': \`Bearer \${token}\`
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
        a.download = \`invoice_\${doc.document_number.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf\`;
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
    });`;

let patched = false;

if (content.includes(htmlTargetSimple)) {
  content = content.replace(htmlTargetSimple, htmlReplacementSimple);
  patched = true;
} else {
  console.log('HTML target simple not found!');
}

if (content.includes(sidebarTarget)) {
  content = content.replace(sidebarTarget, sidebarReplacement);
  patched = patched && true;
} else {
  console.log('Sidebar target not found!');
  patched = false;
}

if (content.includes(handlerTarget)) {
  content = content.replace(handlerTarget, handlerReplacement);
  patched = patched && true;
} else {
  console.log('Handler target not found!');
  patched = false;
}

if (patched) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched DocumentDetail.js');
} else {
  console.error('Failed to patch DocumentDetail.js - check search strings!');
}
