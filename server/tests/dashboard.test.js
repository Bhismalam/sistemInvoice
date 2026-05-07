/**
 * Dashboard, Reports & Settings API Tests
 * Tests: Stats, chart data, reports (aging, P&L, cashflow), settings CRUD
 */
const request = require('supertest');
const app = require('../app');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { createTestUser, createTestDocument, authHeader } = require('./helpers');

let testAuth;

beforeAll(async () => { await setupTestDB(); });
beforeEach(async () => {
  await cleanDB();
  testAuth = await createTestUser();
});
afterAll(async () => { await teardownTestDB(); });

// ========================
// Dashboard Stats
// ========================
describe('GET /api/dashboard/stats', () => {
  test('should return dashboard statistics', async () => {
    // Create some documents
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'sales', document_type: 'invoice', status: 'paid', total: 1000000, document_number: 'S1',
    });
    await createTestDocument(testAuth.user.id, {
      transaction_type: 'sales', document_type: 'invoice', status: 'sent', total: 500000, document_number: 'S2',
    });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dashboard/chart', () => {
  test('should return chart data', async () => {
    const res = await request(app)
      .get('/api/dashboard/chart')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

describe('GET /api/dashboard/recent', () => {
  test('should return recent activities', async () => {
    // Create a document to generate activity
    await request(app)
      .post('/api/documents')
      .set(authHeader(testAuth.token))
      .send({
        transaction_type: 'sales', document_type: 'invoice',
        issue_date: '2026-01-01', due_date: '2026-01-31',
        subtotal: 100000, total: 111000,
        items: [{ description: 'Item', quantity: 1, unit_price: 100000, total: 100000 }],
      });

    const res = await request(app)
      .get('/api/dashboard/recent')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ========================
// Reports
// ========================
describe('GET /api/reports/aging', () => {
  test('should return aging report', async () => {
    const res = await request(app)
      .get('/api/reports/aging')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/reports/profit-loss', () => {
  test('should return profit/loss report', async () => {
    const res = await request(app)
      .get('/api/reports/profit-loss')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/reports/cashflow', () => {
  test('should return cashflow report', async () => {
    const res = await request(app)
      .get('/api/reports/cashflow')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ========================
// Settings
// ========================
describe('GET /api/settings', () => {
  test('should return user settings', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

describe('PUT /api/settings', () => {
  test('should update user settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set(authHeader(testAuth.token))
      .send({
        business_name: 'PT Test Company',
        business_address: 'Jl. Test No. 1, Jakarta',
        npwp: '12.345.678.9-012.000',
        default_tax_percent: 11,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.business_name).toBe('PT Test Company');
  });

  test('should persist settings changes', async () => {
    await request(app)
      .put('/api/settings')
      .set(authHeader(testAuth.token))
      .send({ business_name: 'Persisted Corp' });

    const res = await request(app)
      .get('/api/settings')
      .set(authHeader(testAuth.token));

    expect(res.body.data.business_name).toBe('Persisted Corp');
  });
});

// ========================
// Health Check
// ========================
describe('GET /api/health', () => {
  test('should return health status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
    expect(res.body.timestamp).toBeDefined();
  });
});

// ========================
// 404 Handling
// ========================
describe('Unknown endpoint', () => {
  test('should return 404 for unknown endpoint', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
