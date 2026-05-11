import { api } from '../utils/api.js';
import { showToast } from '../router.js';
import { renderLayout } from '../components/Layout.js';

export function renderCompanySettings(container) {
  const page = renderLayout(container, 'company');

  page.innerHTML = `
    <div class="settings-container" style="margin-top: 0;">
      <div class="settings-header-section">
        <h1 class="page-title">⚙️ Pengaturan Perusahaan</h1>
        <p class="page-subtitle">Kelola profil bisnis, tim, dan hak akses dalam satu tempat.</p>
        
        <div class="settings-nav" id="company-settings-tabs">
          <button class="settings-nav-item active" data-tab="profile">🏢 Profil Bisnis</button>
          <button class="settings-nav-item" data-tab="members">👥 Anggota Tim</button>
          <button class="settings-nav-item" data-tab="roles">🔐 Hak Akses (Roles)</button>
        </div>
      </div>

      <div id="company-settings-content" class="settings-main-content">
        <div class="loading-spinner"><span class="spinner"></span> Memuat...</div>
      </div>
    </div>
  `;

  // Tab switching
  page.querySelectorAll('#company-settings-tabs .settings-nav-item').forEach(tab => {
    tab.addEventListener('click', () => {
      page.querySelectorAll('#company-settings-tabs .settings-nav-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab, page);
    });
  });

  loadTab('profile', page);
}

function getId(obj) {
  if (!obj) return '';
  return obj.id || obj._id || obj;
}

async function loadTab(tab, page) {
  const content = page.querySelector('#company-settings-content');
  content.innerHTML = '<div class="loading-spinner"><span class="spinner"></span> Memuat...</div>';

  try {
    if (tab === 'profile') await renderProfileTab(content, page);
    else if (tab === 'members') await renderMembersTab(content, page);
    else if (tab === 'roles') await renderRolesTab(content, page);
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
async function renderProfileTab(content, page) {
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

  page.querySelector('#company-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/company', {
        method: 'PUT',
        body: {
          name: page.querySelector('#cp-name').value,
          email: page.querySelector('#cp-email').value,
          phone: page.querySelector('#cp-phone').value,
          npwp: page.querySelector('#cp-npwp').value,
          address: page.querySelector('#cp-address').value,
          bank_name: page.querySelector('#cp-bank').value,
          bank_account_number: page.querySelector('#cp-bank-number').value,
          bank_account_name: page.querySelector('#cp-bank-name').value,
          invoice_prefix: page.querySelector('#cp-prefix').value,
          default_tax_percent: parseFloat(page.querySelector('#cp-tax').value)
        }
      });
      showToast('Pengaturan perusahaan berhasil disimpan!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// === MEMBERS TAB ===
async function renderMembersTab(content, page) {
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

  // Invite modal events
  page.querySelector('#btn-invite-member').addEventListener('click', () => {
    page.querySelector('#invite-modal').style.display = 'flex';
    page.querySelector('#invite-result').style.display = 'none';
  });
  page.querySelector('#btn-close-invite').addEventListener('click', () => {
    page.querySelector('#invite-modal').style.display = 'none';
  });

  page.querySelector('#btn-send-invite').addEventListener('click', async () => {
    try {
      const res = await api('/company/invitations', {
        method: 'POST',
        body: {
          email: page.querySelector('#invite-email').value || null,
          role_id: page.querySelector('#invite-role').value
        }
      });
      page.querySelector('#invite-result').style.display = 'block';
      page.querySelector('#invite-code-display').textContent = res.data.token;
      page.querySelector('#invite-link-display').textContent = res.data.invite_link;
      showToast('Undangan berhasil dibuat!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Role update and member removal
  page.querySelectorAll('.member-role-select').forEach(select => {
    select.onchange = async () => {
      try {
        await api(`/company/members/${select.dataset.memberId}/role`, { method: 'PUT', body: { role_id: select.value } });
        showToast('Role anggota diperbarui.', 'success');
      } catch (err) { showToast(err.message, 'error'); }
    };
  });

  page.querySelectorAll('.btn-remove-member').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Hapus anggota ini?')) return;
      try {
        await api(`/company/members/${btn.dataset.memberId}`, { method: 'DELETE' });
        showToast('Anggota dihapus.', 'success');
        renderMembersTab(content, page);
      } catch (err) { showToast(err.message, 'error'); }
    };
  });
}

// === ROLES TAB (REDESIGN) ===
async function renderRolesTab(content, page) {
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

  setupRoleEvents(page, roles, allPerms);
}

function setupRoleEvents(page, roles, allPerms) {
  let currentRoleId = null;

  const resourceLabels = {
    document: '📄 Dokumen', product: '📦 Produk', contact: '👥 Kontak', 
    receipt: '🧾 Kuitansi', dashboard: '📊 Dashboard', report: '📈 Laporan', 
    reminder: '🔔 Pengingat', members: '👤 Anggota', roles: '🔐 Hak Akses', 
    company_settings: '🏢 Pengaturan'
  };

  // Open Edit Modal
  page.querySelectorAll('.btn-edit-role').forEach(btn => {
    btn.addEventListener('click', () => {
      const roleId = btn.dataset.roleId;
      const role = roles.find(r => getId(r) === roleId);
      if (!role) return;

      currentRoleId = roleId;
      page.querySelector('#modal-role-name').textContent = role.name;
      page.querySelector('#modal-role-desc').value = role.description || '';
      page.querySelector('#role-detail-modal').style.display = 'flex';

      renderPermissionGrid(page, role.permissions || [], allPerms, resourceLabels);
    });
  });

  // Close Modals
  const closeModal = () => page.querySelector('#role-detail-modal').style.display = 'none';
  page.querySelector('#btn-close-role-modal').onclick = closeModal;
  page.querySelector('#btn-cancel-role-modal').onclick = closeModal;

  // Save Role Details
  page.querySelector('#btn-save-role-detail').onclick = async () => {
    const btn = page.querySelector('#btn-save-role-detail');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

    const permissions = [];
    page.querySelectorAll('.modal-perm-toggle').forEach(cb => {
      if (cb.checked) permissions.push(cb.dataset.perm);
    });

    try {
      await api(`/company/roles/${currentRoleId}`, {
        method: 'PUT',
        body: {
          description: page.querySelector('#modal-role-desc').value,
          permissions
        }
      });
      showToast('Role berhasil diperbarui!', 'success');
      renderRolesTab(page.querySelector('#company-settings-content'), page);
      closeModal();
    } catch (err) { showToast(err.message, 'error'); }
    finally {
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Perubahan';
    }
  };

  // Add role
  page.querySelector('#btn-add-role').onclick = async () => {
    const name = prompt('Masukkan nama role baru:');
    if (!name) return;
    try {
      await api('/company/roles', { method: 'POST', body: { name, permissions: ['read:document', 'read:dashboard'] } });
      showToast('Role berhasil dibuat!', 'success');
      renderRolesTab(page.querySelector('#company-settings-content'), page);
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Delete role
  page.querySelectorAll('.btn-delete-role').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Hapus role ini?')) return;
      try {
        await api(`/company/members/roles/${btn.dataset.roleId}`, { method: 'DELETE' }); // Adjusted path if needed
        showToast('Role berhasil dihapus.', 'success');
        renderRolesTab(page.querySelector('#company-settings-content'), page);
      } catch (err) { showToast(err.message, 'error'); }
    };
  });
}

function renderPermissionGrid(page, activePerms, allPerms, labels) {
  const grid = page.querySelector('#modal-perm-grid');
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
