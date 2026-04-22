const { getPool } = require('../config/database');

const Product = {
  async create({ user_id, name, description, unit, price, stock, category }) {
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO products (user_id, name, description, unit, price, stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, name, description || '', unit || 'pcs', price, stock || 0, category || '']
    );
    return this.findById(result.insertId, user_id);
  },

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ? AND user_id = ?', [id, userId]);
    return rows[0] || null;
  },

  async findAll(userId, { search, category, page, limit } = {}) {
    const pool = getPool();
    let query = 'SELECT * FROM products WHERE user_id = ?';
    const params = [userId];
    if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category) { query += ' AND category = ?'; params.push(category); }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 20);
    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [data] = await pool.execute(query, params);
    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async update(id, userId, data) {
    const pool = getPool();
    const fields = [];
    const values = [];
    const allowed = ['name', 'description', 'unit', 'price', 'stock', 'category'];
    for (const key of allowed) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]); }
    }
    if (fields.length === 0) return this.findById(id, userId);
    values.push(id, userId);
    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return this.findById(id, userId);
  },

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM products WHERE id = ? AND user_id = ?', [id, userId]);
    return { changes: result.affectedRows };
  }
};

module.exports = Product;
