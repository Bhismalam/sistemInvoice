import { api } from '../utils/api.js';
import { showToast } from '../router.js';

export function renderForgotPassword(container) {
  container.innerHTML = `
    <style>
      .otp-container {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: var(--space-xl) 0;
      }
      .otp-box {
        width: 48px;
        height: 52px;
        border-radius: var(--radius-md);
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: var(--bg-secondary);
        color: var(--text-primary);
        text-align: center;
        font-size: 1.5rem;
        font-weight: 700;
        outline: none;
        transition: all var(--transition-fast);
      }
      .otp-box:focus {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        background: var(--bg-tertiary);
      }
    </style>

    <div class="auth-page">
      <div class="auth-brand">
        <div class="auth-brand__decor auth-brand__decor--1"></div>
        <div class="auth-brand__decor auth-brand__decor--2"></div>
        <div class="auth-brand__logo">
          <iconify-icon icon="lucide:receipt" width="24" height="24" style="vertical-align:-4px;color:var(--accent-primary);margin-right:8px"></iconify-icon><span>Invoice</span>Flow
        </div>
        <p class="auth-brand__tagline">Kelola invoice & pembayaran dengan mudah</p>
        <div class="auth-brand__features">
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Verifikasi aman 6-Digit OTP</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Atur ulang password mandiri</div>
          <div class="auth-brand__feature"><iconify-icon icon="lucide:check-circle" width="16" height="16" style="color:var(--accent-primary);vertical-align:-2px;margin-right:8px"></iconify-icon> Keamanan akun standar industri</div>
        </div>
      </div>
      <div class="auth-form-container">
        <!-- PHASE 1: ENTER EMAIL -->
        <div class="auth-form animate-slide-up" id="request-reset-section">
          <h1 class="auth-form__title">Lupa Password? <iconify-icon icon="lucide:key-round" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Masukkan email Anda untuk menerima kode OTP pemulihan</p>
          
          <form id="forgot-form">
            <div class="form-group">
              <label class="form-label">Email Terdaftar</label>
              <div class="input-icon-wrapper">
                <span class="input-icon"><iconify-icon icon="lucide:mail" width="18" height="18"></iconify-icon></span>
                <input type="email" class="form-input" id="forgot-email" placeholder="nama@email.com" required />
              </div>
            </div>
            <button type="submit" class="btn btn-primary auth-form__btn" id="forgot-btn">
              Kirim Kode OTP
            </button>
          </form>
          <p class="auth-footer" style="margin-top:2rem;">Ingat password Anda? <a href="#/login">Masuk Kembali</a></p>
        </div>

        <!-- PHASE 2: VERIFY OTP -->
        <div class="auth-form animate-slide-up" id="verify-otp-section" style="display:none;">
          <h1 class="auth-form__title">Verifikasi OTP <iconify-icon icon="lucide:shield-alert" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle" id="otp-subtitle">Masukkan 6 digit kode yang telah dikirim ke email Anda</p>

          <!-- Mock Dev Mode OTP Banner -->
          <div class="invite-banner" id="dev-otp-banner" style="display:none; margin-bottom:var(--space-lg); border-color:var(--accent-primary); background:rgba(var(--accent-primary-rgb), 0.08);">
            <span class="invite-banner__icon"><iconify-icon icon="lucide:terminal" style="color:var(--accent-primary)"></iconify-icon></span>
            <div>
              <strong>Mode Pengembang Aktif</strong>
              <p style="font-size:0.875rem;">Kode OTP Pemulihan Anda: <strong id="dev-otp-value" style="color:var(--accent-primary); font-size:1.1rem; letter-spacing:1px;">------</strong></p>
            </div>
          </div>
          
          <form id="otp-form">
            <div class="otp-container">
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
              <input type="text" class="otp-box" maxlength="1" pattern="[0-9]" inputmode="numeric" required />
            </div>
            
            <button type="submit" class="btn btn-primary auth-form__btn" id="verify-otp-btn">
              Verifikasi Kode
            </button>
          </form>
          <p class="auth-footer" style="margin-top:2rem;"><a href="#/forgot-password" id="back-to-email">Ganti Email</a></p>
        </div>

        <!-- PHASE 3: SET NEW PASSWORD -->
        <div class="auth-form animate-slide-up" id="set-new-password-section" style="display:none;">
          <h1 class="auth-form__title">Atur Ulang Password <iconify-icon icon="lucide:shield-check" width="26" height="26" style="vertical-align:-4px;color:var(--accent-primary);margin-left:4px"></iconify-icon></h1>
          <p class="auth-form__subtitle">Buat password baru yang kuat untuk akun Anda</p>
          
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

  // OTP Focus Auto-shifting and Backspace handling
  const otpInputs = container.querySelectorAll('.otp-box');
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      // Force allow only numbers
      input.value = input.value.replace(/[^0-9]/g, '');
      if (input.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && input.value.length === 0 && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    // Paste handling
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
      if (pastedData.length > 0) {
        const digits = pastedData.slice(0, 6).split('');
        otpInputs.forEach((optInput, i) => {
          if (digits[i]) {
            optInput.value = digits[i];
            if (i < otpInputs.length - 1) {
              otpInputs[i + 1].focus();
            }
          }
        });
      }
    });
  });

  // Store registered email for verification stage
  let registeredEmail = '';

  // Handle Phase 1: Request OTP
  document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('forgot-btn');
    const emailInput = document.getElementById('forgot-email');
    registeredEmail = emailInput.value.trim();

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memproses...';

    try {
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: registeredEmail }
      });
      
      showToast(res.message || 'OTP berhasil dikirim ke email!', 'success');

      // Update subtitle with destination email
      document.getElementById('otp-subtitle').innerHTML = `Masukkan 6 digit kode yang telah dikirim ke <strong>${registeredEmail}</strong>`;

      // Check if dev OTP is provided (local environment support)
      if (res.dev_otp) {
        document.getElementById('dev-otp-value').textContent = res.dev_otp;
        document.getElementById('dev-otp-banner').style.display = 'flex';
      } else {
        document.getElementById('dev-otp-banner').style.display = 'none';
      }

      // Transition screen to Phase 2 (OTP verification)
      document.getElementById('request-reset-section').style.display = 'none';
      document.getElementById('verify-otp-section').style.display = 'block';

      // Auto focus on first OTP box
      setTimeout(() => otpInputs[0].focus(), 100);

    } catch (err) {
      showToast(err.message || 'Gagal mengirim email reset', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Kirim Kode OTP';
    }
  });

  // Handle Phase 2: Verify OTP
  document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('verify-otp-btn');
    
    // Combine digits from inputs
    let otpValue = '';
    otpInputs.forEach(input => {
      otpValue += input.value.trim();
    });

    if (otpValue.length !== 6) {
      showToast('Masukkan 6 digit kode OTP secara lengkap!', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Memverifikasi...';

    try {
      const res = await api('/auth/verify-otp', {
        method: 'POST',
        body: { email: registeredEmail, otp: otpValue }
      });

      showToast(res.message || 'OTP berhasil diverifikasi!', 'success');

      // Store reset token
      document.getElementById('reset-token').value = res.reset_token;

      // Transition to Phase 3 (Set password)
      document.getElementById('verify-otp-section').style.display = 'none';
      document.getElementById('set-new-password-section').style.display = 'block';

      // Focus new password box
      setTimeout(() => document.getElementById('new-password').focus(), 100);

    } catch (err) {
      showToast(err.message || 'Kode OTP salah atau kedaluwarsa!', 'error');
      // Clear inputs and refocus first input on error
      otpInputs.forEach(inp => inp.value = '');
      otpInputs[0].focus();
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Verifikasi Kode';
    }
  });

  // Return to email page action
  document.getElementById('back-to-email')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('verify-otp-section').style.display = 'none';
    document.getElementById('request-reset-section').style.display = 'block';
  });

  // Handle Phase 3: Set New Password
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
