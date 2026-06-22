/**
 * Test Setup — Initializes a clean test database before all tests.
 * Uses a separate DB (invoiceflow_test) to avoid polluting production.
 */
const { initDB, getPool } = require('../config/database');

let pool;

/**
 * Initialize the test database — call once per test suite
 */
async function setupTestDB() {
  const mongoose = require('mongoose');
  
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_12345';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  // Override MONGODB_URI to use a test database
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/invoiceflow';
  process.env.MONGODB_URI = uri.replace(/\/[^/?]+(\?|$)/, '/invoiceflow_test$1');

  pool = await initDB();
  return pool;
}

/**
 * Clean all data from tables (keeps schema intact)
 */
async function cleanDB() {
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Tear down — close pool
 */
async function teardownTestDB() {
  const mongoose = require('mongoose');
  await mongoose.disconnect();
}

module.exports = { setupTestDB, cleanDB, teardownTestDB };
