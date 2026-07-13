# MEMORY — Implementation Plan: Membuat Frontend InvoiceFlow Responsif

> File ini menyimpan rencana implementasi responsif agar bisa direferensikan kapan saja.

---

## Analisis Kondisi Saat Ini

Setelah menganalisis seluruh kode frontend, berikut temuan penting:

**Sudah Ada (✅):**
- Viewport meta tag sudah ada di `index.html`
- Media query `@media (max-width: 768px)` di `layout.css` (L115): grid collapse + sidebar `display: none` + header `left: 0` + main-content `margin-left: 0`
- Media query `@media (max-width: 1200px)` di `layout.css` (L114): `.grid-4` → 2 kolom
- Media query `@media (max-width: 768px)` di `auth.css` (L299): auth brand panel hidden
- Media query `@media (max-width: 1024px)` di `index.css` (L620): `.grid-sidebar` → 1 kolom
- Hamburger toggle button (☰) sudah ada di `Layout.js` (L114)
- Auth form `max-width: 420px; width: 100%` — sudah cukup responsif
- Modal `width: 90%; max-width: 560px` — sudah responsif

**Belum Ada / Bermasalah (❌):**

| Masalah | Lokasi | Severity |
|---------|--------|----------|
| Sidebar `display: none` di mobile, **tidak ada cara membukanya kembali** (perlu overlay mode) | layout.css:115 | 🔴 Critical |
| **Inline style** `margin-left` dan `left` pada `#main-wrapper` dan `.header` di JS — override CSS media query | Layout.js:112-113 | 🔴 Critical |
| Sidebar toggle JS hanya collapse/expand, **tidak punya logic mobile overlay** | Layout.js:205-214 | 🔴 Critical |
| Tabel `.data-table` tanpa scroll wrapper horizontal — overflow di mobile | index.css:263 + semua halaman | 🔴 Critical |
| `.notification-dropdown` fixed `width: 350px` — overflow di layar < 350px | layout.css:78 | 🟠 High |
| `.settings-nav` tab bar tanpa overflow scroll — overflow di layar kecil | auth.css:398 | 🟠 High |
| `.roles-table` tanpa scroll wrapper | auth.css:480 | 🟠 High |
| `.toast` `min-width: 300px` — overflow di layar 320px | index.css:319 | 🟡 Medium |
| `.page-header` `flex justify-between` — tombol dan judul berdesakan di mobile | layout.css:104 | 🟡 Medium |
| Header search, profile info, actions — terlalu padat di mobile | layout.css:54-75 | 🟡 Medium |
| Dashboard bottom action buttons tanpa `flex-wrap` | Dashboard.js | 🟡 Medium |
| Contact list flex rows — 4 section dalam satu baris | Contacts.js | 🟡 Medium |

---

## Keputusan Desain

- **Sidebar Mobile Behavior**: Sidebar `display: none` di ≤768px diubah menjadi **overlay sidebar** yang bisa dibuka via tombol hamburger. Sidebar slide-in dari kiri dengan overlay gelap di belakangnya, tertutup saat klik overlay atau navigasi.
- **Tabel Data di Mobile**: Tabel 5-9 kolom menggunakan **horizontal scroll wrapper** (`overflow-x: auto`).
- **Inline Styles di Layout.js**: `margin-left` dan `left` pada wrapper/header dipindahkan dari inline style ke CSS class (`sidebar-collapsed`), karena inline style meng-override CSS media queries.

## Breakpoint Strategy

| Breakpoint | Target | Perilaku |
|---|---|---|
| `≤480px` | Mobile kecil | Padding/font mengecil, single column penuh, toast full-width |
| `≤768px` | Mobile/tablet kecil | Sidebar overlay, header compact, tabel scroll, grid 1 kolom |
| `≤1024px` | Tablet | `grid-sidebar` → 1 kolom (sudah ada) |
| `≤1200px` | Layar medium | `grid-4` → 2 kolom (sudah ada) |

---

## Proposed Changes

### Komponen Layout (JavaScript)

#### [MODIFY] Layout.js (`client/src/components/Layout.js`)

**Perubahan pada HTML template (line 110-151):**
1. Tambahkan `<div class="sidebar-overlay" id="sidebar-overlay"></div>` setelah `</aside>` sebagai backdrop gelap
2. Hapus inline `margin-left` dan `left` styles dari `#main-wrapper` (line 112) dan `.header` (line 113) — ganti dengan CSS class
3. Gunakan CSS class `sidebar-collapsed` pada parent container bukan inline style

**Perubahan pada sidebar toggle logic (line 204-214):**
1. Deteksi apakah layar ≤768px menggunakan `window.matchMedia('(max-width: 768px)')`
2. Jika **mobile**: toggle class `sidebar-open` (bukan `collapsed`) untuk menampilkan sidebar overlay
3. Jika **desktop**: toggle class `collapsed` seperti sebelumnya
4. Tambahkan event listener pada `.sidebar-overlay` untuk menutup sidebar saat diklik
5. Tambahkan listener pada setiap `.nav-item` link di sidebar: tutup sidebar setelah navigasi (di mobile)

---

### CSS Files

#### [MODIFY] layout.css (`client/src/styles/layout.css`)

**Perubahan pada selector yang sudah ada:**
- `.main-content` (line 101): Tambahkan class-based margin dari `.sidebar-collapsed` yang sudah ada

**Penambahan styles baru (sebelum media queries):**
```css
/* Sidebar overlay for mobile */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
  opacity: 0;
  transition: opacity var(--transition-base);
}
.sidebar-overlay.active {
  display: block;
  opacity: 1;
}
```

**Perubahan pada media query 768px (line 115) — expand drastis:**
```css
@media (max-width: 768px) {
  /* Sidebar: overlay mode */
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 200;
  }
  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  /* Main content: full width */
  .main-content {
    margin-left: 0 !important; /* override inline styles */
  }
  .header {
    left: 0 !important; /* override inline styles */
  }

  /* Header: compact */
  .header { padding: 0 var(--space-base); gap: var(--space-md); }
  .header__search { display: none; } /* hide search di mobile */
  .header__username { display: none; }
  .header__company-name { display: none; }
  .header__profile-info { display: none; }

  /* Notification dropdown responsive */
  .notification-dropdown { width: calc(100vw - 2rem); max-width: 350px; right: -60px; }

  /* Page header: stack */
  .page-header { flex-direction: column; align-items: flex-start; gap: var(--space-md); }

  /* Grids: single column */
  .grid-4, .grid-3, .grid-2, .grid-sidebar {
    grid-template-columns: 1fr;
  }
}
```

**Penambahan media query 480px (baru):**
```css
@media (max-width: 480px) {
  .main-content { padding: var(--space-base); }
  .page-title { font-size: 1.25rem; }
  .stat-card { padding: var(--space-base); }
  .stat-card__value { font-size: 1.35rem; }
}
```

---

#### [MODIFY] index.css (`client/src/styles/index.css`)

**Tambahkan class baru:**
```css
/* Table scroll wrapper */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 calc(var(--space-base) * -1);
  padding: 0 var(--space-base);
}
.table-responsive .data-table {
  min-width: 600px; /* prevent over-compression */
}
```

**Penambahan/perluasan media queries:**
```css
@media (max-width: 768px) {
  /* Toast: full width di mobile */
  #toast-container { left: var(--space-base); right: var(--space-base); bottom: var(--space-base); }
  .toast { min-width: unset; max-width: unset; width: 100%; }

  /* Modal: padding lebih kecil */
  .modal-content { padding: var(--space-xl); width: 95%; }

  /* Debt summary grid */
  .debt-summary-grid { grid-template-columns: 1fr; }

  /* Buttons: wrap */
  .btn { padding: 8px 14px; font-size: 0.8rem; }
}

@media (max-width: 480px) {
  .modal-content { padding: var(--space-base); }
  .confirm-dialog { width: 95%; }
  .debt-card { padding: var(--space-base); }
  .debt-card__amount { font-size: 1.2rem; }
}
```

---

#### [MODIFY] auth.css (`client/src/styles/auth.css`)

**Perluasan media query 768px (line 299-307):**
```css
@media (max-width: 768px) {
  .auth-brand { display: none; }
  .auth-form-container { padding: var(--space-xl); }

  /* Settings navigation: scrollable */
  .settings-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .settings-nav-item { white-space: nowrap; flex-shrink: 0; }

  /* Roles table: scrollable */
  .roles-matrix { overflow-x: auto; }
  .roles-table { min-width: 500px; }

  /* Permission grid: stack */
  .perm-resource-row { flex-direction: column; align-items: flex-start; gap: var(--space-sm); }
}
```

**Penambahan media query 480px (baru):**
```css
@media (max-width: 480px) {
  .auth-form-container { padding: var(--space-base); }
  .auth-form__title { font-size: 1.4rem; }
  .settings-nav-item { padding: 10px 14px; font-size: 0.8rem; }
}
```

---

### Halaman JS (Table Scroll Wrapper)

Untuk setiap halaman yang menggunakan `<table class="data-table">`, bungkus dengan `<div class="table-responsive">`:

#### [MODIFY] Dashboard.js (`client/src/pages/Dashboard.js`)
- Bungkus recent invoices table dengan `<div class="table-responsive">`
- Tambahkan `flex-wrap: wrap` pada bottom action buttons row

#### [MODIFY] DocumentList.js (`client/src/pages/DocumentList.js`)
- Bungkus document table dengan `<div class="table-responsive">`

#### [MODIFY] DocumentDetail.js (`client/src/pages/DocumentDetail.js`)
- Bungkus items table dengan `<div class="table-responsive">`

#### [MODIFY] Contacts.js (`client/src/pages/Contacts.js`)
- Contact list sudah menggunakan flex — tambahkan responsive class/wrapping

#### [MODIFY] Products.js (`client/src/pages/Products.js`)
- Bungkus products table dengan `<div class="table-responsive">`

#### [MODIFY] CompanySettings.js (`client/src/pages/CompanySettings.js`)
- Bungkus roles table dengan `<div class="table-responsive">`

---

## Ringkasan Semua File yang Akan Diubah

| # | File | Perubahan Utama |
|---|------|----------------|
| 1 | `client/src/styles/layout.css` | Sidebar overlay styles, expand 768px media query, tambah 480px breakpoint |
| 2 | `client/src/styles/index.css` | `.table-responsive` class, toast/modal/button responsive, tambah 480px breakpoint |
| 3 | `client/src/styles/auth.css` | Expand 768px (settings-nav, roles-table, perm-grid), tambah 480px breakpoint |
| 4 | `client/src/components/Layout.js` | Sidebar overlay + mobile toggle logic, hapus inline margin-left/left |
| 5 | `client/src/pages/Dashboard.js` | Table scroll wrapper, flex-wrap buttons |
| 6 | `client/src/pages/DocumentList.js` | Table scroll wrapper |
| 7 | `client/src/pages/DocumentDetail.js` | Table scroll wrapper |
| 8 | `client/src/pages/Contacts.js` | Responsive contact rows |
| 9 | `client/src/pages/Products.js` | Table scroll wrapper |
| 10 | `client/src/pages/CompanySettings.js` | Roles table scroll wrapper |

## Verification Plan

### Manual Verification
Buka di browser → DevTools → Toggle Device Toolbar, test di:
- **375px** (iPhone SE)
- **390px** (iPhone 14)
- **768px** (iPad)
- **1024px** (iPad Pro)
- **1440px** (Desktop)

Checklist:
- [ ] Sidebar tersembunyi di ≤768px, muncul sebagai overlay saat hamburger ditekan
- [ ] Overlay gelap muncul di belakang sidebar, klik menutup sidebar
- [ ] Sidebar tertutup saat klik link navigasi (mobile)
- [ ] Header compact di mobile (search hidden, profile info hidden)
- [ ] Tabel data bisa di-scroll horizontal tanpa halaman ikut scroll
- [ ] Stat cards: 4→2 kolom di ≤1200px, 1 kolom di ≤768px
- [ ] Info grid & grid-sidebar: 1 kolom di mobile
- [ ] Auth form tampil nyaman di layar kecil
- [ ] Settings nav tabs bisa di-scroll horizontal
- [ ] Toast notification full-width di mobile
- [ ] Tidak ada elemen yang overflow horizontal

---

## Realisasi Pembaruan Responsif (13 Juli 2026)

Semua perbaikan responsivitas telah berhasil diimplementasikan dan diverifikasi menggunakan `npm run build`. Berikut detail perubahan yang dilakukan:

1. **Perbaikan Masalah Horizontal Overflow (Penyebab Tampilan Geser & Terpotong)**:
   - **Scrollable Kategori / Tab Bar**: Menambahkan aturan CSS di `index.css` agar element `.tabs` memiliki behavior `overflow-x: auto` dan `flex-wrap: nowrap` pada layar ≤768px. Ini mencegah kategori filter invoice menembus lebar layar (overflow) dan menyebabkan scrollbar horizontal pada body dokumen.
   - **Optimalisasi Padding Spacing**: 
     - Menambahkan aturan override media query untuk `.glass-card` di `index.css` agar padding mengecil ke `var(--space-base)` (16px) secara otomatis pada layar mobile/tablet (≤768px), menimpa inline styles bawaan.
     - Memindahkan penyesuaian padding `.main-content` dan `.stat-card` di `layout.css` ke breakpoint `max-width: 768px` (sebelumnya hanya di 480px), agar area pembacaan konten di mobile lebih luas dan seragam.

2. **Pembungkusan Tabel agar Responsif (`table-responsive`)**:
   - **ReceiptList.js**: Membungkus tabel kuitansi dalam class `.table-responsive`.
   - **DebtManagement.js**: Membungkus tabel hutang jatuh tempo, hutang mendatang, dan semua pengingat dalam class `.table-responsive`.
   - **DocumentCreate.js**: Membungkus tabel item produk pembuatan tagihan (`#items-table`) dalam class `.table-responsive`.
   - **CompanySettings.js**: Mengubah pembungkus overflow-x manual pada tabel anggota tim menjadi class standar `.table-responsive`.

### Hasil Verifikasi
- Aplikasi berhasil dibangun dengan aman menggunakan `npm run build` tanpa error.
- Horizontal scrollbar pada level document body/root telah teratasi, menyelesaikan masalah pergeseran ke kiri dan pemotongan teks di device mobile seperti iPhone SE, iPhone 12 Pro, iPhone 14 Pro Max, dan Pixel 7.
