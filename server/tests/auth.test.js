/**
 * Auth API Tests
 * Tests: Register, Login, Refresh Token, Me, Logout
 */
const request = require('supertest');
const app = require('../app');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { TEST_USER, TEST_USER_2, createTestUser, authHeader } = require('./helpers');

beforeAll(async () => { await setupTestDB(); });
beforeEach(async () => { await cleanDB(); });
afterAll(async () => { await teardownTestDB(); });

describe('POST /api/auth/register', () => {
  test('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: TEST_USER.name,
        email: TEST_USER.email,
        phone: TEST_USER.phone,
        password: TEST_USER.password,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_USER.email);
    expect(res.body.data.user.name).toBe(TEST_USER.name);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Should not expose password hash
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  test('should reject duplicate email', async () => {
    // Register first time via API
    await request(app).post('/api/auth/register').send({
      name: TEST_USER.name, email: TEST_USER.email,
      phone: TEST_USER.phone, password: TEST_USER.password,
    });

    // Try again
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate',
        email: TEST_USER.email,
        phone: '0812',
        password: 'AnyPassword123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('should fail with missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });

  test('should fail with short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test', email: 'short@test.com',
        phone: '081', password: 'short',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('POST /api/auth/login', () => {
  test('should login with valid credentials', async () => {
    // Register via API so login can work cleanly
    await request(app).post('/api/auth/register').send({
      name: TEST_USER.name, email: TEST_USER.email,
      phone: TEST_USER.phone, password: TEST_USER.password,
    });

    // Wait a tiny bit so JWT timestamp differs
    await new Promise(r => setTimeout(r, 1100));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_USER.email);
  });

  test('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@email.com', password: 'anything1234' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('should reject invalid password', async () => {
    await request(app).post('/api/auth/register').send({
      name: TEST_USER.name, email: TEST_USER.email,
      phone: TEST_USER.phone, password: TEST_USER.password,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh', () => {
  test('should return new access token with valid refresh token', async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: TEST_USER.name, email: TEST_USER.email,
      phone: TEST_USER.phone, password: TEST_USER.password,
    });
    const { refreshToken } = regRes.body.data;

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  test('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid_token_here' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('should fail without refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  test('should return current user profile', async () => {
    const { token } = await createTestUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_USER.email);
    expect(res.body.data.name).toBe(TEST_USER.name);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('should reject invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set(authHeader('invalid_token'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/logout', () => {
  test('should logout successfully', async () => {
    const { token, refreshToken } = await createTestUser();
    const res = await request(app)
      .post('/api/auth/logout')
      .set(authHeader(token))
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('should invalidate refresh token after logout', async () => {
    const { token, refreshToken } = await createTestUser();

    // Logout (with auth)
    await request(app)
      .post('/api/auth/logout')
      .set(authHeader(token))
      .send({ refreshToken });

    // Try to refresh — should fail
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(403);
  });
});
