import { api } from '../utils/api.js';
import { showToast } from '../router.js';

export function renderCompanySettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">⚙️ Pengaturan Perusahaan</h1>
    </div>

    <!-- Tabs -->
    <div class="settings-tabs" id="company-settings-tabs">
      <button class="settings-tab active" data-tab="profile">🏢 Profil Bisnis</button>
      <button class="settings-tab" data-tab="members">👥 Anggota Tim</button>
      <button class="settings-tab" data-tab="roles">🔐 Hak Akses (Roles)</button>
    </div>

    <div id="company-settings-content" class="settings-content">
      <div class="loading-spinner"><span class="spinner"></span> Memuat...</div>
    </div>
  `;

  // Tab switching
  document.querySelectorAll('#company-settings-tabs .settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#company-settings-tabs .settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab);
    });
  });

  loadTab('profile');
}

// Helper to get consistent ID from MongoDB objects
function getId(obj) {
  return obj.id || obj._id;
}

async function loadTab(tab) {
  const content = document.getElementById('company-settings-content');
  content.innerHTML = '<div class="loading-spinner"><span class="spinner"></span> Memuat...</div>';

  try {
    if (tab === 'profile') await renderProfileTab(content);
    else if (tab === 'members') await renderMembersTab(content);
    else if (tab === 'roles') await renderRolesTab(content);
  } catch (err) {
    console.error('Tab load error:', err);
    content.innerHTML = `<div class="empty-state"><p>Gagal memuat. ${err.message}</p></div>`;
  }
}

// === PROFILE TAB ===
async function renderProfileTab(content) {
  const res = await api('/company');
  const c = res.data;

  content.innerHTML = `
    <form id="company-profile-form" class="settings-form card">
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Perusahaan</label>
          <input type="text" class="form-input" id="cp-name" value="${c.name || ''}" required /></div>
        <div class="form-group"><label class="form-label">Email Perusahaan</label>
          <input type="email" class="form-input" id="cp-email" value="${c.email || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Telepon</label>
          <input type="text" class="form-input" id="cp-phone" value="${c.phone || ''}" /></div>
        <div class="form-group"><label class="form-label">NPWP</label>
          <input type="text" class="form-input" id="cp-npwp" value="${c.npwp || ''}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Alamat</label>
        <textarea class="form-input" id="cp-address" rows="2">${c.address || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Bank</label>
          <input type="text" class="form-input" id="cp-bank" value="${c.bank_name || ''}" /></div>
        <div class="form-group"><label class="form-label">No. Rekening</label>
          <input type="text" class="form-input" id="cp-bank-number" value="${c.bank_account_number || ''}" /></div>
        <div class="form-group"><label class="form-label">Atas Nama</label>
          <input type="text" class="form-input" id="cp-bank-name" value="${c.bank_account_name || ''}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Prefix Invoice</label>
          <input type="text" class="form-input" id="cp-prefix" value="${c.invoice_prefix || 'INV'}" /></div>
        <div class="form-group"><label class="form-label">Pajak Default (%)</label>
          <input type="number" class="form-input" id="cp-tax" value="${c.default_tax_percent || 11}" /></div>
      </div>
      <button type="submit" class="btn btn-primary">💾 Simpan Perubahan</button>
    </form>
  `;

  document.getElementById('company-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/company', {
        method: 'PUT',
        body: {
          name: document.getElementById('cp-name').value,
          email: document.getElementById('cp-email').value,
          phone: document.getElementById('cp-phone').value,
          npwp: document.getElementById('cp-npwp').value,
          address: document.getElementById('cp-address').value,
          bank_name: document.getElementById('cp-bank').value,
          bank_account_number: document.getElementById('cp-bank-number').value,
          bank_account_name: document.getElementById('cp-bank-name').value,
          invoice_prefix: document.getElementById('cp-prefix').value,
          default_tax_percent: parseFloat(document.getElementById('cp-tax').value)
        }
      });
      showToast('Pengaturan perusahaan berhasil disimpan!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// === MEMBERS TAB ===
async function renderMembersTab(content) {
  const [membersRes, rolesRes] = await Promise.all([
    api('/company/members'),
    api('/company/roles')
  ]);

  const members = membersRes.data;
  const roles = rolesRes.data;

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3>👥 Anggota Tim (${members.length})</h3>
        <button class="btn btn-primary btn-sm" id="btn-invite-member">➕ Undang Anggota</button>
      </div>
      <div style="overflow-x:auto">
        <table class="table">
          <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
          <tbody>
            ${members.map(m => {
              const memberId = getId(m);
              const memberRoleId = m.role_id ? (typeof m.role_id === 'object' ? getId(m.role_id) : m.role_id) : '';
              return `
              <tr>
                <td><strong>${m.name}</strong> ${m.is_owner ? '<span class="badge badge-success">Owner</span>' : ''}</td>
                <td>${m.email}</td>
                <td>${m.role_name || 'Tanpa Role'}</td>
                <td>${m.is_owner ? '<span style="color:var(--text-muted)">—</span>' : `
                  <div style="display:flex;align-items:center;gap:var(--space-sm)">
                    <select class="form-input form-input--sm member-role-select" data-member-id="${memberId}">
                      ${roles.map(r => `<option value="${getId(r)}" ${memberRoleId === getId(r) ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                    <button class="btn btn-danger btn-sm btn-remove-member" data-member-id="${memberId}" title="Hapus anggota">🗑️</button>
                  </div>
                `}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invite Modal -->
    <div id="invite-modal" class="modal" style="display:none">
      <div class="modal-content card">
        <h3>📩 Undang Anggota Baru</h3>
        <div class="form-group"><label class="form-label">Email (Opsional)</label>
          <input type="email" class="form-input" id="invite-email" placeholder="Kosongkan untuk undangan umum" /></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-input" id="invite-role">
            ${roles.filter(r => r.name !== 'Owner').map(r => `<option value="${getId(r)}">${r.name}</option>`).join('')}
          </select></div>
        <div id="invite-result" style="display:none;margin:var(--space-md) 0;padding:var(--space-md);border-radius:var(--radius-md);background:var(--bg-secondary)">
          <p><strong>Kode Undangan:</strong> <code id="invite-code-display" style="font-size:1.2rem;letter-spacing:2px"></code></p>
          <p id="invite-link-display" style="word-break:break-all;font-size:0.85rem;margin-top:var(--space-sm)"></p>
          <button class="btn btn-sm" id="btn-copy-link">📋 Salin Link</button>
        </div>
        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md)">
          <button class="btn btn-primary" id="btn-send-invite">Buat Undangan</button>
          <button class="btn" id="btn-close-invite">Tutup</button>
        </div>
      </div>
    </div>
  `;

  // Invite modal
  document.getElementById('btn-invite-member').addEventListener('click', () => {
    document.getElementById('invite-modal').style.display = 'flex';
    document.getElementById('invite-result').style.display = 'none';
  });
  document.getElementById('btn-close-invite').addEventListener('click', () => {
    document.getElementById('invite-modal').style.display = 'none';
  });

  document.getElementById('btn-send-invite').addEventListener('click', async () => {
    try {
      const res = await api('/company/invitations', {
        method: 'POST',
        body: {
          email: document.getElementById('invite-email').value || null,
          role_id: document.getElementById('invite-role').value
        }
      });
      document.getElementById('invite-result').style.display = 'block';
      document.getElementById('invite-code-display').textContent = res.data.token;
      document.getElementById('invite-link-display').textContent = res.data.invite_link;
      showToast('Undangan berhasil dibuat!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('btn-copy-link')?.addEventListener('click', () => {
    const link = document.getElementById('invite-link-display').textContent;
    navigator.clipboard.writeText(link);
    showToast('Link undangan disalin!', 'success');
  });

  // Change member role
  document.querySelectorAll('.member-role-select').forEach(select => {
    select.addEventListener('change', async () => {
      try {
        await api(`/company/members/${select.dataset.memberId}/role`, {
          method: 'PUT',
          body: { role_id: select.value }
        });
        showToast('Role berhasil diubah!', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  // Remove member
  document.querySelectorAll('.btn-remove-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Hapus anggota ini dari perusahaan?')) return;
      try {
        await api(`/company/members/${btn.dataset.memberId}`, { method: 'DELETE' });
        showToast('Anggota berhasil dihapus.', 'success');
        renderMembersTab(content);
      } catch (err) { showToast(err.message, 'error'); }
    });
  });
}

// === ROLES TAB ===
async function renderRolesTab(content) {
  const [rolesRes, permsRes] = await Promise.all([
    api('/company/roles'),
    api('/company/permissions')
  ]);

  const roles = rolesRes.data || [];
  const allPerms = permsRes.data || [];

  console.log('Roles data:', JSON.stringify(roles));
  console.log('Permissions data:', allPerms);

  if (roles.length === 0) {
    content.innerHTML = `
      <div class="card" style="padding:var(--space-2xl);text-align:center">
        <p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">Belum ada role. Jalankan migrasi data terlebih dahulu.</p>
        <button class="btn btn-primary" id="btn-add-role-empty">➕ Tambah Role Pertama</button>
      </div>`;
    document.getElementById('btn-add-role-empty')?.addEventListener('click', async () => {
      const name = prompt('Masukkan nama role baru:');
      if (!name) return;
      try {
        await api('/company/roles', { method: 'POST', body: { name, permissions: ['read:document', 'read:dashboard'] } });
        showToast('Role berhasil dibuat!', 'success');
        renderRolesTab(content);
      } catch (err) { showToast(err.message, 'error'); }
    });
    return;
  }

  // Group permissions by resource
  const permGroups = {};
  allPerms.forEach(p => {
    const [action, resource] = p.split(':');
    if (!permGroups[resource]) permGroups[resource] = [];
    permGroups[resource].push({ perm: p, action });
  });

  // Resource labels for better display
  const resourceLabels = {
    document: '📄 Dokumen (Invoice & Order)',
    product: '📦 Produk',
    contact: '👥 Kontak / Mitra',
    receipt: '🧾 Kuitansi',
    dashboard: '📊 Dashboard',
    report: '📈 Laporan',
    reminder: '🔔 Pengingat Pembayaran',
    members: '👤 Anggota Tim',
    roles: '🔐 Hak Akses',
    company_settings: '🏢 Pengaturan Perusahaan'
  };

  const actionLabels = {
    create: 'Buat',
    read: 'Lihat',
    update: 'Edit',
    delete: 'Hapus',
    manage: 'Kelola'
  };

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3>🔐 Hak Akses (Roles)</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-role">➕ Tambah Role</button>
      </div>
      <div class="roles-matrix" style="overflow-x:auto">
        <table class="table roles-table">
          <thead>
            <tr>
              <th style="min-width:200px;position:sticky;left:0;background:var(--bg-elevated);z-index:1">Fitur</th>
              ${roles.map(r => `
                <th style="text-align:center;min-width:120px">
                  <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
                    <span>${r.name}</span>
                    ${r.is_default ? '<span style="font-size:0.65rem;color:var(--text-muted)">🔒 Bawaan</span>' : `<button class="btn-icon btn-delete-role" data-role-id="${getId(r)}" title="Hapus role">🗑️</button>`}
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${Object.keys(permGroups).map(resource => `
              <tr class="permission-group-header">
                <td colspan="${roles.length + 1}" style="font-weight:600;background:var(--bg-secondary);padding:10px var(--space-md)">
                  ${resourceLabels[resource] || `📁 ${resource}`}
                </td>
              </tr>
              ${permGroups[resource].map(({ perm, action }) => `
                <tr>
                  <td style="padding-left:var(--space-xl);position:sticky;left:0;background:var(--bg-elevated);z-index:1">
                    ${actionLabels[action] || action}
                  </td>
                  ${roles.map(r => {
                    const roleId = getId(r);
                    const perms = r.permissions || [];
                    const isChecked = perms.includes(perm);
                    const isOwner = r.name === 'Owner';
                    return `
                    <td style="text-align:center">
                      <input type="checkbox" class="role-perm-checkbox" 
                             data-role-id="${roleId}" data-perm="${perm}" 
                             ${isChecked ? 'checked' : ''}
                             ${isOwner ? 'disabled checked' : ''} />
                    </td>`;
                  }).join('')}
                </tr>
              `).join('')}
            `).join('')}
          </tbody>
        </table>
      </div>
      <button class="btn btn-primary" id="btn-save-roles" style="margin-top:var(--space-lg)">💾 Simpan Perubahan Role</button>
    </div>
  `;

  // Add role
  document.getElementById('btn-add-role').addEventListener('click', async () => {
    const name = prompt('Masukkan nama role baru:');
    if (!name) return;
    try {
      await api('/company/roles', { method: 'POST', body: { name, permissions: ['read:document', 'read:dashboard'] } });
      showToast('Role berhasil dibuat!', 'success');
      renderRolesTab(content);
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Delete role
  document.querySelectorAll('.btn-delete-role').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Hapus role ini?')) return;
      try {
        await api(`/company/roles/${btn.dataset.roleId}`, { method: 'DELETE' });
        showToast('Role berhasil dihapus.', 'success');
        renderRolesTab(content);
      } catch (err) { showToast(err.message, 'error'); }
    });
  });

  // Save all roles permissions
  document.getElementById('btn-save-roles').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-roles');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    try {
      const roleUpdates = {};
      document.querySelectorAll('.role-perm-checkbox').forEach(cb => {
        const roleId = cb.dataset.roleId;
        const perm = cb.dataset.perm;
        if (!roleUpdates[roleId]) roleUpdates[roleId] = [];
        if (cb.checked) roleUpdates[roleId].push(perm);
      });

      for (const [roleId, permissions] of Object.entries(roleUpdates)) {
        // Skip Owner role
        const role = roles.find(r => getId(r) === roleId);
        if (role && role.name === 'Owner') continue;
        await api(`/company/roles/${roleId}`, { method: 'PUT', body: { permissions } });
      }
      showToast('Hak akses berhasil disimpan!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Perubahan Role';
    }
  });
}
