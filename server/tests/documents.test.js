/**
 * Document API Tests
 * Tests: CRUD, status transitions, search, filtering, payment workflow
 */
const request = require('supertest');
const app = require('../app');
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
// CRUD Operations
// ========================
describe('POST /api/documents', () => {
  test('should create a sales invoice', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(authHeader(testAuth.token))
      .send({
        transaction_type: 'sales',
        document_type: 'invoice',
        contact_id: testContact.id,
        issue_date: '2026-01-01',
        due_date: '2026-01-31',
        subtotal: 100000,
        discount_percent: 0,
        discount_amount: 0,
        tax_percent: 11,
        tax_amount: 11000,
        total: 111000,
        items: [{ description: 'Web Design', quantity: 1, unit_price: 100000, total: 100000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction_type).toBe('sales');
    expect(res.body.data.document_type).toBe('invoice');
    expect(res.body.data.document_number).toBeDefined();
    expect(parseFloat(res.body.data.total)).toBe(111000);
  });

  test('should create a purchase order', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(authHeader(testAuth.token))
      .send({
        transaction_type: 'purchase',
        document_type: 'order',
        contact_id: testContact.id,
        issue_date: '2026-01-01',
        due_date: '2026-02-01',
        subtotal: 500000,
        tax_percent: 11,
        tax_amount: 55000,
        total: 555000,
        items: [{ description: 'Raw Material', quantity: 10, unit_price: 50000, total: 500000 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction_type).toBe('purchase');
    expect(res.body.data.document_type).toBe('order');
  });

  test('should auto-generate document number', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(authHeader(testAuth.token))
      .send({
        transaction_type: 'sales',
        document_type: 'invoice',
        issue_date: '2026-01-01',
        due_date: '2026-01-31',
        subtotal: 0, total: 0,
        items: [],
      });

    expect(res.body.data.document_number).toMatch(/^INV-/);
  });

  test('should auto-generate payment link for sales invoices', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set(authHeader(testAuth.token))
      .send({
        transaction_type: 'sales',
        document_type: 'invoice',
        issue_date: '2026-01-01',
        due_date: '2026-01-31',
        subtotal: 50000, total: 50000,
        items: [{ description: 'Item', quantity: 1, unit_price: 50000, total: 50000 }],
      });

    expect(res.body.data.payment_link).toBeDefined();
    expect(res.body.data.payment_link.length).toBeGreaterThan(10);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({ transaction_type: 'sales', document_type: 'invoice' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/documents', () => {
  test('should list documents for user', async () => {
    await createTestDocument(testAuth.user.id, { document_number: 'INV-001' });
    await createTestDocument(testAuth.user.id, { document_number: 'INV-002' });

    const res = await request(app)
      .get('/api/documents')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('should filter by transaction_type', async () => {
    await createTestDocument(testAuth.user.id, { transaction_type: 'sales', document_number: 'S1' });
    await createTestDocument(testAuth.user.id, { transaction_type: 'purchase', document_number: 'P1' });

    const res = await request(app)
      .get('/api/documents?transaction_type=sales')
      .set(authHeader(testAuth.token));

    expect(res.body.data.every(d => d.transaction_type === 'sales')).toBe(true);
  });

  test('should filter by document_type', async () => {
    await createTestDocument(testAuth.user.id, { document_type: 'invoice', document_number: 'I1' });
    await createTestDocument(testAuth.user.id, { document_type: 'order', document_number: 'O1' });

    const res = await request(app)
      .get('/api/documents?document_type=order')
      .set(authHeader(testAuth.token));

    expect(res.body.data.every(d => d.document_type === 'order')).toBe(true);
  });

  test('should filter by status', async () => {
    await createTestDocument(testAuth.user.id, { status: 'draft', document_number: 'D1' });
    await createTestDocument(testAuth.user.id, { status: 'sent', document_number: 'S1' });

    const res = await request(app)
      .get('/api/documents?status=draft')
      .set(authHeader(testAuth.token));

    expect(res.body.data.every(d => d.status === 'draft')).toBe(true);
  });

  test('should not show other users documents', async () => {
    const user2 = await createTestUser({
      name: 'Other', email: 'other@test.com', phone: '082', password: 'P!'
    });
    await createTestDocument(user2.user.id, { document_number: 'PRIVATE-1' });

    const res = await request(app)
      .get('/api/documents')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(0);
  });
});

describe('GET /api/documents/:id', () => {
  test('should get a document by ID with items', async () => {
    const doc = await createTestDocument(testAuth.user.id);

    const res = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.document_number).toBe(doc.document_number);
    expect(res.body.data.items).toBeDefined();
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  test('should return 404 for non-existent document', async () => {
    const res = await request(app)
      .get('/api/documents/999999')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/documents/:id', () => {
  test('should update a document', async () => {
    const doc = await createTestDocument(testAuth.user.id);

    const res = await request(app)
      .put(`/api/documents/${doc.id}`)
      .set(authHeader(testAuth.token))
      .send({ notes: 'Updated notes', total: 999999 });

    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('Updated notes');
  });

  test('should not allow editing a paid document status', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'paid' });

    const res = await request(app)
      .put(`/api/documents/${doc.id}`)
      .set(authHeader(testAuth.token))
      .send({ status: 'draft' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/documents/:id', () => {
  test('should delete a document', async () => {
    const doc = await createTestDocument(testAuth.user.id);

    const res = await request(app)
      .delete(`/api/documents/${doc.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
  });

  test('should return 404 for non-existent document', async () => {
    const res = await request(app)
      .delete('/api/documents/999999')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});

// ========================
// Status Transitions
// ========================
describe('PATCH /api/documents/:id/status', () => {
  test('should update status from draft to sent', async () => {
    const doc = await createTestDocument(testAuth.user.id, { status: 'draft' });

    const res = await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(authHeader(testAuth.token))
      .send({ status: 'sent' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('sent');
  });

  test('should auto-create reminders when invoice status set to sent', async () => {
    const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const doc = await createTestDocument(testAuth.user.id, {
      status: 'draft',
      document_type: 'invoice',
      due_date: futureDate,
    });

    await request(app)
      .patch(`/api/documents/${doc.id}/status`)
      .set(authHeader(testAuth.token))
      .send({ status: 'sent' });

    // Check reminders were created
    const remRes = await request(app)
      .get('/api/debts/reminders')
      .set(authHeader(testAuth.token));

    expect(remRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ========================
// Search
// ========================
describe('GET /api/search', () => {
  test('should search documents by number', async () => {
    await createTestDocument(testAuth.user.id, { document_number: 'INV-SEARCH-001' });

    const res = await request(app)
      .get('/api/search?q=SEARCH-001')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].document_number).toContain('SEARCH-001');
  });
});
