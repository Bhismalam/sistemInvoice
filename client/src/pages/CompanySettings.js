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
    const isNotFound = err.message && err.message.includes('tidak ditemukan');
    content.innerHTML = `
      <div class="card" style="padding:var(--space-2xl);text-align:center">
        <div style="font-size:2rem;margin-bottom:var(--space-md)">${isNotFound ? '🏢' : '❌'}</div>
        <h3 style="margin-bottom:var(--space-sm)">${isNotFound ? 'Perusahaan Belum Terdaftar' : 'Gagal Memuat'}</h3>
        <p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">${
          isNotFound 
            ? 'Akun Anda belum terhubung dengan perusahaan. Silakan logout dan login kembali untuk mengaktifkan fitur ini secara otomatis.'
            : err.message
        }</p>
        ${isNotFound ? `<button class="btn btn-primary" onclick="localStorage.clear(); window.location.hash='#/login'; window.location.reload();">🔄 Logout & Login Ulang</button>` : ''}
      </div>
    `;
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

  // Invite modal events... (same logic as before)
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
}

// === ROLES TAB (REDESIGN) ===
async function renderRolesTab(content) {
  const [rolesRes, permsRes] = await Promise.all([
    api('/company/roles'),
    api('/company/permissions')
  ]);

  const roles = rolesRes.data || [];
  const allPerms = permsRes.data || [];

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3>🔐 Konfigurasi Role Akses</h3>
        <button class="btn btn-primary btn-sm" id="btn-add-role">➕ Tambah Role</button>
      </div>
      
      <div class="roles-matrix">
        <table class="roles-table">
          <thead>
            <tr>
              <th>ROLE</th>
              <th style="text-align:center">C</th>
              <th style="text-align:center">R</th>
              <th style="text-align:center">U</th>
              <th style="text-align:center">D</th>
              <th style="text-align:center">STATUS</th>
              <th style="text-align:center">AKSI</th>
            </tr>
          </thead>
          <tbody>
            ${roles.map(r => {
              const roleId = getId(r);
              const perms = r.permissions || [];
              const hasC = perms.some(p => p.startsWith('create:'));
              const hasR = perms.some(p => p.startsWith('read:'));
              const hasU = perms.some(p => p.startsWith('update:'));
              const hasD = perms.some(p => p.startsWith('delete:'));
              
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:1.1rem">
                        ${r.name === 'Owner' ? '👑' : '👤'}
                      </div>
                      <div>
                        <div style="font-weight:600">${r.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${r.description || 'Tidak ada deskripsi'}</div>
                      </div>
                    </div>
                  </td>
                  <td style="text-align:center">
                    <label class="switch">
                      <input type="checkbox" ${hasC ? 'checked' : ''} disabled>
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td style="text-align:center">
                    <label class="switch">
                      <input type="checkbox" ${hasR ? 'checked' : ''} disabled>
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td style="text-align:center">
                    <label class="switch">
                      <input type="checkbox" ${hasU ? 'checked' : ''} disabled>
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td style="text-align:center">
                    <label class="switch">
                      <input type="checkbox" ${hasD ? 'checked' : ''} disabled>
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td style="text-align:center">
                    <span class="status-pill status-pill--active">
                      <span style="width:6px;height:6px;border-radius:50%;background:currentColor"></span>
                      AKTIF
                    </span>
                  </td>
                  <td style="text-align:center">
                    <div class="action-group" style="justify-content:center">
                      <button class="btn-action btn-edit-role" data-role-id="${roleId}" title="Atur Hak Akses">⚙️</button>
                      ${r.is_default ? '' : `<button class="btn-action btn-action--delete btn-delete-role" data-role-id="${roleId}">🗑️</button>`}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Edit Detail -->
    <div id="role-detail-modal" class="modal" style="display:none">
      <div class="modal-content card" style="max-width:700px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
          <h3>⚙️ Atur Hak Akses: <span id="modal-role-name"></span></h3>
          <button class="btn-icon" id="btn-close-role-modal">✕</button>
        </div>
        
        <div class="form-group">
          <label class="form-label">Deskripsi Role</label>
          <input type="text" class="form-input" id="modal-role-desc" />
        </div>

        <div class="perm-detail-grid" id="modal-perm-grid">
          <!-- Permissions will be rendered here -->
        </div>

        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-xl);justify-content:flex-end">
          <button class="btn btn-primary" id="btn-save-role-detail">💾 Simpan Perubahan</button>
          <button class="btn" id="btn-cancel-role-modal">Batal</button>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  setupRoleEvents(content, roles, allPerms);
}

function setupRoleEvents(content, roles, allPerms) {
  let currentRoleId = null;

  const resourceLabels = {
    document: '📄 Dokumen', product: '📦 Produk', contact: '👥 Kontak', 
    receipt: '🧾 Kuitansi', dashboard: '📊 Dashboard', report: '📈 Laporan', 
    reminder: '🔔 Pengingat', members: '👤 Anggota', roles: '🔐 Hak Akses', 
    company_settings: '🏢 Pengaturan'
  };

  const resourceIcons = { document: '📄', product: '📦', contact: '👥', receipt: '🧾', dashboard: '📊', report: '📈', reminder: '🔔', members: '👤', roles: '🔐', company_settings: '🏢' };

  // Open Edit Modal
  document.querySelectorAll('.btn-edit-role').forEach(btn => {
    btn.addEventListener('click', () => {
      const roleId = btn.dataset.roleId;
      const role = roles.find(r => getId(r) === roleId);
      if (!role) return;

      currentRoleId = roleId;
      document.getElementById('modal-role-name').textContent = role.name;
      document.getElementById('modal-role-desc').value = role.description || '';
      document.getElementById('role-detail-modal').style.display = 'flex';

      renderPermissionGrid(role.permissions || [], allPerms, resourceLabels);
    });
  });

  // Close Modals
  const closeModal = () => document.getElementById('role-detail-modal').style.display = 'none';
  document.getElementById('btn-close-role-modal').onclick = closeModal;
  document.getElementById('btn-cancel-role-modal').onclick = closeModal;

  // Save Role Details
  document.getElementById('btn-save-role-detail').onclick = async () => {
    const btn = document.getElementById('btn-save-role-detail');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

    const permissions = [];
    document.querySelectorAll('.modal-perm-toggle').forEach(cb => {
      if (cb.checked) permissions.push(cb.dataset.perm);
    });

    try {
      await api(`/company/roles/${currentRoleId}`, {
        method: 'PUT',
        body: {
          description: document.getElementById('modal-role-desc').value,
          permissions
        }
      });
      showToast('Role berhasil diperbarui!', 'success');
      renderRolesTab(document.getElementById('company-settings-content'));
      closeModal();
    } catch (err) { showToast(err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Perubahan';
    }
  };

  // Add role
  document.getElementById('btn-add-role').onclick = async () => {
    const name = prompt('Masukkan nama role baru:');
    if (!name) return;
    try {
      await api('/company/roles', { method: 'POST', body: { name, permissions: ['read:document', 'read:dashboard'] } });
      showToast('Role berhasil dibuat!', 'success');
      renderRolesTab(document.getElementById('company-settings-content'));
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Delete role
  document.querySelectorAll('.btn-delete-role').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Hapus role ini?')) return;
      try {
        await api(`/company/roles/${btn.dataset.roleId}`, { method: 'DELETE' });
        showToast('Role berhasil dihapus.', 'success');
        renderRolesTab(document.getElementById('company-settings-content'));
      } catch (err) { showToast(err.message, 'error'); }
    };
  });
}

function renderPermissionGrid(activePerms, allPerms, labels) {
  const grid = document.getElementById('modal-perm-grid');
  const groups = {};
  
  allPerms.forEach(p => {
    const [action, resource] = p.split(':');
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push({ perm: p, action });
  });

  grid.innerHTML = Object.keys(groups).map(resource => `
    <div class="perm-resource-row">
      <div class="perm-resource-name">${labels[resource] || resource}</div>
      <div class="perm-resource-toggles">
        ${groups[resource].map(({ perm, action }) => `
          <div class="perm-toggle-item">
            <span class="perm-toggle-label">${action.charAt(0)}</span>
            <label class="switch">
              <input type="checkbox" class="modal-perm-toggle" data-perm="${perm}" ${activePerms.includes(perm) ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
