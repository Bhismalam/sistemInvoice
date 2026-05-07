const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'invoiceflow',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
};

let pool;

async function initDB() {
  // First create the database if it doesn't exist
  try {
    const tempConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await tempConn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await tempConn.end();
  } catch (error) {
    console.log('Skipping CREATE DATABASE (Assuming cloud DB like Aiven where it is pre-created or restricted):', error.message);
  }

  // Now create the pool connected to that database
  pool = mysql.createPool(dbConfig);

  // Create tables
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50) DEFAULT '',
        password_hash VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) DEFAULT '',
        business_logo TEXT DEFAULT NULL,
        business_address TEXT DEFAULT NULL,
        npwp VARCHAR(50) DEFAULT '',
        invoice_prefix VARCHAR(10) DEFAULT 'INV',
        invoice_counter INT DEFAULT 0,
        default_tax_percent DECIMAL(5,2) DEFAULT 11,
        notifications_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(512) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('customer', 'supplier') NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        address TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        unit VARCHAR(20) DEFAULT 'pcs',
        price DECIMAL(15,2) NOT NULL DEFAULT 0,
        stock INT DEFAULT 0,
        category VARCHAR(100) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        contact_id INT DEFAULT NULL,
        transaction_type ENUM('sales', 'purchase') NOT NULL,
        document_type ENUM('order', 'invoice') NOT NULL,
        document_number VARCHAR(100) NOT NULL UNIQUE,
        status ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'draft',
        issue_date DATE NOT NULL,
        due_date DATE NOT NULL,
        subtotal DECIMAL(15,2) DEFAULT 0,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        tax_percent DECIMAL(5,2) DEFAULT 11,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        total DECIMAL(15,2) DEFAULT 0,
        notes TEXT DEFAULT NULL,
        payment_link VARCHAR(255) DEFAULT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        paid_at DATETIME DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS document_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        document_id INT NOT NULL,
        product_id INT DEFAULT NULL,
        description VARCHAR(500) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
        unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
        total DECIMAL(15,2) NOT NULL DEFAULT 0,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS receipts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        document_id INT NOT NULL,
        receipt_number VARCHAR(100) NOT NULL UNIQUE,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'transfer',
        payment_date DATE NOT NULL,
        notes TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        document_id INT DEFAULT NULL,
        action VARCHAR(255) NOT NULL,
        details TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    // Add cancelled_at column if not exists
    try {
      await conn.execute(`ALTER TABLE documents ADD COLUMN cancelled_at DATETIME DEFAULT NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('cancelled_at column already exists');
    }

    // Add midtrans_token column if not exists
    try {
      await conn.execute(`ALTER TABLE documents ADD COLUMN midtrans_token VARCHAR(512) DEFAULT NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('midtrans_token column already exists');
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS payment_reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        document_id INT NOT NULL,
        reminder_date DATE NOT NULL,
        reminder_type ENUM('before_due', 'on_due', 'after_due', 'custom') NOT NULL DEFAULT 'before_due',
        days_offset INT DEFAULT 0,
        message TEXT DEFAULT NULL,
        is_sent TINYINT(1) DEFAULT 0,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ MySQL tables created successfully');
  } finally {
    conn.release();
  }

  return pool;
}

function getPool() {
  if (!pool) throw new Error('Database not initialized. Call initDB() first.');
  return pool;
}

module.exports = { initDB, getPool };
