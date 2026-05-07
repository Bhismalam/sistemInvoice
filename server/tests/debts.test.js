/**
 * Debt Management & Payment Reminder Tests
 * Tests: Debt summary, reminder CRUD, upcoming reminders, auto-generation
 */
const request = require('supertest');
const app = require('../app');
const { getPool } = require('../config/database');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { createTestUser, createTestContact, createTestDocument, authHeader } = require('./helpers');

let testAuth, testContact;

beforeAll(async () => { await setupTestDB(); });
beforeEach(async () => {
  await cleanDB();
  testAuth = await createTestUser();
  testContact = await createTestContact(testAuth.user.id);
});
afterAll(async () => { await teardownTestDB(); });

// ========================
// Debt Summary
// ========================
describe('GET /api/debts/summary', () => {
  test('should return empty summary when no documents', async () => {
    const res = await request(app)
      .get('/api/debts/summary')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.purchase).toBeDefined();
    expect(res.body.data.sales).toBeDefined();
    expect(res.body.data.purchase.total_amount).toBe(0);
    expect(res.body.data.sales.total_amount).toBe(0);
  });

  test('should separate purchase and sales debts', async () => {
    // Sales invoices (piutang)
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'sales',
      document_type: 'invoice',
      status: 'sent',
      total: 500000,
      document_number: 'SALES-1',
    });

    // Purchase invoices (hutang)
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'purchase',
      document_type: 'invoice',
      status: 'sent',
      total: 300000,
      document_number: 'PURCHASE-1',
    });

    const res = await request(app)
      .get('/api/debts/summary')
      .set(authHeader(testAuth.token));

    expect(res.body.data.sales.total_amount).toBe(500000);
    expect(res.body.data.purchase.total_amount).toBe(300000);
  });

  test('should detect overdue debts', async () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'purchase',
      document_type: 'invoice',
      status: 'sent',
      total: 200000,
      due_date: pastDate,
      document_number: 'OVERDUE-P1',
    });

    const res = await request(app)
      .get('/api/debts/summary')
      .set(authHeader(testAuth.token));

    expect(res.body.data.purchase.overdue.length).toBe(1);
    expect(res.body.data.purchase.overdue_amount).toBe(200000);
  });

  test('should not count paid invoices', async () => {
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'sales',
      document_type: 'invoice',
      status: 'paid',
      total: 1000000,
      document_number: 'PAID-1',
    });

    const res = await request(app)
      .get('/api/debts/summary')
      .set(authHeader(testAuth.token));

    expect(res.body.data.sales.total_amount).toBe(0);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/debts/summary');
    expect(res.status).toBe(401);
  });
});

// ========================
// Payment Reminders
// ========================
describe('POST /api/debts/reminders', () => {
  test('should create a custom reminder', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      document_type: 'invoice',
      status: 'sent',
    });

    const reminderDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const res = await request(app)
      .post('/api/debts/reminders')
      .set(authHeader(testAuth.token))
      .send({
        document_id: doc.id,
        reminder_date: reminderDate,
        reminder_type: 'custom',
        message: 'Jangan lupa bayar!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Jangan lupa bayar!');
    expect(res.body.data.document_number).toBeDefined();
  });

  test('should fail for non-existent document', async () => {
    const res = await request(app)
      .post('/api/debts/reminders')
      .set(authHeader(testAuth.token))
      .send({ document_id: 999999, reminder_date: '2026-12-31' });

    expect(res.status).toBe(404);
  });
});

describe('GET /api/debts/reminders', () => {
  test('should list all reminders for user', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'sent' });
    const pool = getPool();

    // Insert 3 reminders
    for (let i = 1; i <= 3; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await pool.execute(
        'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
        [testAuth.user.id, doc.id, date, 'before_due', i, `Reminder ${i}`]
      );
    }

    const res = await request(app)
      .get('/api/debts/reminders')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
  });

  test('should paginate reminders', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'sent' });
    const pool = getPool();

    for (let i = 1; i <= 5; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await pool.execute(
        'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
        [testAuth.user.id, doc.id, date, 'before_due', i, `Rem ${i}`]
      );
    }

    const res = await request(app)
      .get('/api/debts/reminders?page=1&limit=2')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(2);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(2);
  });
});

describe('GET /api/debts/reminders/upcoming', () => {
  test('should return upcoming reminders within specified days', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
    });
    const pool = getPool();

    // Near-future reminder (3 days)
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, soon, 'before_due', 3, 'Coming soon']
    );

    // Far-future reminder (30 days)
    const far = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, far, 'before_due', 30, 'Far away']
    );

    const res = await request(app)
      .get('/api/debts/reminders/upcoming?days=7')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].message).toBe('Coming soon');
  });
});

describe('PATCH /api/debts/reminders/:id/read', () => {
  test('should mark a reminder as read', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'sent' });
    const pool = getPool();
    const date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [ins] = await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, date, 'before_due', 1, 'Read me']
    );

    const res = await request(app)
      .patch(`/api/debts/reminders/${ins.insertId}/read`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);

    // Verify is_read = 1
    const [rows] = await pool.execute('SELECT is_read FROM payment_reminders WHERE id = ?', [ins.insertId]);
    expect(rows[0].is_read).toBe(1);
  });
});

describe('DELETE /api/debts/reminders/:id', () => {
  test('should delete a reminder', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'sent' });
    const pool = getPool();
    const date = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [ins] = await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, date, 'before_due', 1, 'Delete me']
    );

    const res = await request(app)
      .delete(`/api/debts/reminders/${ins.insertId}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);

    // Verify deletion
    const [rows] = await pool.execute('SELECT * FROM payment_reminders WHERE id = ?', [ins.insertId]);
    expect(rows.length).toBe(0);
  });

  test('should return 404 for non-existent reminder', async () => {
    const res = await request(app)
      .delete('/api/debts/reminders/999999')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});

// ========================
// Auto-generate Reminders (Model-level)
// ========================
describe('PaymentReminder.autoGenerateReminders()', () => {
  test('should create 3 reminders (7d, 3d, 0d) for future due date', async () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      due_date: futureDate,
    });

    const PaymentReminder = require('../models/PaymentReminder');
    await PaymentReminder.autoGenerateReminders(testAuth.user.id, doc.id);

    const pool = getPool();
    const [rows] = await pool.execute(
      'SELECT * FROM payment_reminders WHERE document_id = ? ORDER BY days_offset DESC',
      [doc.id]
    );

    expect(rows.length).toBe(3);
    expect(rows[0].days_offset).toBe(7);
    expect(rows[1].days_offset).toBe(3);
    expect(rows[2].days_offset).toBe(0);
  });

  test('should not create duplicate reminders', async () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      due_date: futureDate,
    });

    const PaymentReminder = require('../models/PaymentReminder');
    await PaymentReminder.autoGenerateReminders(testAuth.user.id, doc.id);
    await PaymentReminder.autoGenerateReminders(testAuth.user.id, doc.id); // Call again

    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM payment_reminders WHERE document_id = ?', [doc.id]);

    // Should still be 3, not 6
    expect(rows.length).toBe(3);
  });
});

// ========================
// Process Pending Reminders (Model-level)
// ========================
describe('PaymentReminder.processPendingReminders()', () => {
  test('should mark due reminders as sent', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
    });

    const pool = getPool();
    const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, yesterday, 'before_due', 1, 'Should be processed']
    );

    const PaymentReminder = require('../models/PaymentReminder');
    const processed = await PaymentReminder.processPendingReminders();

    expect(processed).toBeGreaterThanOrEqual(1);
  });

  test('should NOT process future reminders', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
    });

    const pool = getPool();
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [testAuth.user.id, doc.id, future, 'before_due', 10, 'Should NOT be processed']
    );

    const PaymentReminder = require('../models/PaymentReminder');
    const processed = await PaymentReminder.processPendingReminders();

    expect(processed).toBe(0);
  });
});

// ========================
// Debt Tracker per Document
// ========================
describe('GET /api/debts/tracker/:documentId', () => {
  test('should return tracker for a specific document', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 750000,
    });

    const res = await request(app)
      .get(`/api/debts/tracker/${doc.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.document).toBeDefined();
    expect(res.body.data.remaining).toBe(750000);
    expect(res.body.data.percentPaid).toBe(0);
  });
});
