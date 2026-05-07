/**
 * Product API Tests
 * Tests: CRUD operations for products catalog
 */
const request = require('supertest');
const app = require('../app');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { createTestUser, createTestProduct, authHeader } = require('./helpers');

let testAuth;

beforeAll(async () => { await setupTestDB(); });
beforeEach(async () => {
  await cleanDB();
  testAuth = await createTestUser();
});
afterAll(async () => { await teardownTestDB(); });

describe('POST /api/products', () => {
  test('should create a new product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(testAuth.token))
      .send({ name: 'Widget Pro', description: 'Best widget', unit: 'pcs', price: 50000, stock: 100, category: 'Elektronik' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Widget Pro');
    expect(parseFloat(res.body.data.price)).toBe(50000);
  });

  test('should fail with missing name', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(testAuth.token))
      .send({ price: 50000 });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('should fail with non-numeric price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(authHeader(testAuth.token))
      .send({ name: 'Bad Product', price: 'not_a_number' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Secret', price: 100 });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/products', () => {
  test('should list all products for user', async () => {
    await createTestProduct(testAuth.user.id, { name: 'Product A', price: 10000 });
    await createTestProduct(testAuth.user.id, { name: 'Product B', price: 20000 });

    const res = await request(app)
      .get('/api/products')
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('should search products by name', async () => {
    await createTestProduct(testAuth.user.id, { name: 'Laptop Gaming' });
    await createTestProduct(testAuth.user.id, { name: 'Mouse Wireless' });

    const res = await request(app)
      .get('/api/products?search=Laptop')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Laptop Gaming');
  });

  test('should filter by category', async () => {
    await createTestProduct(testAuth.user.id, { name: 'A', category: 'Food' });
    await createTestProduct(testAuth.user.id, { name: 'B', category: 'Electronics' });

    const res = await request(app)
      .get('/api/products?category=Food')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('Food');
  });

  test('should not show other users products', async () => {
    const user2 = await createTestUser({
      name: 'Other', email: 'other@test.com', phone: '082', password: 'Pass!'
    });
    await createTestProduct(user2.user.id, { name: 'Private Product' });

    const res = await request(app)
      .get('/api/products')
      .set(authHeader(testAuth.token));

    expect(res.body.data.length).toBe(0);
  });
});

describe('GET /api/products/:id', () => {
  test('should get a product by ID', async () => {
    const product = await createTestProduct(testAuth.user.id);

    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(product.name);
  });

  test('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .get('/api/products/999999')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/products/:id', () => {
  test('should update a product', async () => {
    const product = await createTestProduct(testAuth.user.id);

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set(authHeader(testAuth.token))
      .send({ name: 'Updated Widget', price: 75000, stock: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Widget');
    expect(parseFloat(res.body.data.price)).toBe(75000);
    expect(res.body.data.stock).toBe(200);
  });

  test('should allow partial update', async () => {
    const product = await createTestProduct(testAuth.user.id, { name: 'Original', price: 50000 });

    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set(authHeader(testAuth.token))
      .send({ stock: 999 });

    expect(res.body.data.name).toBe('Original');
    expect(res.body.data.stock).toBe(999);
  });
});

describe('DELETE /api/products/:id', () => {
  test('should delete a product', async () => {
    const product = await createTestProduct(testAuth.user.id);

    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set(authHeader(testAuth.token));

    expect(res.status).toBe(200);

    const check = await request(app)
      .get(`/api/products/${product.id}`)
      .set(authHeader(testAuth.token));
    expect(check.status).toBe(404);
  });

  test('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .delete('/api/products/999999')
      .set(authHeader(testAuth.token));
    expect(res.status).toBe(404);
  });
});
