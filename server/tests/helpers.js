/**
 * Test Helpers — shared utilities for creating test data & auth
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const TEST_USER = {
  name: 'Test User',
  email: 'test@invoiceflow.com',
  phone: '081234567890',
  password: 'Password123!',
};

const TEST_USER_2 = {
  name: 'Second User',
  email: 'user2@invoiceflow.com',
  phone: '081234567891',
  password: 'Password456!',
};

/**
 * Creates a user directly in the DB and returns { user, token, refreshToken }
 */
async function createTestUser(userData = TEST_USER) {
  const pool = getPool();
  const passwordHash = await bcrypt.hash(userData.password, 4); // low rounds for speed
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
    [userData.name, userData.email, userData.phone, passwordHash]
  );
  const userId = result.insertId;

  const token = jwt.sign(
    { id: userId, email: userData.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  // Store refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 19).replace('T', ' ');
  await pool.execute(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, refreshToken, expiresAt]
  );

  return {
    user: { id: userId, name: userData.name, email: userData.email },
    token,
    refreshToken,
    password: userData.password,
  };
}

/**
 * Creates a contact for a user
 */
async function createTestContact(userId, overrides = {}) {
  const pool = getPool();
  const data = {
    user_id: userId,
    type: 'customer',
    name: 'PT Test Customer',
    email: 'customer@test.com',
    phone: '081111111111',
    address: 'Jl. Test No. 1',
    notes: '',
    ...overrides,
  };
  const [result] = await pool.execute(
    'INSERT INTO contacts (user_id, type, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.user_id, data.type, data.name, data.email, data.phone, data.address, data.notes]
  );
  return { id: result.insertId, ...data };
}

/**
 * Creates a product for a user
 */
async function createTestProduct(userId, overrides = {}) {
  const pool = getPool();
  const data = {
    user_id: userId,
    name: 'Test Product',
    description: 'A test product',
    unit: 'pcs',
    price: 100000,
    stock: 50,
    category: 'Elektronik',
    ...overrides,
  };
  const [result] = await pool.execute(
    'INSERT INTO products (user_id, name, description, unit, price, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.user_id, data.name, data.description, data.unit, data.price, data.stock, data.category]
  );
  return { id: result.insertId, ...data };
}

/**
 * Creates a document (invoice/order) for a user
 */
async function createTestDocument(userId, overrides = {}) {
  const pool = getPool();
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const data = {
    user_id: userId,
    contact_id: null,
    transaction_type: 'sales',
    document_type: 'invoice',
    document_number: `INV-TEST-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    status: 'draft',
    issue_date: today,
    due_date: dueDate,
    subtotal: 500000,
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: 11,
    tax_amount: 55000,
    total: 555000,
    notes: 'Test invoice',
    payment_link: null,
    ...overrides,
  };

  const [result] = await pool.execute(
    `INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, 
     status, issue_date, due_date, subtotal, discount_percent, discount_amount, tax_percent, 
     tax_amount, total, notes, payment_link) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.user_id, data.contact_id, data.transaction_type, data.document_type,
     data.document_number, data.status, data.issue_date, data.due_date,
     data.subtotal, data.discount_percent, data.discount_amount, data.tax_percent,
     data.tax_amount, data.total, data.notes, data.payment_link]
  );

  // Add a document item
  await pool.execute(
    'INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
    [result.insertId, null, 'Test Item', 5, 100000, 500000]
  );

  return { id: result.insertId, ...data };
}

/**
 * Auth header helper
 */
function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = {
  TEST_USER,
  TEST_USER_2,
  createTestUser,
  createTestContact,
  createTestProduct,
  createTestDocument,
  authHeader,
};
