import { renderLayout } from '../components/Layout.js';
import { api } from '../utils/api.js';
import { showToast } from '../router.js';

export function renderSettings(container) {
  const page = renderLayout(container, 'settings');
  page.innerHTML = `<div class="animate-slide-up">
    <div class="page-header"><h1 class="page-title">Pengaturan</h1></div>
    <div class="glass-card" style="padding:var(--space-xl)">
      <h3 style="font-weight:600;margin-bottom:var(--space-xl)">Profil Bisnis</h3>
      <form id="settings-form">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Nama Bisnis</label><input class="form-input" id="s-bname" /></div>
          <div class="form-group"><label class="form-label">NPWP</label><input class="form-input" id="s-npwp" /></div>
          <div class="form-group"><label class="form-label">Telepon</label><input class="form-input" id="s-phone" /></div>
          <div class="form-group"><label class="form-label">Prefix Invoice</label><input class="form-input" id="s-prefix" /></div>
        </div>
        <div class="form-group"><label class="form-label">Alamat</label><textarea class="form-input form-textarea" id="s-addr"></textarea></div>
        <div class="form-group"><label class="form-label">PPN Default (%)</label><input type="number" class="form-input" id="s-tax" style="max-width:120px" /></div>
        <button type="submit" class="btn btn-primary" style="margin-top:var(--space-xl)">💾 Simpan Pengaturan</button>
      </form>
    </div></div>`;

  api('/settings').then(res => {
    const d = res.data;
    document.getElementById('s-bname').value = d.business_name || '';
    document.getElementById('s-npwp').value = d.npwp || '';
    document.getElementById('s-phone').value = d.phone || '';
    document.getElementById('s-prefix').value = d.invoice_prefix || 'INV';
    document.getElementById('s-addr').value = d.business_address || '';
    document.getElementById('s-tax').value = d.default_tax_percent || 11;
  });

  document.getElementById('settings-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await api('/settings', {method:'PUT', body:{business_name:document.getElementById('s-bname').value,npwp:document.getElementById('s-npwp').value,phone:document.getElementById('s-phone').value,invoice_prefix:document.getElementById('s-prefix').value,business_address:document.getElementById('s-addr').value,default_tax_percent:parseFloat(document.getElementById('s-tax').value)}});
      showToast('Pengaturan disimpan!','success');
    } catch(err){showToast(err.message,'error');}
  });
}
