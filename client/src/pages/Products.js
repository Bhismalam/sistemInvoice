import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderProducts(container) {
  const page = renderLayout(container, 'products');
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header"><div><h1 class="page-title">Produk & Jasa</h1><p class="page-subtitle">Kelola katalog produk dan jasa</p></div>
      <button class="btn btn-primary" id="add-product">+ Tambah Produk</button></div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <input type="text" class="form-input" placeholder="Cari produk..." id="search-prod" style="max-width:300px;margin-bottom:var(--space-xl)" />
      <div id="product-list"><div class="page-loading"><div class="spinner"></div></div></div>
    </div><div id="prod-modal"></div></div>`;

  let search = '';
  document.getElementById('search-prod').addEventListener('input', e => { search = e.target.value; clearTimeout(window._pt); window._pt = setTimeout(load, 300); });
  document.getElementById('add-product').addEventListener('click', () => showModal());

  async function load() {
    try {
      const res = await api(`/products?search=${search}&limit=50`);
      
      const tableContent = res.data.length ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Produk</th>
              <th>Kategori</th>
              <th>Satuan</th>
              <th style="text-align:right">Harga</th>
              <th style="text-align:right;padding-right:24px">Stok</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${res.data.map(p => `
              <tr>
                <td>
                  <strong>${p.name}</strong>
                  ${p.description ? `<br><span class="text-muted" style="font-size:0.8rem">${p.description}</span>` : ''}
                </td>
                <td><span class="badge badge-draft">${p.category || '-'}</span></td>
                <td>${p.unit}</td>
                <td style="text-align:right;font-weight:600">${formatCurrency(p.price)}</td>
                <td style="text-align:right">
                  <div style="display:inline-flex;align-items:center;gap:6px;background:var(--border-color-light);padding:4px 8px;border-radius:var(--radius-sm);border:1px solid var(--border-color)">
                    <button class="btn-adjust-stock btn-minus" data-id="${p.id}" data-current="${p.stock}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:2px;display:flex;align-items:center" title="Kurangi Stok"><iconify-icon icon="lucide:minus" width="12" height="12"></iconify-icon></button>
                    <span style="font-weight:600;min-width:20px;text-align:center;color:${p.stock < 10 ? 'var(--danger)' : 'var(--text-primary)'}">${p.stock}</span>
                    <button class="btn-adjust-stock btn-plus" data-id="${p.id}" data-current="${p.stock}" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:2px;display:flex;align-items:center" title="Tambah Stok"><iconify-icon icon="lucide:plus" width="12" height="12"></iconify-icon></button>
                  </div>
                </td>
                <td>
                  <div style="display:flex;gap:4px;justify-content:flex-end">
                    <button class="btn btn-ghost btn-sm edit-p" data-id="${p.id}" title="Edit Produk"><iconify-icon icon="lucide:pencil" width="16" height="16"></iconify-icon></button>
                    <button class="btn btn-ghost btn-sm del-p" data-id="${p.id}" style="color:var(--danger)" title="Hapus Produk"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:box" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada produk</p></div>`;
      
      document.getElementById('product-list').innerHTML = tableContent;
      
      // Delete handler
      document.querySelectorAll('.del-p').forEach(b => b.addEventListener('click', async () => { 
        if (await showConfirm('Hapus produk?')) { 
          await api(`/products/${b.dataset.id}`, { method: 'DELETE' }); 
          showToast('Produk dihapus', 'success'); 
          load(); 
        }
      }));

      // Edit handler
      document.querySelectorAll('.edit-p').forEach(b => b.addEventListener('click', async () => {
        try {
          const prodRes = await api(`/products/${b.dataset.id}`);
          showModal(prodRes.data);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }));

      // Stock adjuster handlers (+ and -)
      document.querySelectorAll('.btn-adjust-stock').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const currentStock = parseInt(btn.dataset.current);
          const isPlus = btn.classList.contains('btn-plus');
          const newStock = isPlus ? currentStock + 1 : Math.max(0, currentStock - 1);
          
          if (newStock === currentStock) return; // Prevent negative stock
          
          try {
            // Disable button briefly or show feedback
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            
            // Update stock value on server via standard PUT endpoint
            await api(`/products/${id}`, { method: 'PUT', body: { stock: newStock } });
            
            // Fast render update locally without reloading the whole list!
            const countSpan = btn.parentElement.querySelector('span');
            countSpan.textContent = newStock;
            countSpan.style.color = newStock < 10 ? 'var(--danger)' : 'var(--text-primary)';
            
            // Update datasets on both sibling buttons
            btn.parentElement.querySelectorAll('.btn-adjust-stock').forEach(b => b.dataset.current = newStock);
            
            showToast('Stok berhasil diperbarui!', 'success', 1200); 
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
          }
        });
      });

    } catch (err) { 
      document.getElementById('product-list').innerHTML = `<p class="text-danger">${err.message}</p>`; 
    }
  }

  function showModal(data = null) {
    const isEdit = !!data;
    document.getElementById('prod-modal').innerHTML = `<div class="modal-overlay" id="m-bg"><div class="modal-content"><div class="modal-header"><h2 class="modal-title">${isEdit ? 'Edit Produk' : 'Tambah Produk'}</h2><button class="modal-close" id="m-close">✕</button></div>
      <form id="prod-form"><div class="form-group"><label class="form-label">Nama</label><input class="form-input" id="p-name" required value="${isEdit ? data.name : ''}" /></div>
      <div class="form-group"><label class="form-label">Deskripsi</label><input class="form-input" id="p-desc" value="${isEdit && data.description ? data.description : ''}" /></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Harga</label><input type="number" class="form-input" id="p-price" required min="0" value="${isEdit ? data.price : ''}" /></div>
      <div class="form-group"><label class="form-label">Stok</label><input type="number" class="form-input" id="p-stock" value="${isEdit ? data.stock : '0'}" min="0" /></div></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Satuan</label><select class="form-select" id="p-unit">
        <option ${isEdit && data.unit === 'pcs' ? 'selected' : ''}>pcs</option>
        <option ${isEdit && data.unit === 'jam' ? 'selected' : ''}>jam</option>
        <option ${isEdit && data.unit === 'bulan' ? 'selected' : ''}>bulan</option>
        <option ${isEdit && data.unit === 'tahun' ? 'selected' : ''}>tahun</option>
        <option ${isEdit && data.unit === 'paket' ? 'selected' : ''}>paket</option>
        <option ${isEdit && data.unit === 'kg' ? 'selected' : ''}>kg</option>
        <option ${isEdit && data.unit === 'halaman' ? 'selected' : ''}>halaman</option>
      </select></div>
      <div class="form-group"><label class="form-label">Kategori</label><input class="form-input" id="p-cat" placeholder="Jasa, Produk, Layanan..." value="${isEdit && data.category ? data.category : ''}" /></div></div>
      <div class="flex gap-md" style="margin-top:var(--space-xl)"><button type="submit" class="btn btn-primary">Simpan</button><button type="button" class="btn btn-secondary" id="m-cancel">Batal</button></div></form></div></div>`;
    
    const close = () => document.getElementById('prod-modal').innerHTML = '';
    document.getElementById('m-close').addEventListener('click', close);
    document.getElementById('m-cancel').addEventListener('click', close);
    document.getElementById('m-bg').addEventListener('click', e => { if(e.target===e.currentTarget) close(); });
    
    document.getElementById('prod-form').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const payload = {
          name: document.getElementById('p-name').value,
          description: document.getElementById('p-desc').value,
          price: parseFloat(document.getElementById('p-price').value),
          stock: parseInt(document.getElementById('p-stock').value),
          unit: document.getElementById('p-unit').value,
          category: document.getElementById('p-cat').value
        };
        
        if (isEdit) {
          await api(`/products/${data.id}`, { method: 'PUT', body: payload });
          showToast('Produk diperbarui!', 'success');
        } else {
          await api('/products', { method: 'POST', body: payload });
          showToast('Produk ditambahkan!', 'success');
        }
        close();
        load();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  load();
}
