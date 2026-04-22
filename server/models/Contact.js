const { getPool } = require('../config/database');

const Contact = {
  async create({ user_id, type, name, email, phone, address, notes }) {
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO contacts (user_id, type, name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, type, name, email || '', phone || '', address || '', notes || '']
    );
    return this.findById(result.insertId, user_id);
  },

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    return rows[0] || null;
  },

  async findAll(userId, { type, search, page, limit } = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM contacts WHERE user_id = ?';
    const params = [userId];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 20);
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [data] = await pool.execute(query, params);

    // Add document stats for each contact
    for (const contact of data) {
      const [statsRows] = await pool.execute(
        `SELECT COUNT(*) as invoice_count, COALESCE(SUM(total), 0) as total_revenue,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
                SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
         FROM documents WHERE contact_id = ? AND user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice'`,
        [contact.id, userId]
      );
      const stats = statsRows[0];
      contact.stats = stats;
      if (stats.invoice_count > 0) {
        const ratio = stats.paid_count / stats.invoice_count;
        contact.payment_score = Math.max(1, Math.round(ratio * 5));
      } else {
        contact.payment_score = 0;
      }
    }

    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async update(id, userId, data) {
    const pool = getPool();
    const fields = [];
    const values = [];
    const allowed = ['type', 'name', 'email', 'phone', 'address', 'notes'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return this.findById(id, userId);
    values.push(id, userId);
    await pool.execute(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return this.findById(id, userId);
  },

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM contacts WHERE id = ? AND user_id = ?', [id, userId]);
    return { changes: result.affectedRows };
  }
};

module.exports = Contact;
