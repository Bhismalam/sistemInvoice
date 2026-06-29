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
      document.getElementById('product-list').innerHTML = res.data.length ? `<div class="table-responsive"><table class="data-table"><thead><tr><th>Produk</th><th>Kategori</th><th>Satuan</th><th style="text-align:right">Harga</th><th style="text-align:right">Stok</th><th></th></tr></thead><tbody>
        ${res.data.map(p => `<tr><td><strong>${p.name}</strong>${p.description ? `<br><span class="text-muted" style="font-size:0.8rem">${p.description}</span>` : ''}</td>
        <td><span class="badge badge-draft">${p.category || '-'}</span></td><td>${p.unit}</td><td style="text-align:right;font-weight:600">${formatCurrency(p.price)}</td>
        <td style="text-align:right"><span style="color:${p.stock < 10 ? 'var(--danger)' : 'var(--text-primary)'}">${p.stock}</span></td>
        <td><button class="btn btn-ghost btn-sm del-p" data-id="${p.id}" style="color:var(--danger)"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button></td></tr>`).join('')}
      </tbody></table></div>` : '<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:box" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada produk</p></div>';
      document.querySelectorAll('.del-p').forEach(b => b.addEventListener('click', async () => { if(await showConfirm('Hapus produk?')){ await api(`/products/${b.dataset.id}`,{method:'DELETE'}); showToast('Produk dihapus','success'); load(); }}));
    } catch(err) { document.getElementById('product-list').innerHTML = `<p class="text-danger">${err.message}</p>`; }
  }

  function showModal() {
    document.getElementById('prod-modal').innerHTML = `<div class="modal-overlay" id="m-bg"><div class="modal-content"><div class="modal-header"><h2 class="modal-title">Tambah Produk</h2><button class="modal-close" id="m-close">✕</button></div>
      <form id="prod-form"><div class="form-group"><label class="form-label">Nama</label><input class="form-input" id="p-name" required /></div>
      <div class="form-group"><label class="form-label">Deskripsi</label><input class="form-input" id="p-desc" /></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Harga</label><input type="number" class="form-input" id="p-price" required min="0" /></div>
      <div class="form-group"><label class="form-label">Stok</label><input type="number" class="form-input" id="p-stock" value="0" min="0" /></div></div>
      <div class="grid-2"><div class="form-group"><label class="form-label">Satuan</label><select class="form-select" id="p-unit"><option>pcs</option><option>jam</option><option>bulan</option><option>tahun</option><option>paket</option><option>kg</option><option>halaman</option></select></div>
      <div class="form-group"><label class="form-label">Kategori</label><input class="form-input" id="p-cat" placeholder="Jasa, Produk, Layanan..." /></div></div>
      <div class="flex gap-md" style="margin-top:var(--space-xl)"><button type="submit" class="btn btn-primary">Simpan</button><button type="button" class="btn btn-secondary" id="m-cancel">Batal</button></div></form></div></div>`;
    const close = () => document.getElementById('prod-modal').innerHTML = '';
    document.getElementById('m-close').addEventListener('click', close);
    document.getElementById('m-cancel').addEventListener('click', close);
    document.getElementById('m-bg').addEventListener('click', e => { if(e.target===e.currentTarget) close(); });
    let isSubmitting = false;
    document.getElementById('prod-form').addEventListener('submit', async e => { 
      e.preventDefault(); 
      if (isSubmitting) return;

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalHTML = submitBtn ? submitBtn.innerHTML : '';

      isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;margin-right:8px;vertical-align:middle;display:inline-block"></span> Menyimpan...';
      }

      try {
        await api('/products', {method:'POST', body:{name:document.getElementById('p-name').value,description:document.getElementById('p-desc').value,price:parseFloat(document.getElementById('p-price').value),stock:parseInt(document.getElementById('p-stock').value),unit:document.getElementById('p-unit').value,category:document.getElementById('p-cat').value}});
        showToast('Produk ditambahkan!','success'); 
        close(); 
        load();
      } catch(err) {
        showToast(err.message,'error');
        isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalHTML;
        }
      }
    });
  }
  load();
}
