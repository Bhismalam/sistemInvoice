const { getPool } = require('../config/database');

const ActivityLog = {
  async create({ user_id, document_id, action, details }) {
    const pool = getPool();
    await pool.execute(
      'INSERT INTO activity_logs (user_id, document_id, action, details) VALUES (?, ?, ?, ?)',
      [user_id, document_id || null, action, details || '']
    );
  },

  async log(user_id, document_id, action, details = '') {
    return this.create({ user_id, document_id, action, details });
  },

  async findAll(userId, limit = 20) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT al.*, d.document_number, c.name as contact_name
      FROM activity_logs al
      LEFT JOIN documents d ON al.document_id = d.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [userId, limit]);
    return rows;
  },

  async countUnread(userId) {
    const pool = getPool();
    const [userRows] = await pool.execute('SELECT notifications_read_at FROM users WHERE id = ?', [userId]);
    const since = userRows[0]?.notifications_read_at || '1970-01-01';
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND created_at > ?',
      [userId, since]
    );
    return rows[0].count;
  }
};

module.exports = ActivityLog;
