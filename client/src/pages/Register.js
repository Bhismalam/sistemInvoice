import { api, setTokens } from '../utils/api.js';
import { showToast } from '../router.js';

export function renderRegister(container) {
  container.innerHTML = `
    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand__decor auth-brand__decor--1"></div>
        <div class="auth-brand__decor auth-brand__decor--2"></div>
        <div class="auth-brand__logo">🧾 <span>InvoiceFlow</span></div>
        <p class="auth-brand__tagline">Kelola invoice & pembayaran dengan mudah</p>
        <div class="auth-brand__features">
          <div class="auth-brand__feature">✅ Gratis untuk mulai</div>
          <div class="auth-brand__feature">✅ Setup dalam 3 menit</div>
          <div class="auth-brand__feature">✅ Tanpa kartu kredit</div>
        </div>
      </div>
      <div class="auth-form-container">
        <div class="auth-form animate-slide-up">
          <h1 class="auth-form__title">Buat Akun Baru ✨</h1>
          <p class="auth-form__subtitle">Mulai kelola invoice bisnis Anda</p>
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

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Mendaftar...';
    try {
      const res = await api('/auth/register', {
        method: 'POST',
        body: {
          name: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          phone: document.getElementById('reg-phone').value,
          password: document.getElementById('reg-password').value
        }
      });
      setTokens(res.data.accessToken, res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      showToast('Registrasi berhasil! 🎉', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      showToast(err.message || 'Registrasi gagal', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Daftar Sekarang';
    }
  });
}
