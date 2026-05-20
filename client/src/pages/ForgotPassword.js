import { api } from '../utils/api.js';
import { showToast } from '../router.js';

export function renderForgotPassword(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand__decor auth-brand__decor--1"></div>
        <div class="auth-brand__decor auth-brand__decor--2"></div>
        <div class="auth-brand__logo">
          <iconify-icon icon="lucide:receipt" width="24" height="24" style="vertical-align:-4px;color:var(--accent-primary);margin-right:8px"></iconify-icon><span>Invoice</span>Flow
        </div>
        <p class="auth-brand__tagline">Kelola invoice & pembayaran dengan mudah</p>
        <div class="auth-brand__features">
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Pemulihan akun instan & aman</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Atur ulang password mandiri</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Support bantuan 24/7</div>
        </div>
      </div>
      <div class="auth-form-container">
        <!-- STEP 1: REQUEST RESET LINK -->
        <div class="auth-form animate-slide-up" id="request-reset-section">
          <h1 class="auth-form__title">Lupa Password? <iconify-icon icon="lucide:key-round" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Masukkan email Anda untuk memulihkan akun</p>
          
          <form id="forgot-form">
            <div class="form-group">
              <label class="form-label">Email Terdaftar</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:mail" width="18" height="18"></iconify-icon></span>
                <input type="email" class="form-input" id="forgot-email" placeholder="nama@email.com" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary auth-form__btn" id="forgot-btn">
              Kirim Link Pemulihan
            </button>
          </form>
          <p class="auth-footer" style="margin-top:2rem;">Ingat password Anda? <a href="#/login">Masuk Kembali</a></p>
        </div>

        <!-- STEP 2: ENTER NEW PASSWORD (AUTO-REVEALED IN DEV MODE) -->
        <div class="auth-form animate-slide-up" id="set-new-password-section" style="display:none;">
          <h1 class="auth-form__title">Atur Ulang Password <iconify-icon icon="lucide:shield-check" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Buat password baru yang kuat untuk akun Anda</p>

          <!-- Mock Dev Mode Banner -->
          <div class="invite-banner" id="dev-token-banner" style="margin-bottom:var(--space-lg); border-color:var(--accent-primary); background:rgba(var(--accent-primary-rgb), 0.08);">
            <span class="invite-banner__icon"><iconify-icon icon="lucide:terminal" style="color:var(--accent-primary)"></iconify-icon></span>
            <div>
              <strong>Mode Pengembang Aktif</strong>
              <p style="font-size:0.875rem;">Token reset didapatkan secara lokal. Silakan isi password baru Anda langsung di bawah!</p>
            </div>
          </div>
          
          <form id="reset-form">
            <!-- Hidden reset token input -->
            <input type="hidden" id="reset-token" />

            <div class="form-group">
              <label class="form-label">Password Baru</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:lock" width="18" height="18"></iconify-icon></span>
                <input type="password" class="form-input" id="new-password" placeholder="Minimal 8 karakter" required minlength="8" />
                <button type="button" class="input-toggle" id="toggle-new-password" style="background:transparent;border:none;cursor:pointer;display:flex;align-items:center;padding:0 8px;">
                  <iconify-icon icon="lucide:eye" width="18" height="18" id="eye-icon-new" style="color:var(--text-secondary)"></iconify-icon>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Konfirmasi Password Baru</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:lock" width="18" height="18"></iconify-icon></span>
                <input type="password" class="form-input" id="confirm-password" placeholder="Masukkan ulang password" required minlength="8" />
                <button type="button" class="input-toggle" id="toggle-confirm-password" style="background:transparent;border:none;cursor:pointer;display:flex;align-items:center;padding:0 8px;">
                  <iconify-icon icon="lucide:eye" width="18" height="18" id="eye-icon-confirm" style="color:var(--text-secondary)"></iconify-icon>
                </button>
              </div>
            </div>
            <button type="submit" class="btn btn-primary auth-form__btn" id="reset-btn">
              Simpan & Masuk
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  // Toggle Password Visibilities
  document.getElementById('toggle-new-password')?.addEventListener('click', () => {
    const input = document.getElementById('new-password');
    const icon = document.getElementById('eye-icon-new');
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('icon', 'lucide:eye-off');
    } else {
      input.type = 'password';
      icon.setAttribute('icon', 'lucide:eye');
    }
  });

  document.getElementById('toggle-confirm-password')?.addEventListener('click', () => {
    const input = document.getElementById('confirm-password');
    const icon = document.getElementById('eye-icon-confirm');
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('icon', 'lucide:eye-off');
    } else {
      input.type = 'password';
      icon.setAttribute('icon', 'lucide:eye');
    }
  });

  // Handle Form 1: Request Reset
  document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('forgot-btn');
    const email = document.getElementById('forgot-email').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memproses...';

    try {
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      
      showToast(res.message || 'Link reset password berhasil dikirim!', 'success');

      // Check if dev token is provided
      if (res.dev_reset_token) {
        document.getElementById('reset-token').value = res.dev_reset_token;
        document.getElementById('request-reset-section').style.display = 'none';
        document.getElementById('set-new-password-section').style.display = 'block';
      }
    } catch (err) {
      showToast(err.message || 'Gagal mengirim email reset', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Kirim Link Pemulihan';
    }
  });

  // Handle Form 2: Set New Password
  document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reset-btn');
    const token = document.getElementById('reset-token').value;
    const password = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok!', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...';

    try {
      const res = await api('/auth/reset-password', {
        method: 'POST',
        body: { token, password }
      });

      showToast(res.message || 'Password berhasil diatur ulang!', 'success');
      setTimeout(() => {
        window.location.hash = '#/login';
      }, 1000);
    } catch (err) {
      showToast(err.message || 'Gagal mereset password', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Simpan & Masuk';
    }
  });
}
