const { getPool } = require('../config/database');

const Receipt = {
  async create({ user_id, document_id, receipt_number, amount, payment_method, payment_date, notes }) {
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        'INSERT INTO receipts (user_id, document_id, receipt_number, amount, payment_method, payment_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user_id, document_id, receipt_number, amount, payment_method || 'transfer', payment_date, notes || '']
      );

      // Update document paid status if amount covers total
      const [docRows] = await conn.execute('SELECT total FROM documents WHERE id = ?', [document_id]);
      const [paidRows] = await conn.execute('SELECT COALESCE(SUM(amount), 0) as total_paid FROM receipts WHERE document_id = ?', [document_id]);
      
      if (docRows[0] && paidRows[0].total_paid >= docRows[0].total) {
        await conn.execute("UPDATE documents SET status = 'paid', paid_at = NOW() WHERE id = ?", [document_id]);
      } else {
        await conn.execute("UPDATE documents SET status = 'sent' WHERE id = ? AND status = 'draft'", [document_id]);
      }

      await conn.commit();
      return this.findById(result.insertId, user_id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT r.*, d.document_number, d.transaction_type, d.document_type
       FROM receipts r
       LEFT JOIN documents d ON r.document_id = d.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async findAll(userId, { transaction_type, document_id, search, sort, order, page, limit } = {}) {
    const pool = getPool();
    let query = `
      SELECT r.*, d.document_number, d.transaction_type, d.document_type, c.name as contact_name
      FROM receipts r
      LEFT JOIN documents d ON r.document_id = d.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE r.user_id = ?
    `;
    const params = [userId];

    if (transaction_type) {
      query += ' AND d.transaction_type = ?';
      params.push(transaction_type);
    }
    if (document_id) {
      query += ' AND r.document_id = ?';
      params.push(document_id);
    }
    if (search) {
      query += ' AND (r.receipt_number LIKE ? OR d.document_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY r.${sortField === 'created_at' ? 'created_at' : 'created_at'} ${sortOrder}`;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [data] = await pool.execute(query, params);
    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM receipts WHERE id = ? AND user_id = ?', [id, userId]);
    return { changes: result.affectedRows };
  }
};

module.exports = Receipt;
