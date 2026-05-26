import { api, setTokens } from '../utils/api.js';
import { showToast } from '../router.js';
import logo from '../assets/logo.svg';

export function renderRegister(container) {
  // Check for invite token in URL
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const inviteToken = urlParams.get('invite') || '';
  const defaultTab = inviteToken ? 'join' : 'create';

  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand__decor auth-brand__decor--1"></div>
        <div class="auth-brand__decor auth-brand__decor--2"></div>
        <div class="auth-brand__logo" style="width: 200px; max-width: 100%; justify-content: center; margin-bottom: var(--space-base);"><img src="${logo}" alt="InvoiceFlow Logo" style="width: 100%; height: auto; display: block;" /></div>
        <p class="auth-brand__tagline">Kelola invoice & pembayaran dengan mudah</p>
        <div class="auth-brand__features">
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Gratis untuk mulai</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Setup dalam 3 menit</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Tanpa kartu kredit</div>
        </div>
      </div>
      <div class="auth-form-container">
        <div class="auth-form animate-slide-up">
          <h1 class="auth-form__title">Buat Akun Baru <iconify-icon icon="lucide:sparkles" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Mulai kelola invoice bisnis Anda</p>

          <!-- Tab Toggle -->
          <div class="auth-tabs" id="auth-tabs">
            <button class="auth-tab ${defaultTab === 'create' ? 'active' : ''}" data-tab="create">
              ðŸ¢ Buat Perusahaan
            </button>
            <button class="auth-tab ${defaultTab === 'join' ? 'active' : ''}" data-tab="join">
              ðŸ¤ Gabung Perusahaan
            </button>
          </div>

          <!-- Invite Banner (shown when auto-detected from link) -->
          <div id="invite-banner" class="invite-banner" style="display:none;">
            <span class="invite-banner__icon">ðŸŽ‰</span>
            <div>
              <strong id="invite-company-name">Loading...</strong>
              <p>Anda diundang bergabung sebagai <span id="invite-role-name">...</span></p>
            </div>
          </div>

          <form id="register-form">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input type="text" class="form-input" id="reg-name" placeholder="Nama lengkap" required />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="reg-email" placeholder="nama@email.com" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nomor HP</label>
              <input type="tel" class="form-input" id="reg-phone" placeholder="08xxxxxxxxxx" />
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" class="form-input" id="reg-password" placeholder="Minimal 8 karakter" required minlength="8" />
            </div>

            <!-- CREATE TAB: Company Name -->
            <div class="form-group" id="company-name-group">
              <label class="form-label">Nama Perusahaan</label>
              <input type="text" class="form-input" id="reg-company-name" placeholder="Contoh: PT Sukses Makmur" />
            </div>

            <!-- JOIN TAB: Invite Code -->
            <div class="form-group" id="invite-code-group" style="display:none;">
              <label class="form-label">Kode Undangan</label>
              <input type="text" class="form-input" id="reg-invite-token" placeholder="Masukkan kode 8 karakter" 
                     value="${inviteToken}" ${inviteToken ? 'readonly style="opacity:0.7;cursor:not-allowed"' : ''} 
                     maxlength="8" />
            </div>

            <div class="form-group" style="margin-bottom:var(--space-xl)">
              <label class="auth-checkbox"><input type="checkbox" required /> Saya setuju dengan <a href="#" class="auth-link">Syarat & Ketentuan</a></label>
            </div>
            <button type="submit" class="btn btn-primary auth-form__btn" id="reg-btn">Daftar Sekarang</button>
          </form>
          <p class="auth-footer">Sudah punya akun? <a href="#/login">Masuk</a></p>
        </div>
      </div>
    </div>
  `;

  // --- Tab Switching Logic ---
  const tabCreate = document.querySelector('[data-tab="create"]');
  const tabJoin = document.querySelector('[data-tab="join"]');
  const companyNameGroup = document.getElementById('company-name-group');
  const inviteCodeGroup = document.getElementById('invite-code-group');

  function switchTab(tab) {
    tabCreate.classList.toggle('active', tab === 'create');
    tabJoin.classList.toggle('active', tab === 'join');
    companyNameGroup.style.display = tab === 'create' ? '' : 'none';
    inviteCodeGroup.style.display = tab === 'join' ? '' : 'none';
  }

  tabCreate.addEventListener('click', () => switchTab('create'));
  tabJoin.addEventListener('click', () => switchTab('join'));

  // Set initial tab
  switchTab(defaultTab);

  // --- Auto-validate Invite Token ---
  if (inviteToken) {
    validateInviteToken(inviteToken);
  }

  async function validateInviteToken(token) {
    try {
      const res = await api(`/auth/invite/${token}`);
      const banner = document.getElementById('invite-banner');
      banner.style.display = 'flex';
      document.getElementById('invite-company-name').textContent = res.data.company_name;
      document.getElementById('invite-role-name').textContent = res.data.role_name;
      if (res.data.email) {
        document.getElementById('reg-email').value = res.data.email;
        document.getElementById('reg-email').readOnly = true;
        document.getElementById('reg-email').style.opacity = '0.7';
      }
    } catch (err) {
      showToast('Kode undangan tidak valid atau sudah kadaluarsa.', 'error');
    }
  }

  // --- Form Submission ---
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Mendaftar...';

    const activeTab = document.querySelector('.auth-tab.active')?.dataset.tab;

    try {
      const body = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        phone: document.getElementById('reg-phone').value,
        password: document.getElementById('reg-password').value
      };

      if (activeTab === 'create') {
        body.company_name = document.getElementById('reg-company-name').value;
      } else {
        body.invite_token = document.getElementById('reg-invite-token').value;
        if (!body.invite_token) {
          showToast('Masukkan kode undangan.', 'error');
          return;
        }
      }

      const res = await api('/auth/register', {
        method: 'POST',
        body
      });
      setTokens(res.data.accessToken, res.data.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.company) {
        sessionStorage.setItem('company', JSON.stringify(res.data.company));
      }
      showToast(res.message || 'Registrasi berhasil! ðŸŽ‰', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message || 'Registrasi gagal', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Daftar Sekarang';
    }
  });
}
