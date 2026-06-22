// PublicPayment.js — Stunning Public Invoice Payment Page
// This page is fully self-contained (no auth required)

const PUBLIC_API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://sistem-invoice.vercel.app/api';

function formatRupiah(num) {
  if (num == null || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function getStatusConfig(status) {
  const map = {
    draft: { label: 'BELUM DIBAYAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⏳' },
    sent: { label: 'BELUM DIBAYAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '⏳' },
    paid: { label: 'LUNAS', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', icon: '✓' },
    overdue: { label: 'JATUH TEMPO', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '⚠' },
    cancelled: { label: 'DIBATALKAN', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', icon: '✕' },
  };
  return map[status] || map.draft;
}

function injectStyles() {
  if (document.getElementById('pp-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-styles';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    .pp-root * { box-sizing: border-box; margin: 0; padding: 0; }
    .pp-root {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      min-height: 100vh;
      color: #e2e8f0;
      overflow-x: hidden;
      position: relative;
    }

    /* Animated background */
    .pp-bg-glow {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 0; overflow: hidden;
    }
    .pp-bg-glow::before {
      content: ''; position: absolute; top: -40%; left: -20%;
      width: 600px; height: 600px; border-radius: 50%;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
      animation: ppFloat1 20s ease-in-out infinite;
    }
    .pp-bg-glow::after {
      content: ''; position: absolute; bottom: -30%; right: -15%;
      width: 500px; height: 500px; border-radius: 50%;
      background: radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%);
      animation: ppFloat2 25s ease-in-out infinite;
    }
    @keyframes ppFloat1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,60px)} }
    @keyframes ppFloat2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-60px,-40px)} }

    /* Animations */
    @keyframes ppFadeIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ppSlideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ppPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
    @keyframes ppShimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
    @keyframes ppConfetti { 0%{transform:translateY(0) rotate(0deg);opacity:1} 100%{transform:translateY(-60px) rotate(360deg);opacity:0} }
    @keyframes ppCheckBounce { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }

    .pp-fade-in { animation: ppFadeIn 0.6s ease-out both; }
    .pp-slide-up { animation: ppSlideUp 0.7s ease-out both; }
    .pp-delay-1 { animation-delay: 0.1s; }
    .pp-delay-2 { animation-delay: 0.2s; }
    .pp-delay-3 { animation-delay: 0.3s; }
    .pp-delay-4 { animation-delay: 0.4s; }
    .pp-delay-5 { animation-delay: 0.5s; }
    .pp-delay-6 { animation-delay: 0.6s; }

    /* Container */
    .pp-container {
      max-width: 820px; margin: 0 auto; padding: 32px 20px 48px;
      position: relative; z-index: 1;
    }

    /* Header */
    .pp-header {
      text-align: center; margin-bottom: 28px;
    }
    .pp-header-logo {
      width: 64px; height: 64px; border-radius: 16px;
      object-fit: contain; margin-bottom: 12px;
      border: 2px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .pp-header-company {
      font-size: 22px; font-weight: 700; color: #f1f5f9;
      letter-spacing: -0.02em; margin-bottom: 8px;
    }
    .pp-header-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 16px; border-radius: 999px; font-size: 11px;
      font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2));
      border: 1px solid rgba(129,140,248,0.3); color: #a5b4fc;
    }

    /* Status Banner */
    .pp-status-banner {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 18px 28px; border-radius: 16px; margin-bottom: 24px;
      font-size: 18px; font-weight: 800; letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .pp-status-icon {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900;
      background: rgba(255,255,255,0.1);
    }

    /* Glass Card */
    .pp-card {
      background: rgba(30,41,59,0.55);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 28px;
      margin-bottom: 20px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05);
    }
    .pp-card-title {
      font-size: 13px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 20px;
      display: flex; align-items: center; gap: 8px;
    }
    .pp-card-title::before {
      content: ''; width: 3px; height: 16px; border-radius: 3px;
      background: linear-gradient(180deg, #6366f1, #a855f7);
    }

    /* Details Grid */
    .pp-details-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    }
    .pp-detail-group {}
    .pp-detail-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: #64748b; margin-bottom: 4px;
    }
    .pp-detail-value {
      font-size: 15px; font-weight: 500; color: #e2e8f0; line-height: 1.5;
    }
    .pp-detail-value.pp-mono {
      font-family: 'JetBrains Mono', 'Fira Code', monospace; font-weight: 600; color: #f1f5f9;
    }
    .pp-divider-v {
      width: 1px; background: rgba(255,255,255,0.06);
    }

    /* Party info */
    .pp-parties {
      display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
    }
    .pp-party-label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.1em; color: #6366f1; margin-bottom: 8px;
    }
    .pp-party-name {
      font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px;
    }
    .pp-party-info {
      font-size: 13px; color: #94a3b8; line-height: 1.7;
    }

    /* Items Table */
    .pp-table-wrap {
      overflow-x: auto; margin: 0 -28px; padding: 0 28px;
    }
    .pp-table {
      width: 100%; border-collapse: collapse; font-size: 14px;
    }
    .pp-table thead th {
      text-align: left; padding: 12px 16px; font-size: 11px;
      font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .pp-table thead th:last-child,
    .pp-table tbody td:last-child { text-align: right; }
    .pp-table tbody td {
      padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04);
      color: #cbd5e1; vertical-align: top;
    }
    .pp-table tbody tr:last-child td { border-bottom: none; }
    .pp-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
    .pp-item-desc {
      font-weight: 500; color: #e2e8f0;
    }
    .pp-item-qty, .pp-item-price {
      white-space: nowrap;
    }

    /* Summary */
    .pp-summary {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 8px; padding: 20px 0 0;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin-top: 4px;
    }
    .pp-summary-row {
      display: flex; justify-content: space-between; gap: 48px;
      font-size: 14px; color: #94a3b8; min-width: 280px;
    }
    .pp-summary-row span:last-child { font-weight: 500; color: #cbd5e1; }
    .pp-summary-total {
      display: flex; justify-content: space-between; gap: 48px;
      font-size: 22px; font-weight: 800; color: #f1f5f9;
      padding-top: 12px; border-top: 2px solid rgba(99,102,241,0.3);
      min-width: 280px; letter-spacing: -0.02em;
    }
    .pp-summary-total span:last-child {
      background: linear-gradient(135deg, #818cf8, #a855f7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Notes */
    .pp-notes {
      font-size: 13px; color: #94a3b8; font-style: italic;
      padding: 14px 18px; border-radius: 12px;
      background: rgba(255,255,255,0.03);
      border-left: 3px solid rgba(99,102,241,0.4);
      line-height: 1.6;
    }

    /* Payment Section */
    .pp-payment-section {
      margin-top: 8px;
    }
    .pp-payment-tabs {
      display: flex; gap: 8px; margin-bottom: 24px;
    }
    .pp-payment-tab {
      flex: 1; padding: 14px 16px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: #94a3b8; font-size: 14px; font-weight: 600;
      cursor: pointer; transition: all 0.25s ease;
      text-align: center; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .pp-payment-tab:hover { background: rgba(255,255,255,0.06); }
    .pp-payment-tab.active {
      background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15));
      border-color: rgba(129,140,248,0.4); color: #a5b4fc;
    }
    .pp-payment-tab-icon { font-size: 20px; }

    .pp-tab-content { display: none; }
    .pp-tab-content.active { display: block; animation: ppFadeIn 0.35s ease-out; }

    /* Midtrans button */
    .pp-pay-btn {
      width: 100%; padding: 18px 24px; border: none; border-radius: 14px;
      font-size: 17px; font-weight: 700; cursor: pointer;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: #fff; letter-spacing: 0.01em;
      box-shadow: 0 4px 24px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
      transition: all 0.3s ease; position: relative; overflow: hidden;
    }
    .pp-pay-btn::before {
      content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      transition: left 0.5s ease;
    }
    .pp-pay-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(34,197,94,0.4); }
    .pp-pay-btn:hover::before { left: 100%; }
    .pp-pay-btn:active { transform: translateY(0); }
    .pp-pay-btn:disabled {
      opacity: 0.6; cursor: not-allowed; transform: none !important;
      box-shadow: none !important;
    }
    .pp-pay-btn-sub {
      display: block; font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px;
    }

    /* Bank details */
    .pp-bank-card {
      background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2);
      border-radius: 16px; padding: 24px; margin-bottom: 24px;
    }
    .pp-bank-title {
      font-size: 14px; font-weight: 700; color: #a5b4fc; margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .pp-bank-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .pp-bank-row:last-child { border-bottom: none; }
    .pp-bank-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .pp-bank-value { font-size: 15px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 8px; }
    .pp-copy-btn {
      padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(129,140,248,0.3);
      background: rgba(99,102,241,0.1); color: #818cf8; font-size: 11px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .pp-copy-btn:hover { background: rgba(99,102,241,0.2); }
    .pp-copy-btn.copied { background: rgba(34,197,94,0.15); color: #22c55e; border-color: rgba(34,197,94,0.3); }

    /* Upload form */
    .pp-form-group { margin-bottom: 16px; }
    .pp-form-label {
      display: block; font-size: 13px; font-weight: 600; color: #94a3b8;
      margin-bottom: 6px;
    }
    .pp-form-input {
      width: 100%; padding: 12px 16px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05); color: #e2e8f0;
      font-size: 14px; font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
      outline: none;
    }
    .pp-form-input:focus {
      border-color: rgba(99,102,241,0.5);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    .pp-form-input::placeholder { color: #475569; }
    textarea.pp-form-input { resize: vertical; min-height: 80px; }

    .pp-file-upload {
      border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px;
      padding: 28px; text-align: center; cursor: pointer;
      transition: all 0.25s; background: rgba(255,255,255,0.02);
    }
    .pp-file-upload:hover { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.05); }
    .pp-file-upload.has-file { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.05); }
    .pp-file-icon { font-size: 32px; margin-bottom: 8px; }
    .pp-file-text { font-size: 13px; color: #64748b; }
    .pp-file-name { font-size: 14px; color: #22c55e; font-weight: 600; margin-top: 4px; }

    .pp-submit-btn {
      width: 100%; padding: 16px 24px; border: none; border-radius: 12px;
      font-size: 15px; font-weight: 700; cursor: pointer;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: #fff; box-shadow: 0 4px 24px rgba(99,102,241,0.25);
      transition: all 0.3s ease;
    }
    .pp-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(99,102,241,0.35); }
    .pp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

    /* Success / Paid banner */
    .pp-paid-banner {
      text-align: center; padding: 48px 32px; position: relative; overflow: hidden;
    }
    .pp-paid-check {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 20px; font-size: 36px; color: #fff;
      box-shadow: 0 8px 40px rgba(34,197,94,0.3);
      animation: ppCheckBounce 0.6s ease-out 0.3s both;
    }
    .pp-paid-title {
      font-size: 24px; font-weight: 800; color: #22c55e;
      margin-bottom: 8px;
    }
    .pp-paid-subtitle {
      font-size: 15px; color: #94a3b8;
    }
    .pp-confetti-dot {
      position: absolute; width: 8px; height: 8px; border-radius: 50%;
      animation: ppConfetti 1.5s ease-out forwards;
    }

    /* Footer */
    .pp-footer {
      text-align: center; padding: 32px 0 16px; color: #475569;
      font-size: 13px; font-weight: 500;
    }
    .pp-footer span {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; font-weight: 700;
    }

    /* Skeleton */
    .pp-skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 400px 100%; animation: ppShimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
    }
    .pp-skel-line { height: 16px; margin-bottom: 12px; }
    .pp-skel-circle { width: 64px; height: 64px; border-radius: 16px; margin: 0 auto 16px; }
    .pp-skel-title { height: 28px; width: 200px; margin: 0 auto 12px; }
    .pp-skel-badge { height: 28px; width: 120px; margin: 0 auto 28px; border-radius: 999px; }
    .pp-skel-banner { height: 60px; margin-bottom: 24px; border-radius: 16px; }
    .pp-skel-card { height: 200px; margin-bottom: 20px; border-radius: 20px; }
    .pp-skel-card-lg { height: 300px; margin-bottom: 20px; border-radius: 20px; }

    /* Error */
    .pp-error {
      text-align: center; padding: 80px 32px;
    }
    .pp-error-icon { font-size: 56px; margin-bottom: 16px; }
    .pp-error-title { font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
    .pp-error-msg { font-size: 15px; color: #94a3b8; }

    /* Toast for public page */
    .pp-toast {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
      padding: 14px 24px; border-radius: 12px; font-size: 14px; font-weight: 600;
      z-index: 9999; transition: transform 0.35s ease; white-space: nowrap;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .pp-toast.show { transform: translateX(-50%) translateY(0); }
    .pp-toast.success { background: #16a34a; color: #fff; }
    .pp-toast.error { background: #dc2626; color: #fff; }
    .pp-toast.info { background: #6366f1; color: #fff; }

    /* Form row */
    .pp-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* Responsive */
    @media (max-width: 640px) {
      .pp-container { padding: 16px 12px 32px; }
      .pp-card { padding: 20px 16px; border-radius: 16px; }
      .pp-details-grid { grid-template-columns: 1fr; gap: 16px; }
      .pp-parties { grid-template-columns: 1fr; gap: 20px; }
      .pp-summary-row, .pp-summary-total { min-width: 100%; gap: 16px; }
      .pp-summary { align-items: stretch; }
      .pp-summary-total { font-size: 18px; }
      .pp-status-banner { font-size: 15px; padding: 14px 20px; }
      .pp-status-icon { width: 34px; height: 34px; font-size: 16px; }
      .pp-payment-tabs { flex-direction: column; }
      .pp-form-row { grid-template-columns: 1fr; }
      .pp-table { font-size: 13px; }
      .pp-table thead th, .pp-table tbody td { padding: 10px 10px; }
      .pp-paid-title { font-size: 20px; }
      .pp-header-company { font-size: 18px; }
    }
  `;
  document.head.appendChild(style);
}

function showPublicToast(message, type = 'info') {
  let toast = document.querySelector('.pp-toast');
  if (toast) toast.remove();
  toast = document.createElement('div');
  toast.className = `pp-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.classList.add('show'); });
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

function renderSkeleton() {
  return `
    <div class="pp-root">
      <div class="pp-bg-glow"></div>
      <div class="pp-container">
        <div style="text-align:center;margin-bottom:28px">
          <div class="pp-skeleton pp-skel-circle"></div>
          <div class="pp-skeleton pp-skel-title"></div>
          <div class="pp-skeleton pp-skel-badge"></div>
        </div>
        <div class="pp-skeleton pp-skel-banner"></div>
        <div class="pp-skeleton pp-skel-card"></div>
        <div class="pp-skeleton pp-skel-card-lg"></div>
        <div class="pp-skeleton pp-skel-card"></div>
      </div>
    </div>
  `;
}

function renderError(title, message) {
  return `
    <div class="pp-root">
      <div class="pp-bg-glow"></div>
      <div class="pp-container">
        <div class="pp-error pp-fade-in">
          <div class="pp-error-icon">😔</div>
          <div class="pp-error-title">${title}</div>
          <div class="pp-error-msg">${message}</div>
        </div>
        <div class="pp-footer pp-fade-in pp-delay-2">Powered by <span>InvoiceFlow</span></div>
      </div>
    </div>
  `;
}

function generateConfettiDots() {
  const colors = ['#22c55e', '#6366f1', '#f59e0b', '#ec4899', '#a855f7', '#14b8a6'];
  let dots = '';
  for (let i = 0; i < 20; i++) {
    const color = colors[i % colors.length];
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const delay = Math.random() * 2;
    const size = 4 + Math.random() * 8;
    dots += `<div class="pp-confetti-dot" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;background:${color};animation-delay:${delay}s;animation-duration:${1.5 + Math.random()}s;animation-iteration-count:infinite;"></div>`;
  }
  return dots;
}

function renderInvoicePage(doc) {
  const s = getStatusConfig(doc.status);
  const isPaid = doc.status === 'paid';
  const isCancelled = doc.status === 'cancelled';
  const showPayment = !isPaid && !isCancelled;

  const logoHtml = doc.company_logo
    ? `<img src="${doc.company_logo}" alt="${doc.company_name || ''}" class="pp-header-logo" />`
    : '';

  const companyName = doc.company_name || doc.business_name || 'Company';

  const itemsHtml = (doc.items || []).map((item, i) => `
    <tr>
      <td style="color:#64748b;font-size:12px;">${i + 1}</td>
      <td><span class="pp-item-desc">${item.description || '-'}</span></td>
      <td class="pp-item-qty">${item.quantity || 0}</td>
      <td class="pp-item-price">${formatRupiah(item.unit_price)}</td>
      <td style="font-weight:600;color:#e2e8f0;">${formatRupiah(item.total)}</td>
    </tr>
  `).join('');

  const discountRow = doc.discount_amount && Number(doc.discount_amount) > 0
    ? `<div class="pp-summary-row"><span>Diskon${doc.discount_percent ? ` (${doc.discount_percent}%)` : ''}</span><span style="color:#f59e0b;">-${formatRupiah(doc.discount_amount)}</span></div>`
    : '';

  const taxRow = doc.tax_amount && Number(doc.tax_amount) > 0
    ? `<div class="pp-summary-row"><span>Pajak${doc.tax_percent ? ` (${doc.tax_percent}%)` : ''}</span><span>${formatRupiah(doc.tax_amount)}</span></div>`
    : '';

  const notesHtml = doc.notes
    ? `<div class="pp-notes pp-slide-up pp-delay-5">📝 ${doc.notes}</div>`
    : '';

  const paidBanner = isPaid ? `
    <div class="pp-card pp-slide-up pp-delay-5">
      <div class="pp-paid-banner">
        ${generateConfettiDots()}
        <div class="pp-paid-check">✓</div>
        <div class="pp-paid-title">Invoice ini sudah LUNAS!</div>
        <div class="pp-paid-subtitle">Terima kasih atas pembayaran Anda.</div>
      </div>
    </div>
  ` : '';

  const paymentSection = showPayment ? `
    <div class="pp-card pp-slide-up pp-delay-5 pp-payment-section">
      <div class="pp-card-title">Pembayaran</div>
      <div class="pp-payment-tabs">
        <button class="pp-payment-tab active" data-tab="midtrans">
          <span class="pp-payment-tab-icon">💳</span>
          Bayar Sekarang
        </button>
        <button class="pp-payment-tab" data-tab="transfer">
          <span class="pp-payment-tab-icon">🏦</span>
          Transfer Manual
        </button>
      </div>

      <!-- Midtrans Tab -->
      <div class="pp-tab-content active" id="pp-tab-midtrans">
        <button class="pp-pay-btn" id="pp-midtrans-btn">
          💳 Bayar ${formatRupiah(doc.total)}
          <span class="pp-pay-btn-sub">Pembayaran aman melalui Midtrans</span>
        </button>
      </div>

      <!-- Transfer Tab -->
      <div class="pp-tab-content" id="pp-tab-transfer">
        ${doc.company_bank_name ? `
          <div class="pp-bank-card">
            <div class="pp-bank-title">🏦 Informasi Rekening Tujuan</div>
            <div class="pp-bank-row">
              <span class="pp-bank-label">Bank</span>
              <span class="pp-bank-value">${doc.company_bank_name || '-'}</span>
            </div>
            <div class="pp-bank-row">
              <span class="pp-bank-label">No. Rekening</span>
              <span class="pp-bank-value">
                <span id="pp-acct-number">${doc.company_bank_account_number || '-'}</span>
                <button class="pp-copy-btn" id="pp-copy-acct" title="Salin nomor rekening">Salin</button>
              </span>
            </div>
            <div class="pp-bank-row">
              <span class="pp-bank-label">Atas Nama</span>
              <span class="pp-bank-value">${doc.company_bank_account_name || '-'}</span>
            </div>
            <div class="pp-bank-row">
              <span class="pp-bank-label">Jumlah Transfer</span>
              <span class="pp-bank-value" style="color:#22c55e;font-weight:700;">${formatRupiah(doc.total)}</span>
            </div>
          </div>
        ` : ''}

        <div style="margin-bottom:8px;">
          <div class="pp-card-title" style="margin-bottom:16px;">Upload Bukti Transfer</div>
          <form id="pp-proof-form">
            <div class="pp-form-row">
              <div class="pp-form-group">
                <label class="pp-form-label">Nama Pengirim *</label>
                <input type="text" class="pp-form-input" id="pp-sender-name" placeholder="Nama sesuai rekening" required />
              </div>
              <div class="pp-form-group">
                <label class="pp-form-label">Bank Pengirim *</label>
                <input type="text" class="pp-form-input" id="pp-sender-bank" placeholder="Contoh: BCA, Mandiri" required />
              </div>
            </div>
            <div class="pp-form-row">
              <div class="pp-form-group">
                <label class="pp-form-label">Jumlah Transfer *</label>
                <input type="number" class="pp-form-input" id="pp-transfer-amount" placeholder="Jumlah transfer" value="${doc.total || ''}" required />
              </div>
              <div class="pp-form-group">
                <label class="pp-form-label">Catatan</label>
                <input type="text" class="pp-form-input" id="pp-transfer-notes" placeholder="Catatan tambahan (opsional)" />
              </div>
            </div>
            <div class="pp-form-group">
              <label class="pp-form-label">Bukti Transfer *</label>
              <div class="pp-file-upload" id="pp-file-drop">
                <div class="pp-file-icon">📎</div>
                <div class="pp-file-text">Klik atau seret file bukti transfer ke sini</div>
                <div class="pp-file-text" style="font-size:11px;margin-top:4px;">JPG, PNG, atau PDF (maks 5MB)</div>
                <div class="pp-file-name" id="pp-file-name" style="display:none;"></div>
                <input type="file" id="pp-proof-file" accept="image/*,.pdf" style="display:none;" required />
              </div>
            </div>
            <button type="submit" class="pp-submit-btn" id="pp-submit-proof">
              📤 Kirim Bukti Transfer
            </button>
          </form>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <div class="pp-root">
      <div class="pp-bg-glow"></div>
      <div class="pp-container">

        <!-- Header -->
        <div class="pp-header pp-fade-in">
          ${logoHtml}
          <div class="pp-header-company">${companyName}</div>
          <div class="pp-header-badge">📄 INVOICE</div>
        </div>

        <!-- Status Banner -->
        <div class="pp-status-banner pp-fade-in pp-delay-1" style="background:${s.bg};border:1px solid ${s.border};color:${s.color};">
          <div class="pp-status-icon" style="background:${s.bg};">${s.icon}</div>
          ${s.label}
        </div>

        <!-- Invoice Details Card -->
        <div class="pp-card pp-slide-up pp-delay-2">
          <div class="pp-card-title">Detail Invoice</div>
          <div class="pp-details-grid" style="margin-bottom:24px;">
            <div class="pp-detail-group">
              <div class="pp-detail-label">Nomor Invoice</div>
              <div class="pp-detail-value pp-mono">${doc.document_number || '-'}</div>
            </div>
            <div class="pp-detail-group">
              <div class="pp-detail-label">Tanggal Diterbitkan</div>
              <div class="pp-detail-value">${formatDate(doc.issue_date)}</div>
            </div>
            <div class="pp-detail-group">
              <div class="pp-detail-label">Jatuh Tempo</div>
              <div class="pp-detail-value" style="${doc.status === 'overdue' ? 'color:#ef4444;font-weight:700;' : ''}">${formatDate(doc.due_date)}</div>
            </div>
            <div class="pp-detail-group">
              <div class="pp-detail-label">Total Tagihan</div>
              <div class="pp-detail-value pp-mono" style="font-size:17px;color:#818cf8;">${formatRupiah(doc.total)}</div>
            </div>
          </div>

          <div style="height:1px;background:rgba(255,255,255,0.06);margin-bottom:24px;"></div>

          <div class="pp-parties">
            <div>
              <div class="pp-party-label">Dari</div>
              <div class="pp-party-name">${doc.company_name || doc.business_name || '-'}</div>
              <div class="pp-party-info">
                ${doc.company_address || doc.business_address || ''}
                ${doc.company_phone ? `<br>${doc.company_phone}` : (doc.business_phone ? `<br>${doc.business_phone}` : '')}
                ${doc.company_email ? `<br>${doc.company_email}` : ''}
                ${doc.company_npwp ? `<br>NPWP: ${doc.company_npwp}` : ''}
              </div>
            </div>
            <div>
              <div class="pp-party-label">Kepada</div>
              <div class="pp-party-name">${doc.contact_name || '-'}</div>
              <div class="pp-party-info">
                ${doc.contact_email || ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="pp-card pp-slide-up pp-delay-3">
          <div class="pp-card-title">Rincian Item</div>
          <div class="pp-table-wrap">
            <table class="pp-table">
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>Deskripsi</th>
                  <th>Qty</th>
                  <th>Harga Satuan</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">Tidak ada item</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="pp-summary">
            <div class="pp-summary-row">
              <span>Subtotal</span>
              <span>${formatRupiah(doc.subtotal)}</span>
            </div>
            ${discountRow}
            ${taxRow}
            <div class="pp-summary-total">
              <span>Total</span>
              <span>${formatRupiah(doc.total)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${notesHtml}

        <!-- Paid Banner -->
        ${paidBanner}

        <!-- Payment Section -->
        ${paymentSection}

        <!-- Footer -->
        <div class="pp-footer pp-slide-up pp-delay-6">Powered by <span>InvoiceFlow</span></div>

      </div>
    </div>
  `;
}

function loadMidtransSnap() {
  return new Promise((resolve) => {
    if (window.snap) { resolve(); return; }
    const existing = document.querySelector('script[src*="midtrans"]');
    if (existing) { existing.addEventListener('load', resolve); return; }
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', 'SB-Mid-client-XRT6RKlMVp_-QZBa');
    script.onload = resolve;
    script.onerror = () => resolve(); // resolve even on error
    document.head.appendChild(script);
  });
}

export function renderPublicPayment(container, routeParams) {
  injectStyles();
  const paymentLinkId = routeParams.id;

  if (!paymentLinkId) {
    container.innerHTML = renderError('Link Tidak Valid', 'Payment link ID tidak ditemukan.');
    return;
  }

  // Show skeleton
  container.innerHTML = renderSkeleton();

  // Fetch invoice data
  fetch(`${PUBLIC_API_BASE}/documents/public/${paymentLinkId}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(json => {
      if (!json.success || !json.data) throw new Error('Data tidak ditemukan');
      const doc = json.data;
      container.innerHTML = renderInvoicePage(doc);
      bindEvents(container, doc, paymentLinkId);
    })
    .catch(err => {
      console.error('PublicPayment fetch error:', err);
      container.innerHTML = renderError(
        'Invoice Tidak Ditemukan',
        'Link pembayaran tidak valid atau invoice sudah tidak tersedia.'
      );
    });
}

function bindEvents(container, doc, paymentLinkId) {
  // ---- Payment Tabs ----
  const tabs = container.querySelectorAll('.pp-payment-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      container.querySelectorAll('.pp-tab-content').forEach(c => c.classList.remove('active'));
      const target = container.querySelector(`#pp-tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // ---- Copy Account Number ----
  const copyBtn = container.querySelector('#pp-copy-acct');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const num = container.querySelector('#pp-acct-number')?.textContent?.trim();
      if (num && num !== '-') {
        navigator.clipboard.writeText(num).then(() => {
          copyBtn.textContent = '✓ Tersalin';
          copyBtn.classList.add('copied');
          setTimeout(() => { copyBtn.textContent = 'Salin'; copyBtn.classList.remove('copied'); }, 2000);
        }).catch(() => {
          showPublicToast('Gagal menyalin', 'error');
        });
      }
    });
  }

  // ---- File Upload ----
  const fileDrop = container.querySelector('#pp-file-drop');
  const fileInput = container.querySelector('#pp-proof-file');
  const fileNameEl = container.querySelector('#pp-file-name');

  if (fileDrop && fileInput) {
    fileDrop.addEventListener('click', () => fileInput.click());
    fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.style.borderColor = 'rgba(99,102,241,0.5)'; });
    fileDrop.addEventListener('dragleave', () => { fileDrop.style.borderColor = ''; });
    fileDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDrop.style.borderColor = '';
      if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateFileName(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) updateFileName(fileInput.files[0]);
    });

    function updateFileName(file) {
      if (fileNameEl) {
        fileNameEl.textContent = `📎 ${file.name}`;
        fileNameEl.style.display = 'block';
      }
      fileDrop.classList.add('has-file');
    }
  }

  // ---- Midtrans Pay ----
  const midtransBtn = container.querySelector('#pp-midtrans-btn');
  if (midtransBtn) {
    midtransBtn.addEventListener('click', async () => {
      midtransBtn.disabled = true;
      midtransBtn.innerHTML = '<span style="display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:8px;"></span> Memproses...';

      // Add spin keyframe if not exists
      if (!document.getElementById('pp-spin-style')) {
        const s = document.createElement('style');
        s.id = 'pp-spin-style';
        s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }

      try {
        await loadMidtransSnap();

        const res = await fetch(`${PUBLIC_API_BASE}/payments/charge-public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_link: paymentLinkId })
        });
        const json = await res.json();
        if (!json.success || !json.data?.token) throw new Error(json.message || 'Gagal mendapatkan token pembayaran');

        if (window.snap) {
          window.snap.pay(json.data.token, {
            onSuccess: () => {
              showPublicToast('Pembayaran berhasil! 🎉', 'success');
              setTimeout(() => window.location.reload(), 2000);
            },
            onPending: () => {
              showPublicToast('Pembayaran sedang diproses...', 'info');
            },
            onError: () => {
              showPublicToast('Pembayaran gagal. Silakan coba lagi.', 'error');
            },
            onClose: () => {
              midtransBtn.disabled = false;
              midtransBtn.innerHTML = `💳 Bayar ${formatRupiah(doc.total)}<span class="pp-pay-btn-sub">Pembayaran aman melalui Midtrans</span>`;
            }
          });
        } else {
          throw new Error('Midtrans Snap belum siap. Silakan coba lagi.');
        }
      } catch (err) {
        showPublicToast(err.message || 'Gagal memproses pembayaran', 'error');
        midtransBtn.disabled = false;
        midtransBtn.innerHTML = `💳 Bayar ${formatRupiah(doc.total)}<span class="pp-pay-btn-sub">Pembayaran aman melalui Midtrans</span>`;
      }
    });
  }

  // ---- Proof Upload Form ----
  const proofForm = container.querySelector('#pp-proof-form');
  if (proofForm) {
    proofForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = container.querySelector('#pp-submit-proof');
      const senderName = container.querySelector('#pp-sender-name')?.value?.trim();
      const senderBank = container.querySelector('#pp-sender-bank')?.value?.trim();
      const transferAmount = container.querySelector('#pp-transfer-amount')?.value;
      const notes = container.querySelector('#pp-transfer-notes')?.value?.trim() || '';
      const proofFile = container.querySelector('#pp-proof-file')?.files?.[0];

      if (!senderName || !senderBank || !transferAmount) {
        showPublicToast('Harap isi semua field yang wajib', 'error');
        return;
      }
      if (!proofFile) {
        showPublicToast('Harap upload bukti transfer', 'error');
        return;
      }
      if (proofFile.size > 5 * 1024 * 1024) {
        showPublicToast('Ukuran file maksimal 5MB', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Mengirim...';

      try {
        const formData = new FormData();
        formData.append('sender_name', senderName);
        formData.append('sender_bank', senderBank);
        formData.append('transfer_amount', transferAmount);
        formData.append('notes', notes);
        formData.append('proof', proofFile);

        const res = await fetch(`${PUBLIC_API_BASE}/documents/public/${paymentLinkId}/upload-proof`, {
          method: 'POST',
          body: formData
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Gagal mengirim bukti transfer');

        showPublicToast('Bukti transfer berhasil dikirim! 🎉', 'success');
        submitBtn.textContent = '✓ Terkirim!';
        submitBtn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = '📤 Kirim Bukti Transfer';
          submitBtn.style.background = '';
        }, 4000);
      } catch (err) {
        showPublicToast(err.message || 'Gagal mengirim bukti', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = '📤 Kirim Bukti Transfer';
      }
    });
  }
}
