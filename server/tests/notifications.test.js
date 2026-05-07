const request = require('supertest');
const app = require('../app');
const { getPool } = require('../config/database');
const { setupTestDB, cleanDB, teardownTestDB } = require('./setup');
const { createTestUser, authHeader } = require('./helpers');
const ActivityLog = require('../models/ActivityLog');

let userToken;
let testUser;

beforeAll(async () => {
  await setupTestDB();
  await cleanDB();
  const { user, token } = await createTestUser();
  testUser = user;
  userToken = token;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Notifications API', () => {
  beforeEach(async () => {
    const pool = getPool();
    await pool.execute('DELETE FROM activity_logs');
    await pool.execute('UPDATE users SET notifications_read_at = "2020-01-01 00:00:00" WHERE id = ?', [testUser.id]);
  });

  it('GET /api/notifications should return latest notifications and unread count', async () => {
    // Add some activities
    await ActivityLog.create({ user_id: testUser.id, document_id: null, action: 'CREATE_INVOICE', details: 'Invoice INV-001 created' });
    await ActivityLog.create({ user_id: testUser.id, document_id: null, action: 'PAYMENT_RECEIVED', details: 'Payment 500' });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBeDefined();
    expect(res.body.data.notifications.length).toBe(2);
    expect(res.body.data.unreadCount).toBe(2);
    expect(res.body.data.notifications[0].action).toBe('PAYMENT_RECEIVED'); // DESC order
  });

  it('POST /api/notifications/read should mark all notifications as read', async () => {
    // Add some activities
    await ActivityLog.create({ user_id: testUser.id, document_id: null, action: 'CREATE_INVOICE', details: 'Invoice INV-001 created' });

    // Mark as read
    const res = await request(app)
      .post('/api/notifications/read')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify unread count is 0
    const resCheck = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(resCheck.body.data.unreadCount).toBe(0);
    expect(resCheck.body.data.notifications.length).toBe(1); // Notifications are still there, just read
  });
});
