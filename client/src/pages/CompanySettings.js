import { api } from '../utils/api.js';
import { showToast } from '../router.js';
import { showConfirm } from '../utils/confirm.js';
import { renderLayout } from '../components/Layout.js';

export async function renderCompanySettings(container) {
  const page = renderLayout(container, 'company');

  // Show loading while fetching user info
  page.innerHTML = '<div class="loading-spinner"><span class="spinner"></span> Memuat...</div>';

  // Fetch user info to determine permissions
  let userInfo = { user: {}, company: null, role: null };
  try {
    const res = await api('/auth/me');
    userInfo = res.data;
  } catch (err) {
    console.error('Failed to fetch user info:', err);
  }

  const { role, company } = userInfo;
  const perms = role?.permissions || [];
  const isOwner = role?.name === 'Owner';
  const canManageMembers = isOwner || perms.includes('read:members');
  const canManageRoles = isOwner || perms.includes('read:roles');
  const canEditCompany = isOwner;

  page.innerHTML = `
    <div class="settings-container" style="margin-top: 0;">
      <div class="settings-header-section">
        <h1 class="page-title"><iconify-icon icon="lucide:settings" width="24" height="24" style="vertical-align:-4px"></iconify-icon> Pengaturan</h1>
        <p class="page-subtitle">Kelola akun${canEditCompany ? ', profil bisnis' : ''}${canManageMembers ? ', tim' : ''}${canManageRoles ? ', dan hak akses' : ''} dalam satu tempat.</p>
        
        <div class="settings-nav" id="company-settings-tabs">
          <button class="settings-nav-item active" data-tab="account"><iconify-icon icon="lucide:user" width="16" height="16"></iconify-icon> Profil Akun</button>
          <button class="settings-nav-item" data-tab="profile"><iconify-icon icon="lucide:building-2" width="16" height="16"></iconify-icon> Profil Bisnis</button>
          ${canManageMembers ? '<button class="settings-nav-item" data-tab="members"><iconify-icon icon="lucide:users" width="16" height="16"></iconify-icon> Anggota Tim</button>' : ''}
          ${canManageRoles ? '<button class="settings-nav-item" data-tab="roles"><iconify-icon icon="lucide:shield-check" width="16" height="16"></iconify-icon> Hak Akses (Roles)</button>' : ''}
        </div>
      </div>

      <div id="company-settings-content" class="settings-main-content">
        <div class="loading-spinner"><span class="spinner"></span> Memuat...</div>
      </div>
    </div>
  `;

  // Store permissions context on page element for use in tab renderers
  page._permCtx = { isOwner, canManageMembers, canManageRoles, canEditCompany, userInfo };

  // Tab switching
  page.querySelectorAll('#company-settings-tabs .settings-nav-item').forEach(tab => {
    tab.addEventListener('click', () => {
      page.querySelectorAll('#company-settings-tabs .settings-nav-item').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab, page);
    });
  });

  loadTab('account', page);
}

function getId(obj) {
  if (!obj) return '';
  return obj.id || obj._id || obj;
}

async function loadTab(tab, page) {
  const content = page.querySelector('#company-settings-content');
  content.innerHTML = '<div class="loading-spinner"><span class="spinner"></span> Memuat...</div>';

  try {
    if (tab === 'account') await renderAccountTab(content, page);
    else if (tab === 'profile') await renderProfileTab(content, page);
    else if (tab === 'members') await renderMembersTab(content, page);
    else if (tab === 'roles') await renderRolesTab(content, page);
  } catch (err) {
    console.error('Tab load error:', err);
    const isNotFound = err.message && err.message.includes('tidak ditemukan');
    content.innerHTML = `
      <div class="card" style="padding:var(--space-2xl);text-align:center">
        <div style="font-size:2rem;margin-bottom:var(--space-md)">${isNotFound ? '<iconify-icon icon="lucide:building-2" width="48" height="48"></iconify-icon>' : '<iconify-icon icon="lucide:x-circle" width="48" height="48"></iconify-icon>'}</div>
        <h3 style="margin-bottom:var(--space-sm)">${isNotFound ? 'Perusahaan Belum Terdaftar' : 'Gagal Memuat'}</h3>
        <p style="color:var(--text-secondary);margin-bottom:var(--space-lg)">${
          isNotFound 
            ? 'Akun Anda belum terhubung dengan perusahaan. Silakan logout dan login kembali untuk mengaktifkan fitur ini secara otomatis.'
            : err.message
        }</p>
        ${isNotFound ? `<button class="btn btn-primary" onclick="sessionStorage.clear(); localStorage.clear(); window.location.hash='#/login'; window.location.reload();"><iconify-icon icon="lucide:refresh-cw" width="16" height="16"></iconify-icon> Logout & Login Ulang</button>` : ''}
      </div>
    `;
  }
}

// === ACCOUNT TAB (NEW - replaces old Settings page) ===
async function renderAccountTab(content, page) {
  const res = await api('/auth/me');
  const { user, company, role } = res.data;

  content.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-xl)">
      <!-- User Info Card -->
      <div class="card" style="padding:var(--space-xl)">
        <div style="display:flex;align-items:center;gap:var(--space-lg);margin-bottom:var(--space-xl)">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;color:white;flex-shrink:0">
            ${(user.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <h2 style="margin:0;font-size:1.25rem;font-weight:700">${user.name}</h2>
            <p style="margin:4px 0 0 0;color:var(--text-secondary);font-size:0.9rem">${user.email}</p>
            <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-sm);flex-wrap:wrap">
              <span class="status-pill status-pill--active">
                <span style="width:6px;height:6px;border-radius:50%;background:currentColor"></span>
                ${role ? role.name : 'Tanpa Role'}
              </span>
              ${company ? `<span style="font-size:0.8rem;color:var(--text-muted);display:flex;align-items:center;gap:4px"><iconify-icon icon="lucide:building-2" width="14" height="14"></iconify-icon> ${company.name}</span>` : ''}
            </div>
          </div>
        </div>

        <form id="account-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input type="text" class="form-input" id="acc-name" value="${user.name || ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="acc-email" value="${user.email || ''}" disabled style="opacity:0.6;cursor:not-allowed" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nomor HP</label>
              <input type="tel" class="form-input" id="acc-phone" value="${user.phone || ''}" />
            </div>
          </div>
          <button type="submit" class="btn btn-primary"><iconify-icon icon="lucide:save" width="16" height="16"></iconify-icon> Simpan Profil</button>
        </form>
      </div>

      <!-- Role & Permissions Summary -->
      ${role ? `
      <div class="card" style="padding:var(--space-xl)">
        <h3 style="margin-bottom:var(--space-lg);font-weight:600"><iconify-icon icon="lucide:shield-check" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Hak Akses Anda</h3>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-sm)">
          ${(role.permissions || []).map(p => {
            const [action, resource] = p.split(':');
            const icons = { create: '<iconify-icon icon="lucide:plus" width="12" height="12"></iconify-icon>', read: '<iconify-icon icon="lucide:eye" width="12" height="12"></iconify-icon>', update: '<iconify-icon icon="lucide:pencil" width="12" height="12"></iconify-icon>', delete: '<iconify-icon icon="lucide:trash-2" width="12" height="12"></iconify-icon>' };
            return `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:500;background:rgba(99,102,241,0.1);color:var(--accent-primary)">${icons[action] || '•'} ${action}:${resource}</span>`;
          }).join('')}
        </div>
        ${role.name === 'Owner' ? '<p style="margin-top:var(--space-md);font-size:0.85rem;color:var(--text-muted)"><iconify-icon icon="lucide:lightbulb" width="14" height="14" style="vertical-align:-2px"></iconify-icon> Sebagai Owner, Anda memiliki akses penuh ke semua fitur.</p>' : ''}
      </div>` : ''}

      <!-- Change Password -->
      <div class="card" style="padding:var(--space-xl)">
        <h3 style="margin-bottom:var(--space-lg);font-weight:600"><iconify-icon icon="lucide:key-round" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Ganti Password</h3>
        <form id="password-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Password Lama</label>
              <input type="password" class="form-input" id="pw-old" placeholder="Masukkan password lama" required minlength="8" />
            </div>
            <div class="form-group">
              <label class="form-label">Password Baru</label>
              <input type="password" class="form-input" id="pw-new" placeholder="Minimal 8 karakter" required minlength="8" />
            </div>
          </div>
          <button type="submit" class="btn btn-primary"><iconify-icon icon="lucide:refresh-cw" width="16" height="16"></iconify-icon> Ganti Password</button>
        </form>
      </div>
    </div>
  `;

  // Save profile
  page.querySelector('#account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/auth/update-profile', {
        method: 'PUT',
        body: {
          name: page.querySelector('#acc-name').value,
          phone: page.querySelector('#acc-phone').value
        }
      });
      // Update session storage
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}');
      stored.name = page.querySelector('#acc-name').value;
      stored.phone = page.querySelector('#acc-phone').value;
      sessionStorage.setItem('user', JSON.stringify(stored));
      showToast('Profil berhasil disimpan!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });

  // Change password
  page.querySelector('#password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/auth/change-password', {
        method: 'PUT',
        body: {
          old_password: page.querySelector('#pw-old').value,
          new_password: page.querySelector('#pw-new').value
        }
      });
      page.querySelector('#pw-old').value = '';
      page.querySelector('#pw-new').value = '';
      showToast('Password berhasil diganti!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  });
}

// === PROFILE TAB ===
async function renderProfileTab(content, page) {
  const res = await api('/company');
  const c = res.data;
  const ctx = page._permCtx || {};
  const readOnly = !ctx.canEditCompany;
  const ro = readOnly ? 'disabled style="opacity:0.6;cursor:not-allowed"' : '';

  const apiBase = import.meta.env.VITE_API_URL || '/api';
  const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const serverBase = cleanApiBase.replace(/\/api$/, '');

  content.innerHTML = `
    <form id="company-profile-form" class="settings-form card">
      ${readOnly ? '<div style="padding:10px 14px;border-radius:var(--radius-md);background:rgba(99,102,241,0.08);color:var(--accent-primary);font-size:0.85rem;margin-bottom:var(--space-lg)">Anda hanya dapat melihat informasi perusahaan. Hubungi Owner untuk mengubah data.</div>' : ''}
      
      <!-- COMPANY LOGO SECTION -->
      <div class="form-group" style="margin-bottom:var(--space-xl);border-bottom:1px solid var(--border);padding-bottom:var(--space-xl)">
        <label class="form-label">Logo Perusahaan</label>
        <div style="display:flex;align-items:center;gap:var(--space-lg);margin-top:8px">
          <div id="company-logo-preview" style="width:120px;height:70px;border-radius:var(--radius-sm);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-primary);position:relative">
            ${c.logo ? `
              <img src="${c.logo.startsWith('data:') ? c.logo : serverBase + c.logo}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain" />
            ` : `
              <span class="text-muted" style="font-size:0.75rem;font-weight:600">BELUM ADA LOGO</span>
            `}
          </div>
          ${!readOnly ? `
            <div style="display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;gap:10px">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-select-logo" style="padding:6px 12px;font-size:0.8rem">
                  <iconify-icon icon="lucide:upload" width="14" height="14" style="vertical-align:-2px;margin-right:4px"></iconify-icon> Pilih Logo
                </button>
                ${c.logo ? `
                  <button type="button" class="btn btn-danger-outline btn-sm" id="btn-delete-logo" style="padding:6px 12px;font-size:0.8rem">
                    <iconify-icon icon="lucide:trash-2" width="14" height="14" style="vertical-align:-2px;margin-right:4px"></iconify-icon> Hapus
                  </button>
                ` : ''}
              </div>
              <input type="file" id="cp-logo-input" accept="image/png, image/jpeg, image/jpg" style="display:none" />
              <p class="text-muted" style="font-size:0.75rem;margin:0">Mendukung format PNG, JPG, JPEG. Ukuran maks 2MB.</p>
            </div>
          ` : ''}
        </div>
      </div>
      ${readOnly ? '<div style="padding:10px 14px;border-radius:var(--radius-md);background:rgba(99,102,241,0.08);color:var(--accent-primary);font-size:0.85rem;margin-bottom:var(--space-lg)">ℹ️ Anda hanya dapat melihat informasi perusahaan. Hubungi Owner untuk mengubah data.</div>' : ''}
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Perusahaan</label>
          <input type="text" class="form-input" id="cp-name" value="${c.name || ''}" ${ro} required /></div>
        <div class="form-group"><label class="form-label">Email Perusahaan</label>
          <input type="email" class="form-input" id="cp-email" value="${c.email || ''}" ${ro} /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Telepon</label>
          <input type="text" class="form-input" id="cp-phone" value="${c.phone || ''}" ${ro} /></div>
        <div class="form-group"><label class="form-label">NPWP</label>
          <input type="text" class="form-input" id="cp-npwp" value="${c.npwp || ''}" ${ro} /></div>
      </div>
      <div class="form-group"><label class="form-label">Alamat</label>
        <textarea class="form-input" id="cp-address" rows="2" ${ro}>${c.address || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Nama Bank</label>
          <input type="text" class="form-input" id="cp-bank" value="${c.bank_name || ''}" ${ro} /></div>
        <div class="form-group"><label class="form-label">No. Rekening</label>
          <input type="text" class="form-input" id="cp-bank-number" value="${c.bank_account_number || ''}" ${ro} /></div>
        <div class="form-group"><label class="form-label">Atas Nama</label>
          <input type="text" class="form-input" id="cp-bank-name" value="${c.bank_account_name || ''}" ${ro} /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Prefix Invoice</label>
          <input type="text" class="form-input" id="cp-prefix" value="${c.invoice_prefix || 'INV'}" ${ro} /></div>
        <div class="form-group"><label class="form-label">Pajak Default (%)</label>
          <input type="number" class="form-input" id="cp-tax" value="${c.default_tax_percent || 11}" ${ro} /></div>
      </div>
      ${!readOnly ? '<button type="submit" class="btn btn-primary"><iconify-icon icon="lucide:save" width="16" height="16"></iconify-icon> Simpan Perubahan</button>' : ''}
    </form>
  `;

  if (!readOnly) {
    // Select file button trigger
    const selectBtn = page.querySelector('#btn-select-logo');
    const fileInput = page.querySelector('#cp-logo-input');
    
    selectBtn?.addEventListener('click', () => fileInput.click());

    // File change upload handler
    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file melebihi batas 2MB.', 'error');
        return;
      }

      const preview = page.querySelector('#company-logo-preview');
      const originalHTML = preview.innerHTML;
      preview.innerHTML = '<span class="spinner" style="width:20px;height:20px"></span>';

      try {
        const formData = new FormData();
        formData.append('logo', file);

        const response = await api('/company/logo', {
          method: 'POST',
          body: formData
        });

        showToast(response.message || 'Logo berhasil diperbarui!', 'success');
        loadTab('profile', page);
      } catch (err) {
        showToast(err.message, 'error');
        preview.innerHTML = originalHTML;
      }
    });

    // Delete logo handler
    const deleteBtn = page.querySelector('#btn-delete-logo');
    deleteBtn?.addEventListener('click', async () => {
      const preview = page.querySelector('#company-logo-preview');
      const originalHTML = preview.innerHTML;
      preview.innerHTML = '<span class="spinner" style="width:20px;height:20px"></span>';

      try {
        const confirmResult = await showConfirm('Apakah Anda yakin ingin menghapus logo perusahaan?');
        if (!confirmResult) {
          preview.innerHTML = originalHTML;
          return;
        }

        const response = await api('/company/logo', {
          method: 'DELETE'
        });

        showToast(response.message || 'Logo berhasil dihapus!', 'success');
        loadTab('profile', page);
      } catch (err) {
        showToast(err.message, 'error');
        preview.innerHTML = originalHTML;
      }
    });

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
}

// === MEMBERS TAB ===
async function renderMembersTab(content, page) {
  const [membersRes, rolesRes] = await Promise.all([
    api('/company/members'),
    api('/company/roles')
  ]);

  const members = membersRes.data;
  const roles = rolesRes.data;
  const ctx = page._permCtx || {};
  const perms = ctx.userInfo?.role?.permissions || [];
  const isOwner = ctx.isOwner;

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3><iconify-icon icon="lucide:users" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Anggota Tim (${members.length})</h3>
        ${isOwner || perms.includes('create:members') ? '<button class="btn btn-primary btn-sm" id="btn-invite-member"><iconify-icon icon="lucide:user-plus" width="14" height="14"></iconify-icon> Undang Anggota</button>' : ''}
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
          <tbody>
            ${members.map(m => {
              const memberId = getId(m);
              const memberRoleId = m.role_id ? (typeof m.role_id === 'object' ? getId(m.role_id) : m.role_id) : '';
              const canEditThisMember = (isOwner || perms.includes('update:members')) && !m.is_owner;
              return `
              <tr>
                <td><strong>${m.name}</strong> ${m.is_owner ? '<span class="badge badge-success">Owner</span>' : ''}</td>
                <td>${m.email}</td>
                <td>${m.role_name || 'Tanpa Role'}</td>
                <td>${!canEditThisMember ? '<span style="color:var(--text-muted)">—</span>' : `
                  <div style="display:flex;align-items:center;gap:var(--space-sm)">
                    <select class="form-input form-input--sm member-role-select" data-member-id="${memberId}">
                      ${roles.map(r => `<option value="${getId(r)}" ${memberRoleId === getId(r) ? 'selected' : ''}>${r.name}</option>`).join('')}
                    </select>
                    <button class="btn btn-danger btn-sm btn-remove-member" data-member-id="${memberId}" title="Hapus anggota"><iconify-icon icon="lucide:trash-2" width="14" height="14"></iconify-icon></button>
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
        <h3><iconify-icon icon="lucide:mail" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Undang Anggota Baru</h3>
        <div class="form-group"><label class="form-label">Email (Opsional)</label>
          <input type="email" class="form-input" id="invite-email" placeholder="Kosongkan untuk undangan umum" /></div>
        <div class="form-group"><label class="form-label">Role</label>
          <select class="form-input" id="invite-role">
            ${roles.filter(r => r.name !== 'Owner').map(r => `<option value="${getId(r)}">${r.name}</option>`).join('')}
          </select></div>
        <div id="invite-result" style="display:none;margin:var(--space-md) 0;padding:var(--space-md);border-radius:var(--radius-md);background:var(--bg-secondary)">
          <p><strong>Kode Undangan:</strong> <code id="invite-code-display" style="font-size:1.2rem;letter-spacing:2px"></code></p>
          <p id="invite-link-display" style="word-break:break-all;font-size:0.85rem;margin-top:var(--space-sm)"></p>
          <button class="btn btn-sm" id="btn-copy-link"><iconify-icon icon="lucide:clipboard" width="14" height="14"></iconify-icon> Salin Link</button>
        </div>
        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md)">
          <button class="btn btn-primary" id="btn-send-invite">Buat Undangan</button>
          <button class="btn" id="btn-close-invite">Tutup</button>
        </div>
      </div>
    </div>
  `;

  // Invite modal events
  if (page.querySelector('#btn-invite-member')) {
    page.querySelector('#btn-invite-member').addEventListener('click', () => {
      page.querySelector('#invite-modal').style.display = 'flex';
      page.querySelector('#invite-result').style.display = 'none';
    });
  }
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
      if (!await showConfirm('Hapus anggota ini?')) return;
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
  const ctx = page._permCtx || {};
  const perms = ctx.userInfo?.role?.permissions || [];
  const isOwner = ctx.isOwner;

  content.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-lg)">
        <h3><iconify-icon icon="lucide:shield-check" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Konfigurasi Role Akses</h3>
        ${isOwner || perms.includes('create:roles') ? '<button class="btn btn-primary btn-sm" id="btn-add-role"><iconify-icon icon="lucide:plus" width="14" height="14"></iconify-icon> Tambah Role</button>' : ''}
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
                        ${r.name === 'Owner' ? '<iconify-icon icon="lucide:crown" width="18" height="18"></iconify-icon>' : '<iconify-icon icon="lucide:user" width="18" height="18"></iconify-icon>'}
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
                      <button class="btn-action btn-edit-role" data-role-id="${roleId}" title="${isOwner || perms.includes('update:roles') ? 'Atur Hak Akses' : 'Lihat Detail'}"><iconify-icon icon="lucide:settings" width="16" height="16"></iconify-icon></button>
                      ${(!r.is_default && (isOwner || perms.includes('delete:roles'))) ? `<button class="btn-action btn-action--delete btn-delete-role" data-role-id="${roleId}"><iconify-icon icon="lucide:trash-2" width="16" height="16"></iconify-icon></button>` : ''}
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
          <h3><iconify-icon icon="lucide:settings" width="18" height="18" style="vertical-align:-3px"></iconify-icon> Atur Hak Akses: <span id="modal-role-name"></span></h3>
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
          ${isOwner || perms.includes('update:roles') ? '<button class="btn btn-primary" id="btn-save-role-detail"><iconify-icon icon="lucide:save" width="16" height="16"></iconify-icon> Simpan Perubahan</button>' : ''}
          <button class="btn" id="btn-cancel-role-modal">${isOwner || perms.includes('update:roles') ? 'Batal' : 'Tutup'}</button>
        </div>
      </div>
    </div>
  `;

  setupRoleEvents(page, roles, allPerms);
}

function setupRoleEvents(page, roles, allPerms) {
  let currentRoleId = null;
  const ctx = page._permCtx || {};
  const perms = ctx.userInfo?.role?.permissions || [];
  const isOwner = ctx.isOwner;

  const resourceLabels = {
    document: '<iconify-icon icon="lucide:file-text" width="14" height="14"></iconify-icon> Dokumen', product: '<iconify-icon icon="lucide:box" width="14" height="14"></iconify-icon> Produk', contact: '<iconify-icon icon="lucide:users" width="14" height="14"></iconify-icon> Kontak', 
    receipt: '<iconify-icon icon="lucide:receipt" width="14" height="14"></iconify-icon> Kuitansi', dashboard: '<iconify-icon icon="lucide:layout-dashboard" width="14" height="14"></iconify-icon> Dashboard', report: '<iconify-icon icon="lucide:trending-up" width="14" height="14"></iconify-icon> Laporan', 
    reminder: '<iconify-icon icon="lucide:bell" width="14" height="14"></iconify-icon> Pengingat', members: '<iconify-icon icon="lucide:user" width="14" height="14"></iconify-icon> Anggota', roles: '<iconify-icon icon="lucide:shield-check" width="14" height="14"></iconify-icon> Hak Akses', 
    company_settings: '<iconify-icon icon="lucide:building-2" width="14" height="14"></iconify-icon> Pengaturan'
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
  if (page.querySelector('#btn-save-role-detail')) {
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
        btn.innerHTML = '<iconify-icon icon="lucide:save" width="16" height="16"></iconify-icon> Simpan Perubahan';
      }
    };
  }

  // Add role
  if (page.querySelector('#btn-add-role')) {
    page.querySelector('#btn-add-role').onclick = async () => {
      const name = prompt('Masukkan nama role baru:');
      if (!name) return;
      try {
        await api('/company/roles', { method: 'POST', body: { name, permissions: ['read:document', 'read:dashboard'] } });
        showToast('Role berhasil dibuat!', 'success');
        renderRolesTab(page.querySelector('#company-settings-content'), page);
      } catch (err) { showToast(err.message, 'error'); }
    };
  }

  // Delete role
  page.querySelectorAll('.btn-delete-role').forEach(btn => {
    btn.onclick = async () => {
      if (!await showConfirm('Hapus role ini?')) return;
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
  
  // Sort and group permissions
  const actionOrder = { 'create': 1, 'read': 2, 'update': 3, 'delete': 4, 'manage': 5 };
  
  allPerms.forEach(p => {
    const [action, resource] = p.split(':');
    if (!groups[resource]) groups[resource] = [];
    groups[resource].push({ perm: p, action });
  });

  // Sort actions within each resource group
  Object.keys(groups).forEach(res => {
    groups[res].sort((a, b) => (actionOrder[a.action] || 99) - (actionOrder[b.action] || 99));
  });

  grid.innerHTML = Object.keys(groups).map(resource => `
    <div class="perm-resource-row">
      <div class="perm-resource-name">${labels[resource] || resource}</div>
      <div class="perm-resource-toggles">
        ${groups[resource].map(({ perm, action }) => {
          const char = action === 'manage' ? 'M' : action.charAt(0).toUpperCase();
          const color = { create: '#10b981', read: '#3b82f6', update: '#f59e0b', delete: '#ef4444' }[action] || 'var(--text-muted)';
          return `
            <div class="perm-toggle-item" title="${action.toUpperCase()}">
              <span class="perm-toggle-label" style="color:${color}">${char}</span>
              <label class="switch">
                <input type="checkbox" class="modal-perm-toggle" data-perm="${perm}" ${activePerms.includes(perm) ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}
