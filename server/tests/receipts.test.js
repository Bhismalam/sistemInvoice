/**
 * Receipt API Tests
 * Tests: CRUD, auto-generation from payments, listing with filters
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

describe('POST /api/receipts', () => {
  test('should create a receipt for an invoice', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      contact_id: testContact.id,
      total: 500000,
    });

    const res = await request(app)
      .post('/api/receipts')
      .set(authHeader(testAuth.token))
      .send({
        document_id: doc.id,
        receipt_number: 'RCP-TEST-001',
        amount: 500000,
        payment_method: 'transfer',
        payment_date: '2026-01-15',
        notes: 'Full payment',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.receipt_number).toBe('RCP-TEST-001');
    expect(parseFloat(res.body.data.amount)).toBe(500000);
  });

  test('should update document status to paid when amount >= total', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 100000,
    });

    await request(app)
      .post('/api/receipts')
      .set(authHeader(testAuth.token))
      .send({
        document_id: doc.id,
        receipt_number: 'RCP-PAID-001',
        amount: 100000,
        payment_method: 'cash',
        payment_date: '2026-01-15',
      });

    // Verify document status changed
    const docRes = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set(authHeader(testAuth.token));

    expect(docRes.body.data.status).toBe('paid');
  });
});

describe('GET /api/receipts', () => {
  test('should list receipts for user', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 100000,
    });

    // Create receipt via payment endpoint
    await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    const res = await request(app)
      .get('/api/receipts')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('should filter receipts by transaction_type', async () => {
    // Create sales invoice + pay
    const salesDoc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'sales',
      total: 50000,
      document_number: 'INV-SALES-R',
    });
    await request(app)
      .post(`/api/documents/${salesDoc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'cash' });

    // Create purchase invoice + pay
    const purchaseDoc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'purchase',
      total: 30000,
      document_number: 'INV-PURCH-R',
    });
    await request(app)
      .post(`/api/documents/${purchaseDoc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    const salesReceipts = await request(app)
      .get('/api/receipts?transaction_type=sales')
      .set(authHeader(testAuth.token));

    const purchaseReceipts = await request(app)
      .get('/api/receipts?transaction_type=purchase')
      .set(authHeader(testAuth.token));

    expect(salesReceipts.body.data.length).toBe(1);
    expect(purchaseReceipts.body.data.length).toBe(1);
  });

  test('should not show other users receipts', async () => {
    const user2 = await createTestUser({
      name: 'Other', email: 'other@test.com', phone: '082', password: 'Pass!'
    });
    const doc = await createTestDocument(user2.user.id, {
      status: 'sent',
      document_type: 'invoice',
      total: 10000,
    });
    await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(user2.token))
      .send({ payment_method: 'cash' });

    const res = await request(app)
      .get('/api/receipts')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(0);
  });
});

describe('Payment → Receipt Integration', () => {
  test('sales payment should create receipt in sales receipts', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'sales',
      total: 500000,
    });

    const payRes = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'qris' });

    expect(payRes.body.data.receipt).toBeDefined();
    expect(payRes.body.data.receipt.payment_method).toBe('qris');
    expect(payRes.body.message).toContain('Kuitansi Penjualan');
  });

  test('purchase payment should create receipt in purchase receipts', async () => {
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'sent',
      document_type: 'invoice',
      transaction_type: 'purchase',
      total: 300000,
    });

    const payRes = await request(app)
      .post(`/api/documents/${doc.id}/pay`)
      .set(authHeader(testAuth.token))
      .send({ payment_method: 'transfer' });

    expect(payRes.body.data.receipt).toBeDefined();
    expect(payRes.body.message).toContain('Kuitansi Pembelian');
  });
});
