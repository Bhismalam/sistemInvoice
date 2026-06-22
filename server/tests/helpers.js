/**
 * Test Helpers — shared utilities for creating test data & auth
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const { Contact } = require('../models/Contact');
const { Product } = require('../models/Product');
const Document = require('../models/Document');
const mongoose = require('mongoose');

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
  const passwordHash = await bcrypt.hash(userData.password, 4);
  const user = new User({
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    password_hash: passwordHash
  });
  
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  user.refresh_tokens.push({ token: refreshToken, expires_at: expiresAt });
  await user.save();

  const token = jwt.sign(
    { id: user._id, email: userData.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    user: { id: user.id, name: userData.name, email: userData.email },
    token,
    refreshToken,
    password: userData.password,
  };
}

/**
 * Creates a contact for a user
 */
async function createTestContact(userId, overrides = {}) {
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
  const contact = new Contact(data);
  await contact.save();
  return { id: contact.id, ...data };
}

/**
 * Creates a product for a user
 */
async function createTestProduct(userId, overrides = {}) {
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
  const product = new Product(data);
  await product.save();
  return { id: product.id, ...data };
}

/**
 * Creates a document (invoice/order) for a user
 */
async function createTestDocument(userId, overrides = {}) {
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const DocumentModelDB = mongoose.model('Document');
  
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
    items: [
      { product_id: null, description: 'Test Item', quantity: 5, unit_price: 100000, total: 500000 }
    ],
    ...overrides,
  };

  const doc = new DocumentModelDB(data);
  await doc.save();

  return { id: doc.id, ...data };
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
