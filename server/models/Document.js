const { getPool } = require('../config/database');

const Document = {
  async create({ user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date,
           subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
           total, notes, payment_link, items }) {
    
    const pool = getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO documents (user_id, contact_id, transaction_type, document_type, document_number, status, issue_date, due_date,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, notes, payment_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, contact_id || null, transaction_type, document_type, document_number,
         status || 'draft', issue_date, due_date,
         subtotal || 0, discount_percent || 0, discount_amount || 0,
         tax_percent || 11, tax_amount || 0, total || 0,
         notes || '', payment_link || null]
      );
      const docId = result.insertId;

      if (items && items.length > 0) {
        for (const item of items) {
          await conn.execute(
            'INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
            [docId, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
          );
          // Adjust stock based on transaction type
          if (item.product_id) {
            if (transaction_type === 'sales') {
              await conn.execute(
                'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ? AND user_id = ?',
                [item.quantity, item.product_id, user_id]
              );
            } else if (transaction_type === 'purchase') {
              await conn.execute(
                'UPDATE products SET stock = stock + ? WHERE id = ? AND user_id = ?',
                [item.quantity, item.product_id, user_id]
              );
            }
          }
        }
      }

      await conn.commit();
      return this.findById(docId, user_id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findById(id, userId) {
    const pool = getPool();
    const [docs] = await pool.execute(
      `SELECT d.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone, c.address as contact_address
       FROM documents d
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE d.id = ? AND d.user_id = ?`,
      [id, userId]
    );

    if (!docs[0]) return null;
    const doc = docs[0];

    const [items] = await pool.execute(
      `SELECT di.*, p.name as product_name, p.unit as product_unit
       FROM document_items di
       LEFT JOIN products p ON di.product_id = p.id
       WHERE di.document_id = ?`,
      [id]
    );
    doc.items = items;

    return doc;
  },

  async findByPaymentLink(paymentLink) {
    const pool = getPool();
    const [docs] = await pool.execute(
      `SELECT d.*, c.name as contact_name, c.email as contact_email,
              u.business_name, u.business_logo, u.business_address, u.phone as business_phone
       FROM documents d
       LEFT JOIN contacts c ON d.contact_id = c.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE d.payment_link = ?`,
      [paymentLink]
    );

    if (!docs[0]) return null;
    const doc = docs[0];

    const [items] = await pool.execute(
      `SELECT di.*, p.name as product_name, p.unit as product_unit
       FROM document_items di
       LEFT JOIN products p ON di.product_id = p.id
       WHERE di.document_id = ?`,
      [doc.id]
    );
    doc.items = items;

    return doc;
  },

  async findAll(userId, { transaction_type, document_type, status, search, sort, order, page, limit } = {}) {
    const pool = getPool();
    let query = `
      SELECT d.*, c.name as contact_name
      FROM documents d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.user_id = ?
    `;
    const params = [userId];

    if (transaction_type) {
      query += ' AND d.transaction_type = ?';
      params.push(transaction_type);
    }
    if (document_type) {
      query += ' AND d.document_type = ?';
      params.push(document_type);
    }
    if (status && status !== 'all') {
      query += ' AND d.status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (d.document_number LIKE ? OR c.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Count total
    const countQuery = query.replace(/SELECT d\.\*, c\.name as contact_name/, 'SELECT COUNT(*) as total');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;

    // Sort & paginate
    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    const allowedSorts = ['created_at', 'issue_date', 'due_date', 'total', 'document_number', 'status'];
    const safeSortField = allowedSorts.includes(sortField) ? sortField : 'created_at';
    query += ` ORDER BY d.${safeSortField} ${sortOrder}`;
    
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [data] = await pool.execute(query, params);
    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async update(id, userId, data) {
    const pool = getPool();
    const fields = [];
    const values = [];
    const allowed = ['contact_id', 'status', 'issue_date', 'due_date', 'subtotal',
      'discount_percent', 'discount_amount', 'tax_percent', 'tax_amount', 'total', 'notes'];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    if (data.status === 'paid') {
      fields.push('paid_at = NOW()');
    }
    values.push(id, userId);

    await pool.execute(`UPDATE documents SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

    // Update items if provided
    if (data.items) {
      await pool.execute('DELETE FROM document_items WHERE document_id = ?', [id]);
      for (const item of data.items) {
        await pool.execute(
          'INSERT INTO document_items (document_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
          [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
    }

    return this.findById(id, userId);
  },

  async updateStatus(id, userId, status) {
    const pool = getPool();
    let sql = 'UPDATE documents SET status = ?';
    const params = [status];
    if (status === 'paid') {
      sql += ', paid_at = NOW()';
    }
    sql += ' WHERE id = ? AND user_id = ?';
    params.push(id, userId);

    await pool.execute(sql, params);
    return this.findById(id, userId);
  },

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM documents WHERE id = ? AND user_id = ?', [id, userId]);
    return { changes: result.affectedRows };
  },

  async getStatusCounts(userId, transaction_type, document_type) {
    const pool = getPool();
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM documents WHERE user_id = ?
    `;
    const params = [userId];
    if (transaction_type) {
      query += ' AND transaction_type = ?';
      params.push(transaction_type);
    }
    if (document_type) {
      query += ' AND document_type = ?';
      params.push(document_type);
    }
    const [rows] = await pool.execute(query, params);
    return rows[0];
  },

  async search(userId, keyword) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT d.id, d.document_number, d.transaction_type, d.document_type, d.status, d.total, d.issue_date, c.name as contact_name
       FROM documents d
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE d.user_id = ? AND (d.document_number LIKE ? OR c.name LIKE ?)
       ORDER BY d.created_at DESC
       LIMIT 10`,
      [userId, `%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  }
};

module.exports = Document;
