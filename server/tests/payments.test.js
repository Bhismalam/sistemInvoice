/**
 * Payment Workflow Tests
 * Tests: Process payment, cancel document, payment tracker, 24h auto-delete
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
// Process Payment
// ========================
describe('POST /api/documents/:id/pay', () => {
  test('should process payment for a sent invoice', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'sales',
      contact_id: testContact.id,
      total: 500000,
    });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.document.status).toBe('paid');
    expect(res.body.data.receipt).toBeDefined();
    expect(res.body.data.receipt.receipt_number).toMatch(/^RCP-/);
  });

  test('should auto-create receipt when payment is processed', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 250000,
    });

    await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'cash' });

    // Verify receipt was created
    const receipts = await request(app)
      .get('/api/receipts?transaction_type=sales')
      .set(authHeader(testAuth.token));

    expect(receipts.body.data.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(receipts.body.data[0].amount)).toBe(250000);
  });

  test('should process payment for a purchase invoice', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'purchase',
      contact_id: testContact.id,
      total: 300000,
    });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    expect(res.status).toBe(200);
    expect(res.body.data.document.status).toBe('paid');
    expect(res.body.message).toContain('Invoice telah dibayar');
  });

  test('should accept various payment methods', async () => {
    const methods = ['transfer', 'cash', 'qris', 'e-wallet', 'kartu_kredit'];

    for (const method of methods) {
      await cleanDB();
      testAuth = await createTestUser();
      const doc = await createTestDocument(testAuth.user.id, {
        status: 'sent',
        document_type: 'invoice',
        total: 100000,
        document_number: `INV-${method}`,
      });

      const res = await request(app)
        .post(`/api/documents/${doc.id}/pay`)
        .set(authHeader(testAuth.token))
        .send({ payment_method: method });

      expect(res.status).toBe(200);
      expect(res.body.data.receipt.payment_method).toBe(method);
    }
  });

  test('should reject payment for already paid document', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'paid',
      document_type: 'invoice',
    });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('sudah lunas');
  });

  test('should reject payment for cancelled document', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'cancelled',
      document_type: 'invoice',
    });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('dibatalkan');
  });

  test('should return 404 for non-existent document', async () => {
    const res = await request(app)
      .post('/api/documents/999999/pay')
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });
    expect(res.status).toBe(404);
  });
});

// ========================
// Cancel Document
// ========================
describe('POST /api/documents/:id/cancel', () => {
  test('should cancel a sent invoice', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
    });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/cancel`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.message).toContain('24 jam');
  });

  test('should set cancelled_at timestamp', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'sent' });

    await request(app)
      .post(`/api/documents/${doc.id}/cancel`)
      .set(authHeader(testAuth.token));

    const pool = getPool();
    const [rows] = await pool.execute('SELECT cancelled_at FROM documents WHERE id = ?', [doc.id]);
    expect(rows[0].cancelled_at).not.toBeNull();
  });

  test('should not allow cancelling a paid document', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'paid' });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/cancel`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('sudah lunas');
  });

  test('should cancel a draft document', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'draft' });

    const res = await request(app)
      .post(`/api/documents/${doc.id}/cancel`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});

// ========================
// Payment Tracker
// ========================
describe('GET /api/documents/:id/tracker', () => {
  test('should return tracker info for an invoice', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 500000,
    });

    const res = await request(app)
      .get(`/api/documents/${doc.id}/tracker`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.document).toBeDefined();
    expect(res.body.data.totalPaid).toBeDefined();
    expect(res.body.data.remaining).toBeDefined();
    expect(res.body.data.percentPaid).toBeDefined();
    expect(res.body.data.daysUntilDue).toBeDefined();
    expect(res.body.data.isOverdue).toBeDefined();
    expect(res.body.data.isPaid).toBe(false);
  });

  test('should show 100% paid after payment', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 100000,
    });

    // Pay the invoice
    await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    const res = await request(app)
      .get(`/api/documents/${doc.id}/tracker`)
      .set(authHeader(testAuth.token));

    expect(res.body.data.isPaid).toBe(true);
    expect(res.body.data.percentPaid).toBe(100);
    expect(res.body.data.remaining).toBe(0);
  });

  test('should detect overdue invoices', async () => {
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      due_date: pastDate,
    });

    const res = await request(app)
      .get(`/api/documents/${doc.id}/tracker`)
      .set(authHeader(testAuth.token));

    expect(res.body.data.isOverdue).toBe(true);
    expect(res.body.data.daysUntilDue).toBeLessThan(0);
  });

  test('should return 404 for non-existent document', async () => {
    const res = await request(app)
      .get('/api/documents/999999/tracker')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});

// ========================
// 24h Auto-delete Cancelled Documents (Model-level)
// ========================
describe('Document.cleanupCancelledDocuments()', () => {
  test('should auto-delete documents cancelled more than 24 hours ago', async () => {
    const pool = getPool();
    const doc = await createTestDocument(testAuth.user.id, { status: 'cancelled' });

    // Backdate cancelled_at to 25 hours ago
    await pool.execute(
      'UPDATE documents SET cancelled_at = DATE_SUB(NOW(), INTERVAL 25 HOUR) WHERE id = ?',
      [doc.id]
    );

    const Document = require('../models/Document');
    const deleted = await Document.cleanupCancelledDocuments();

    expect(deleted).toBeGreaterThanOrEqual(1);

    // Verify deletion
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [doc.id]);
    expect(rows.length).toBe(0);
  });

  test('should NOT delete documents cancelled less than 24 hours ago', async () => {
    const pool = getPool();
    const doc = await createTestDocument(testAuth.user.id, { status: 'cancelled' });

    // Set cancelled_at to 1 hour ago
    await pool.execute(
      'UPDATE documents SET cancelled_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [doc.id]
    );

    const Document = require('../models/Document');
    const deleted = await Document.cleanupCancelledDocuments();

    expect(deleted).toBe(0);

    // Verify NOT deleted
    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [doc.id]);
    expect(rows.length).toBe(1);
  });
});

// ========================
// Auto-mark Overdue Documents (Model-level)
// ========================
describe('Document.markOverdueDocuments()', () => {
  test('should mark sent invoices past due date as overdue', async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      due_date: pastDate,
    });

    const Document = require('../models/Document');
    const marked = await Document.markOverdueDocuments();

    expect(marked).toBeGreaterThanOrEqual(1);

    const pool = getPool();
    const [rows] = await pool.execute('SELECT status FROM documents WHERE id = ?', [doc.id]);
    expect(rows[0].status).toBe('overdue');
  });

  test('should NOT mark paid invoices as overdue', async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await createTestDocument(testAuth.user.id, {
      status: 'paid',
      document_type: 'invoice',
      due_date: pastDate,
      document_number: 'INV-PAID-1',
    });

    const Document = require('../models/Document');
    const marked = await Document.markOverdueDocuments();
    expect(marked).toBe(0);
  });

  test('should NOT mark orders as overdue', async () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'order',
      due_date: pastDate,
    });

    const Document = require('../models/Document');
    const marked = await Document.markOverdueDocuments();
    expect(marked).toBe(0);
  });
});
