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
  // Override DB_NAME for test isolation
  process.env.DB_NAME = process.env.DB_NAME || 'invoiceflow_test';
  process.env.JWT_SECRET = 'test_jwt_secret_key_12345';
  process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_12345';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';

  pool = await initDB();
  return pool;
}

/**
 * Clean all data from tables (keeps schema intact)
 */
async function cleanDB() {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'payment_reminders', 'activity_logs', 'receipts',
      'document_items', 'documents', 'products',
      'contacts', 'refresh_tokens', 'users'
    ];
    for (const table of tables) {
      await conn.execute(`TRUNCATE TABLE ${table}`);
    }
    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

/**
 * Tear down — close pool
 */
async function teardownTestDB() {
  const p = getPool();
  await p.end();
}

module.exports = { setupTestDB, cleanDB, teardownTestDB };
