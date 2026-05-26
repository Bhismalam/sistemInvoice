import { api, setTokens } from '../utils/api.js';
import { showToast } from '../router.js';
import { getFullLogoSVG } from '../utils/logo.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand__decor auth-brand__decor--1"></div>
        <div class="auth-brand__decor auth-brand__decor--2"></div>
        <div class="auth-brand__logo" style="width: 240px; max-width: 100%; justify-content: center; margin-bottom: var(--space-base); z-index: 1;">${getFullLogoSVG()}</div>
        <p class="auth-brand__tagline">Platform Invoicing & Pembayaran Digital untuk UMKM Indonesia</p>
        <div class="auth-brand__features">
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Buat invoice profesional dalam 3 menit</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Kelola pembayaran & arus kas real-time</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Laporan keuangan otomatis</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Gratis untuk UMKM</div>
        </div>
      </div>
      <div class="auth-form-container">
        <div class="auth-form animate-slide-up">
          <h1 class="auth-form__title">Selamat Datang <iconify-icon icon="lucide:smile" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Masuk ke akun InvoiceFlow Anda</p>
          <form id="login-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:mail" width="18" height="18"></iconify-icon></span>
                <input type="email" class="form-input" id="login-email" placeholder="nama@email.com" required value="admin@invoiceflow.id" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:lock" width="18" height="18"></iconify-icon></span>
                <input type="password" class="form-input" id="login-password" placeholder="Masukkan password" required value="password123" />
                <button type="button" class="input-toggle" id="toggle-password" style="background:transparent;border:none;cursor:pointer;display:flex;align-items:center;padding:0 8px;">
                  <iconify-icon icon="lucide:eye" width="18" height="18" id="eye-icon" style="color:var(--text-secondary)"></iconify-icon>
                </button>
              </div>
            </div>
            <div class="auth-form__actions">
              <label class="auth-checkbox"><input type="checkbox" checked /> Ingat saya</label>
              <a href="#/forgot-password" class="auth-link">Lupa Password?</a>
            </div>
            <button type="submit" class="btn btn-primary auth-form__btn" id="login-btn">
              Masuk
            </button>
          </form>
          <div class="auth-divider">atau</div>
          <div id="google-login-btn-container" style="display:flex;justify-content:center;margin-bottom:1rem;"></div>
          <p class="auth-footer">Belum punya akun? <a href="#/register">Daftar Sekarang</a></p>
        </div>
      </div>
    </div>
  `;

  // Toggle password
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('eye-icon');
    if (input.type === 'password') {
      input.type = 'text';
      icon.setAttribute('icon', 'lucide:eye-off');
    } else {
      input.type = 'password';
      icon.setAttribute('icon', 'lucide:eye');
    }
  });

  // Login form
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memproses...';

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      setTokens(res.data.accessToken, res.data.refreshToken);
      sessionStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.company) sessionStorage.setItem('company', JSON.stringify(res.data.company));
      showToast('Login berhasil! Selamat datang Ã°Å¸Å½â€°', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message || 'Login gagal', 'error');
      btn.closest('form')?.classList.add('animate-shake');
      setTimeout(() => btn.closest('form')?.classList.remove('animate-shake'), 500);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Masuk';
    }
  });

  // Google Login Initialization
  setTimeout(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
        callback: async (response) => {
          try {
            const res = await api('/auth/google', {
              method: 'POST',
              body: { token: response.credential }
            });
            setTokens(res.data.accessToken, res.data.refreshToken);
            sessionStorage.setItem('user', JSON.stringify(res.data.user));
            if (res.data.company) sessionStorage.setItem('company', JSON.stringify(res.data.company));
            showToast('Login Google berhasil! Ã°Å¸Å½â€°', 'success');
            window.location.hash = '#/dashboard';
          } catch (err) {
            showToast(err.message || 'Login Google gagal', 'error');
          }
        }
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-login-btn-container'),
        { theme: 'outline', size: 'large', width: '100%' }
      );
    }
  }, 500);
}
