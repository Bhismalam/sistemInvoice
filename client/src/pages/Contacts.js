import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { formatCurrency, getInitials } from '../utils/format.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';

export function renderContacts(container) {
  const page = renderLayout(container, 'contacts');
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header"><div><h1 class="page-title">Mitra</h1><p class="page-subtitle">Kelola pelanggan & supplier</p></div>
      <button class="btn btn-primary" id="add-contact-btn">+ Tambah Mitra</button></div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <div class="flex items-center gap-lg" style="margin-bottom:var(--space-xl)">
        <div class="tabs" id="type-tabs"><button class="tab-btn active" data-type="">Semua</button><button class="tab-btn" data-type="customer">Pelanggan</button><button class="tab-btn" data-type="supplier">Supplier</button></div>
        <input type="text" class="form-input" placeholder="Cari mitra..." id="search-contact" style="max-width:240px" />
      </div>
      <div id="contact-list"><div class="page-loading"><div class="spinner"></div></div></div>
    </div>
    <div id="contact-modal"></div>
  </div>`;

  let currentType = '', searchTerm = '';
  document.getElementById('type-tabs').addEventListener('click', e => { if (e.target.classList.contains('tab-btn')) { document.querySelectorAll('#type-tabs .tab-btn').forEach(b=>b.classList.remove('active')); e.target.classList.add('active'); currentType = e.target.dataset.type; load(); }});
  document.getElementById('search-contact').addEventListener('input', e => { searchTerm = e.target.value; clearTimeout(window._st); window._st = setTimeout(load, 300); });
  document.getElementById('add-contact-btn').addEventListener('click', () => showContactModal());

  async function load() {
    try {
      const res = await api(`/contacts?type=${currentType}&search=${searchTerm}&limit=50`);
      const list = document.getElementById('contact-list');
      list.innerHTML = res.data.length ? res.data.map(c => `
        <div class="flex items-center gap-lg" style="padding:var(--space-base);border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer" onmouseover="this.style.background='var(--bg-glass-light)'" onmouseout="this.style.background='transparent'">
          <div class="header__avatar" style="width:42px;height:42px;font-size:0.85rem;flex-shrink:0">${getInitials(c.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="flex items-center gap-sm"><strong class="truncate">${c.name}</strong><span class="badge ${c.type==='customer'?'badge-sent':'badge-draft'}" style="font-size:0.65rem">${c.type==='customer'?'Pelanggan':'Supplier'}</span></div>
            <p class="text-muted truncate" style="font-size:0.8rem">${c.email || c.phone || '-'}</p>
          </div>
          <div style="text-align:right;font-size:0.85rem"><div style="font-weight:600">${formatCurrency(c.stats?.total_revenue || 0)}</div><div class="text-muted">${c.stats?.invoice_count || 0} invoice</div></div>
          <div style="display:flex;gap:4px"><button class="btn btn-ghost btn-sm edit-c" data-id="${c.id}"><iconify-icon icon="lucide:pencil" width="16" height="16"></iconify-icon></button><button class="btn btn-ghost btn-sm del-c" data-id="${c.id}" style="color:var(--danger)"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button></div>
        </div>`).join('') : '<div class="empty-state"><div class="empty-state__icon"><iconify-icon icon="lucide:users" width="48" height="48"></iconify-icon></div><p class="empty-state__title">Belum ada mitra</p></div>';
      list.querySelectorAll('.del-c').forEach(b => b.addEventListener('click', async () => { if (await showConfirm('Hapus kontak?')) { await api(`/contacts/${b.dataset.id}`, {method:'DELETE'}); showToast('Kontak dihapus','success'); load(); }}));
    } catch (err) { document.getElementById('contact-list').innerHTML = `<p class="text-danger">${err.message}</p>`; }
  }

  function showContactModal(data) {
    document.getElementById('contact-modal').innerHTML = `
      <div class="modal-overlay" id="modal-bg"><div class="modal-content">
        <div class="modal-header"><h2 class="modal-title">${data?'Edit':'Tambah'} Mitra</h2><button class="modal-close" id="close-modal">✕</button></div>
        <form id="contact-form">
          <div class="form-group"><label class="form-label">Tipe</label><select class="form-select" id="c-type" required><option value="customer">Pelanggan</option><option value="supplier">Supplier</option></select></div>
          <div class="form-group"><label class="form-label">Nama</label><input class="form-input" id="c-name" required placeholder="Nama perusahaan/kontak" /></div>
          <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="c-email" placeholder="email@example.com" /></div>
          <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="c-phone" placeholder="08xxxxxxxxxx" /></div>
          <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input form-textarea" id="c-address" placeholder="Alamat lengkap"></textarea></div>
          <div class="flex gap-md" style="margin-top:var(--space-xl)"><button type="submit" class="btn btn-primary">Simpan</button><button type="button" class="btn btn-secondary" id="cancel-modal">Batal</button></div>
        </form>
      </div></div>`;
    document.getElementById('close-modal').addEventListener('click', () => document.getElementById('contact-modal').innerHTML = '');
    document.getElementById('cancel-modal').addEventListener('click', () => document.getElementById('contact-modal').innerHTML = '');
    document.getElementById('modal-bg').addEventListener('click', e => { if (e.target === e.currentTarget) document.getElementById('contact-modal').innerHTML = ''; });
    let isSubmitting = false;
    document.getElementById('contact-form').addEventListener('submit', async e => {
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
        await api('/contacts', { method: 'POST', body: { type: document.getElementById('c-type').value, name: document.getElementById('c-name').value, email: document.getElementById('c-email').value, phone: document.getElementById('c-phone').value, address: document.getElementById('c-address').value }});
        showToast('Kontak berhasil ditambahkan!', 'success');
        document.getElementById('contact-modal').innerHTML = '';
        load();
      } catch (err) { 
        showToast(err.message, 'error'); 
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
