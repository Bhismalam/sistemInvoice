# Konteks Proyek InvoiceFlow

## 1. Ikhtisar Proyek
Proyek ini adalah **InvoiceFlow**, sebuah aplikasi Sistem Voice/Invoice berbasis web. Sesuai dengan spesifikasi, proyek ini menggunakan arsitektur **Vanilla-Node-MySQL stack** (MEVN tanpa Vue).

- **Frontend (Client)**: Menggunakan Vanilla JavaScript (ES6+), Vite sebagai bundler, dan Vanilla CSS. Arsitekturnya adalah SPA (Single Page Application) dengan sistem routing kustom.
- **Backend (Server)**: Menggunakan Node.js dengan framework Express.js. Terdapat integrasi keamanan menggunakan JWT, Bcrypt, Google Auth Library, Helmet, dan CORS. Fitur utamanya mencakup integrasi Midtrans, PDFKit untuk invoice, dan Multer untuk upload.
- **Database**: Menggunakan MySQL dengan driver `mysql2`. Skema mencakup tabel `users`, `contacts`, `products`, `documents`, `document_items`, `receipts`, dan `activity_logs`.

## 2. Struktur Direktori Utama
Root proyek terletak di: `sistem_voice/`

### 📂 Root Directory
- `spesifikasi.txt`: Berisi detail spesifikasi teknologi proyek.
- `README.md`: Dokumentasi proyek.
- `package.json` & `package-lock.json`: Daftar dependensi di root proyek.

### 📂 client/ (Frontend)
Bagian antarmuka pengguna SPA.
- `index.html`: Entry point HTML.
- `vite.config.js`: Konfigurasi server Vite.
- `src/`: Berisi kode sumber JavaScript murni (modular pages, routing custom di `router.js`).
- `public/`: File aset statis.
- `.env`: Variabel environment untuk frontend.

### 📂 server/ (Backend Node.js)
API Server dan logika bisnis.
- `app.js` & `server.js`: Entry point dan setup server Express.
- `api/`, `routes/`, `controllers/`: Menangani routing RESTful API dan controller logic.
- `models/`: Struktur data dan interaksi ke MySQL database.
- `middleware/`: Middleware untuk autentikasi (JWT), validasi, dll.
- `services/`: Layanan eksternal (Misal: Midtrans, PDFKit).
- `config/`: Konfigurasi database dan sistem.
- `utils/`: Fungsi utilitas tambahan.
- `.env`: Variabel environment (kunci rahasia, port, DB config).

### 📂 server-php/
Terdapat direktori `server-php` yang kemungkinan merupakan alternatif atau legacy backend.
