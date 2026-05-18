import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';
import { showToast } from '../router.js';

export function renderDocumentCreate(container, routeParams = {}) {
  const transactionType = routeParams.transactionType || 'sales';
  const documentType = routeParams.documentType || 'invoice';

  let title = 'Dokumen';
  if (transactionType === 'sales') title = documentType === 'order' ? 'Order Penjualan' : 'Invoice Penjualan';
  if (transactionType === 'purchase') title = documentType === 'order' ? 'Order Pembelian' : 'Invoice Pembelian';

  const basePath = `#/${transactionType === 'sales' ? 'sales' : 'purchases'}/${documentType}s`;

  const page = renderLayout(container, `${transactionType}-${documentType}`);
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header">
      <div><h1 class="page-title">Buat ${title} Baru</h1><p class="page-subtitle">Isi detail dan simpan dokumen</p></div>
    </div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <form id="document-form">
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">${transactionType === 'sales' ? 'Pelanggan' : 'Supplier'} <span class="text-danger">*</span></label>
            <select class="form-select" id="doc-contact"><option value="">Pilih kontak...</option></select>
          </div>
          <div></div>
          <div class="form-group">
            <label class="form-label">Tanggal ${documentType === 'order' ? 'Order' : 'Invoice'} <span class="text-danger">*</span></label>
            <input type="date" class="form-input" id="doc-issue-date" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group">
            <label class="form-label">Jatuh Tempo <span class="text-danger">*</span></label>
            <input type="date" class="form-input" id="doc-due-date" />
          </div>
        </div>

        <h3 style="margin:var(--space-xl) 0 var(--space-base);font-weight:600"><iconify-icon icon="lucide:package" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Item</h3>
        <table class="data-table" id="items-table">
          <thead><tr><th>Produk/Deskripsi</th><th style="width:100px">Qty</th><th style="width:160px">Harga</th><th style="width:160px">Total</th><th style="width:40px"></th></tr></thead>
          <tbody id="items-body"></tbody>
        </table>
        <button type="button" class="btn btn-secondary btn-sm" id="add-item" style="margin-top:var(--space-md)">+ Tambah Item</button>

        <div style="max-width:400px;margin-left:auto;margin-top:var(--space-xl);border-top:1px solid rgba(255,255,255,0.06);padding-top:var(--space-base)">
          <div class="flex justify-between" style="margin-bottom:var(--space-sm)"><span class="text-muted">Subtotal</span><span id="subtotal">${formatCurrency(0)}</span></div>
          <div class="flex justify-between items-center" style="margin-bottom:var(--space-sm)">
            <span class="text-muted">Diskon (%)</span>
            <input type="number" class="form-input" id="doc-discount" value="0" min="0" max="100" style="width:80px;padding:6px 10px;text-align:right" />
          </div>
          <div class="flex justify-between items-center" style="margin-bottom:var(--space-sm)">
            <span class="text-muted">PPN (%)</span>
            <input type="number" class="form-input" id="doc-tax" value="11" min="0" style="width:80px;padding:6px 10px;text-align:right" />
          </div>
          <div class="flex justify-between" style="font-size:1.2rem;font-weight:700;margin-top:var(--space-md);padding-top:var(--space-md);border-top:2px solid var(--accent-primary)">
            <span>Total</span><span id="grand-total" style="color:var(--accent-primary)">${formatCurrency(0)}</span>
          </div>
        </div>

        <div class="form-group" style="margin-top:var(--space-xl)">
          <label class="form-label">Catatan</label>
          <textarea class="form-input form-textarea" id="doc-notes" placeholder="Catatan..."></textarea>
        </div>

        <div class="flex gap-md" style="margin-top:var(--space-xl)">
          <button type="submit" class="btn btn-primary btn-lg" id="save-draft"><iconify-icon icon="lucide:save" width="16" height="16"></iconify-icon> Simpan Draft</button>
          <button type="button" class="btn btn-secondary btn-lg" id="send-document"><iconify-icon icon="lucide:send" width="16" height="16"></iconify-icon> Kirim ${documentType === 'order' ? 'Order' : 'Invoice'}</button>
          <a href="${basePath}" class="btn btn-ghost btn-lg">Batal</a>
        </div>
      </form>
    </div>
  </div>`;

  // Load contacts and products
  let products = [];
  const contactType = transactionType === 'sales' ? 'customer' : 'supplier';
  
  // Check for source_order to prepopulate
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const sourceOrderId = urlParams.get('source_order');

  Promise.all([
    api(`/contacts?type=${contactType}&limit=100`), 
    api('/products?limit=100'),
    sourceOrderId ? api(`/documents/${sourceOrderId}`) : Promise.resolve(null)
  ]).then(([cRes, pRes, sourceRes]) => {
    const contactSelect = document.getElementById('doc-contact');
    cRes.data.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; contactSelect.appendChild(opt); });
    products = pRes.data;
    
    if (sourceRes && sourceRes.data) {
      const src = sourceRes.data;
      document.getElementById('doc-contact').value = src.contact_id || '';
      document.getElementById('doc-discount').value = src.discount_percent || 0;
      document.getElementById('doc-tax').value = src.tax_percent || 0;
      document.getElementById('doc-notes').value = src.notes || '';
      
      if (src.items && src.items.length > 0) {
        src.items.forEach(item => addItemRow(item));
      } else {
        addItemRow();
      }
      setTimeout(recalculate, 100);
    } else {
      addItemRow();
    }
  }).catch(err => {
    showToast('Gagal memuat data sumber: ' + err.message, 'error');
    addItemRow();
  });

  // Set default due date (30 days)
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 30);
  document.getElementById('doc-due-date').value = dueDate.toISOString().split('T')[0];

  function addItemRow(initialData = null) {
    const tbody = document.getElementById('items-body');
    const row = document.createElement('tr');
    
    const prodId = initialData ? initialData.product_id : '';
    const desc = initialData ? initialData.description : '';
    const qty = initialData ? initialData.quantity : 1;
    const price = initialData ? initialData.unit_price : 0;
    
    row.innerHTML = `
      <td><select class="form-select item-product" style="min-width:200px">
        <option value="">Pilih produk / tulis manual</option>
        ${products.map(p => `<option value="${p.id}" data-price="${p.price}" ${p.id == prodId ? 'selected' : ''}>${p.name} (${formatCurrency(p.price)})</option>`).join('')}
      </select>
      <input type="text" class="form-input item-desc" placeholder="Deskripsi" style="margin-top:4px" value="${desc}" /></td>
      <td><input type="number" class="form-input item-qty" value="${qty}" min="1" style="text-align:center" /></td>
      <td><input type="number" class="form-input item-price" value="${price}" min="0" style="text-align:right" /></td>
      <td class="item-total" style="font-weight:600;text-align:right">${formatCurrency(qty * price)}</td>
      <td><button type="button" class="btn btn-ghost btn-sm remove-item" style="color:var(--danger)">✕</button></td>`;
    tbody.appendChild(row);

    row.querySelector('.item-product').addEventListener('change', (e) => {
      const opt = e.target.selectedOptions[0];
      if (opt.dataset.price) {
        row.querySelector('.item-price').value = opt.dataset.price;
        row.querySelector('.item-desc').value = opt.textContent.split(' (')[0];
      }
      recalculate();
    });
    row.querySelectorAll('.item-qty, .item-price').forEach(inp => inp.addEventListener('input', recalculate));
    row.querySelector('.remove-item').addEventListener('click', () => { row.remove(); recalculate(); });
  }

  function recalculate() {
    let subtotal = 0;
    document.querySelectorAll('#items-body tr').forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
      const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
      const total = qty * price;
      subtotal += total;
      row.querySelector('.item-total').textContent = formatCurrency(total);
    });
    const discountPct = parseFloat(document.getElementById('doc-discount').value) || 0;
    const taxPct = parseFloat(document.getElementById('doc-tax').value) || 0;
    const discountAmt = subtotal * (discountPct / 100);
    const afterDiscount = subtotal - discountAmt;
    const taxAmt = afterDiscount * (taxPct / 100);
    const grandTotal = afterDiscount + taxAmt;
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('grand-total').textContent = formatCurrency(grandTotal);
  }

  document.getElementById('add-item').addEventListener('click', addItemRow);
  document.getElementById('doc-discount')?.addEventListener('input', recalculate);
  document.getElementById('doc-tax')?.addEventListener('input', recalculate);

  async function saveDocument(status) {
    const items = [];
    document.querySelectorAll('#items-body tr').forEach(row => {
      const desc = row.querySelector('.item-desc')?.value || row.querySelector('.item-product')?.selectedOptions[0]?.textContent?.split(' (')[0] || '';
      const productId = row.querySelector('.item-product')?.value || null;
      items.push({
        product_id: productId || null,
        description: desc,
        quantity: parseFloat(row.querySelector('.item-qty')?.value) || 1,
        unit_price: parseFloat(row.querySelector('.item-price')?.value) || 0
      });
    });
    if (items.length === 0 || !items[0].description) { showToast('Tambahkan minimal 1 item', 'warning'); return; }

    const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const discountPct = parseFloat(document.getElementById('doc-discount').value) || 0;
    const taxPct = parseFloat(document.getElementById('doc-tax').value) || 0;
    const discountAmt = subtotal * (discountPct / 100);
    const taxAmt = (subtotal - discountAmt) * (taxPct / 100);

    try {
      await api('/documents', { method: 'POST', body: {
        transaction_type: transactionType,
        document_type: documentType,
        contact_id: document.getElementById('doc-contact').value || null,
        status,
        issue_date: document.getElementById('doc-issue-date').value,
        due_date: document.getElementById('doc-due-date').value,
        subtotal, discount_percent: discountPct, discount_amount: discountAmt,
        tax_percent: taxPct, tax_amount: taxAmt,
        total: subtotal - discountAmt + taxAmt,
        notes: document.getElementById('doc-notes').value,
        items
      }});
      showToast(`Dokumen berhasil ${status === 'sent' ? 'dikirim' : 'disimpan'}!`, 'success');
      window.location.hash = basePath;
    } catch (err) { showToast(err.message, 'error'); }
  }

  document.getElementById('document-form').addEventListener('submit', (e) => { e.preventDefault(); saveDocument('draft'); });
  document.getElementById('send-document').addEventListener('click', () => saveDocument('sent'));
}
