/**
 * Seed dummy data for demo/development
 * Run: node utils/seedData.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcrypt');
const { initDB, getPool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  console.log('🌱 Seeding database...');

  await initDB();
  const pool = getPool();

  // Disable FK checks to avoid constraint errors during clearing
  await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

  // Clear existing data
  await pool.execute('TRUNCATE TABLE activity_logs');
  await pool.execute('TRUNCATE TABLE receipts');
  await pool.execute('TRUNCATE TABLE document_items');
  await pool.execute('TRUNCATE TABLE documents');
  await pool.execute('TRUNCATE TABLE products');
  await pool.execute('TRUNCATE TABLE contacts');
  await pool.execute('TRUNCATE TABLE refresh_tokens');
  await pool.execute('TRUNCATE TABLE users');

  // Re-enable FK checks
  await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

  // Create demo user
  const hash = await bcrypt.hash('password123', 12);
  const [userResult] = await pool.execute(`
    INSERT INTO users (name, email, phone, password_hash, business_name, business_address, npwp, invoice_prefix, invoice_counter, default_tax_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, ['Admin Demo', 'admin@invoiceflow.id', '081234567890', hash,
    'PT InvoiceFlow Indonesia', 'Jl. Sudirman No. 123, Jakarta Selatan 12190', '01.234.567.8-901.000', 'INV', 5, 11]);
  const userId = userResult.insertId;

  // Create contacts
  const contactsData = [
    [userId, 'customer', 'PT Maju Bersama', 'finance@majubersama.co.id', '02112345678', 'Jl. Gatot Subroto No. 45, Jakarta'],
    [userId, 'customer', 'CV Jaya Abadi', 'ap@jayaabadi.com', '02187654321', 'Jl. Ahmad Yani No. 12, Surabaya'],
    [userId, 'customer', 'UD Sinar Harapan', 'admin@sinarharapan.id', '02145678901', 'Jl. Diponegoro No. 78, Bandung'],
    [userId, 'customer', 'PT Teknologi Nusantara', 'billing@teknusa.co.id', '02198765432', 'Jl. HR Rasuna Said No. 33, Jakarta'],
    [userId, 'supplier', 'PT Supplier Utama', 'order@supplierutama.com', '02155667788', 'Jl. Industri No. 99, Tangerang'],
    [userId, 'supplier', 'CV Material Jaya', 'sales@materialjaya.id', '02133445566', 'Jl. Raya Bogor No. 156, Depok'],
  ];
  const contactIds = [];
  for (const c of contactsData) {
    const [result] = await pool.execute(`INSERT INTO contacts (user_id, type, name, email, phone, address) VALUES (?, ?, ?, ?, ?, ?)`, c);
    contactIds.push(result.insertId);
  }

  // Create products
  const productsData = [
    [userId, 'Jasa Konsultasi IT', 'Konsultasi teknologi informasi per jam', 'jam', 500000, 999, 'Jasa'],
    [userId, 'Website Development', 'Pembuatan website company profile', 'paket', 15000000, 999, 'Jasa'],
    [userId, 'Mobile App Development', 'Pengembangan aplikasi mobile', 'paket', 35000000, 999, 'Jasa'],
    [userId, 'Server Hosting (Bulanan)', 'Cloud hosting VPS per bulan', 'bulan', 750000, 999, 'Layanan'],
    [userId, 'Domain .co.id (Tahunan)', 'Registrasi domain .co.id per tahun', 'tahun', 350000, 50, 'Produk'],
    [userId, 'SSL Certificate', 'Sertifikat SSL wildcard', 'tahun', 1200000, 30, 'Produk'],
    [userId, 'UI/UX Design', 'Desain antarmuka per halaman', 'halaman', 2500000, 999, 'Jasa'],
    [userId, 'Maintenance Bulanan', 'Pemeliharaan website bulanan', 'bulan', 1500000, 999, 'Layanan'],
  ];
  const productIds = [];
  for (const p of productsData) {
    const [result] = await pool.execute(`INSERT INTO products (user_id, name, description, unit, price, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)`, p);
    productIds.push(result.insertId);
  }

  // Document 1 - Sales Invoice Paid
  const [doc1] = await pool.execute(`
    INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, payment_link, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [userId, contactIds[0], 'sales', 'invoice', 'INV-2024-0001', 'paid', '2024-03-01', '2024-03-15', 15000000, 0, 0, 11, 1650000, 16650000, 'Terima kasih atas kepercayaannya.', uuidv4(), '2024-03-10']);
  const doc1Id = doc1.insertId;
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc1Id, productIds[1], 'Website Development', 1, 15000000, 15000000]);
  await pool.execute(`INSERT INTO receipts (user_id, document_id, receipt_number, amount, payment_method, payment_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, doc1Id, 'RCP-2024-0001', 16650000, 'transfer', '2024-03-10', 'Pembayaran via BCA']);

  // Document 2 - Sales Invoice Sent
  const [doc2] = await pool.execute(`
    INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, payment_link, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [userId, contactIds[1], 'sales', 'invoice', 'INV-2024-0002', 'sent', '2024-03-15', '2024-04-15', 8500000, 5, 425000, 11, 888250, 8963250, '', uuidv4(), null]);
  const doc2Id = doc2.insertId;
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc2Id, productIds[0], 'Jasa Konsultasi IT', 10, 500000, 5000000]);
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc2Id, productIds[6], 'UI/UX Design', 1, 2500000, 2500000]);
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc2Id, productIds[7], 'Maintenance Bulanan', 1, 1500000, 1500000]);

  // Document 3 - Purchase Order Draft
  const [doc3] = await pool.execute(`
    INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, payment_link, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [userId, contactIds[4], 'purchase', 'order', 'PO-2024-0001', 'draft', '2024-04-01', '2024-04-10', 5000000, 0, 0, 11, 550000, 5550000, 'Pesanan lisensi', null, null]);
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc3.insertId, null, 'Lisensi software development', 1, 5000000, 5000000]);

  // Document 4 - Purchase Invoice Paid
  const [doc4] = await pool.execute(`
    INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, payment_link, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [userId, contactIds[5], 'purchase', 'invoice', 'PINV-2024-0001', 'paid', '2024-03-01', '2024-03-05', 1500000, 0, 0, 0, 0, 1500000, 'Internet & Listrik', null, '2024-03-05']);
  const doc4Id = doc4.insertId;
  await pool.execute(`INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)`, [doc4Id, null, 'Internet & listrik', 1, 1500000, 1500000]);
  await pool.execute(`INSERT INTO receipts (user_id, document_id, receipt_number, amount, payment_method, payment_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, doc4Id, 'PRCP-2024-0001', 1500000, 'cash', '2024-03-05', 'Kas kecil']);

  console.log('✅ Seed complete!');
  console.log('📧 Demo login: admin@invoiceflow.id / password123');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
