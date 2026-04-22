const { getPool } = require('../config/database');

const User = {
  async create({ name, email, phone, password_hash }) {
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)',
      [name, email, phone || '', password_hash]
    );
    return this.findById(result.insertId);
  },

  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, business_name, business_logo,
              business_address, npwp, invoice_prefix, invoice_counter,
              default_tax_percent, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async update(id, data) {
    const pool = getPool();
    const fields = [];
    const values = [];
    const allowed = ['name', 'phone', 'business_name', 'business_logo',
      'business_address', 'npwp', 'invoice_prefix', 'default_tax_percent'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  async incrementInvoiceCounter(id) {
    const pool = getPool();
    await pool.execute('UPDATE users SET invoice_counter = invoice_counter + 1 WHERE id = ?', [id]);
    const [rows] = await pool.execute('SELECT invoice_prefix, invoice_counter FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async markNotificationsRead(id) {
    const pool = getPool();
    await pool.execute('UPDATE users SET notifications_read_at = NOW() WHERE id = ?', [id]);
  }
};

// Refresh token helpers
const RefreshToken = {
  async create(userId, token, expiresAt) {
    const pool = getPool();
    await pool.execute('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);
  },
  async find(token) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()', [token]);
    return rows[0] || null;
  },
  async delete(token) {
    const pool = getPool();
    await pool.execute('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  },
  async deleteAllForUser(userId) {
    const pool = getPool();
    await pool.execute('DELETE FROM refresh_tokens WHERE user_id = ?', [userId]);
  }
};

module.exports = { User, RefreshToken };
