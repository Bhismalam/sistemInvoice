/**
 * Contact API Tests
 * Tests: CRUD operations for contacts (customers & suppliers)
 */
const request = require('supertest');
const app = require('../app');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { createTestUser, createTestContact, authHeader } = require('./helpers');

let testAuth;

beforeAll(async () => { await setupTestDB(); });
beforeEach(async () => {
  await cleanDB();
  testAuth = await createTestUser();
});
afterAll(async () => { await teardownTestDB(); });

describe('POST /api/contacts', () => {
  test('should create a new customer contact', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set(authHeader(testAuth.token))
      .send({ name: 'PT Maju Jaya', type: 'customer', email: 'maju@jaya.com', phone: '081111' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('PT Maju Jaya');
    expect(res.body.data.type).toBe('customer');
  });

  test('should create a new supplier contact', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set(authHeader(testAuth.token))
      .send({ name: 'Supplier ABC', type: 'supplier', email: 'abc@supplier.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe('supplier');
  });

  test('should fail with missing name', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set(authHeader(testAuth.token))
      .send({ type: 'customer' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('should fail with invalid type', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set(authHeader(testAuth.token))
      .send({ name: 'Test', type: 'invalid_type' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .send({ name: 'Test', type: 'customer' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/contacts', () => {
  test('should list all contacts for user', async () => {
    await createTestContact(testAuth.user.id, { name: 'Contact A' });
    await createTestContact(testAuth.user.id, { name: 'Contact B', email: 'b@test.com' });

    const res = await request(app)
      .get('/api/contacts')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  test('should filter contacts by type', async () => {
    await createTestContact(testAuth.user.id, { name: 'Customer X', type: 'customer' });
    await createTestContact(testAuth.user.id, { name: 'Supplier Y', type: 'supplier', email: 'sy@test.com' });

    const res = await request(app)
      .get('/api/contacts?type=supplier')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].type).toBe('supplier');
  });

  test('should search contacts by name', async () => {
    await createTestContact(testAuth.user.id, { name: 'PT Alpha Beta' });
    await createTestContact(testAuth.user.id, { name: 'CV Gamma Delta', email: 'g@test.com' });

    const res = await request(app)
      .get('/api/contacts?search=Alpha')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('PT Alpha Beta');
  });

  test('should not show other users contacts', async () => {
    const user2 = await createTestUser({
      name: 'Other', email: 'other@test.com', phone: '082', password: 'Pass123!'
    });
    await createTestContact(user2.user.id, { name: 'Secret Contact', email: 'secret@t.com' });

    const res = await request(app)
      .get('/api/contacts')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(0);
  });

  test('should paginate results', async () => {
    for (let i = 0; i < 5; i++) {
      await createTestContact(testAuth.user.id, { name: `Contact ${i}`, email: `c${i}@t.com` });
    }

    const res = await request(app)
      .get('/api/contacts?page=1&limit=2')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(2);
    expect(res.body.meta.total).toBe(5);
    expect(res.body.meta.totalPages).toBe(3);
  });
});

describe('GET /api/contacts/:id', () => {
  test('should get a single contact by ID', async () => {
    const contact = await createTestContact(testAuth.user.id);

    const res = await request(app)
      .get(`/api/contacts/${contact.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(contact.name);
  });

  test('should return 404 for non-existent contact', async () => {
    const res = await request(app)
      .get('/api/contacts/999999')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(404);
  });
});

describe('PUT /api/contacts/:id', () => {
  test('should update a contact', async () => {
    const contact = await createTestContact(testAuth.user.id);

    const res = await request(app)
      .put(`/api/contacts/${contact.id}`)
      .set(authHeader(testAuth.token))
      .send({ name: 'Updated Name', phone: '089999' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.phone).toBe('089999');
  });
});

describe('DELETE /api/contacts/:id', () => {
  test('should delete a contact', async () => {
    const contact = await createTestContact(testAuth.user.id);

    const res = await request(app)
      .delete(`/api/contacts/${contact.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify deletion
    const check = await request(app)
      .get(`/api/contacts/${contact.id}`)
      .set(authHeader(testAuth.token));
    expect(check.status).toBe(404);
  });

  test('should return 404 for non-existent contact', async () => {
    const res = await request(app)
      .delete('/api/contacts/999999')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(404);
  });
});
