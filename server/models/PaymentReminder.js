const { getPool } = require('../config/database');

const PaymentReminder = {
  async create({ user_id, document_id, reminder_date, reminder_type, days_offset, message }) {
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, document_id, reminder_date, reminder_type || 'before_due', days_offset || 0, message || '']
    );
    return this.findById(result.insertId, user_id);
  },

  async findById(id, userId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT pr.*, d.document_number, d.total, d.due_date as doc_due_date, d.status as doc_status,
              d.transaction_type, d.document_type, c.name as contact_name
       FROM payment_reminders pr
       LEFT JOIN documents d ON pr.document_id = d.id
       LEFT JOIN contacts c ON d.contact_id = c.id
       WHERE pr.id = ? AND pr.user_id = ?`,
      [id, userId]
    );
    return rows[0] || null;
  },

  async findAll(userId, { transaction_type, status, page, limit } = {}) {
    const pool = getPool();
    let query = `
      SELECT pr.*, d.document_number, d.total, d.due_date as doc_due_date, d.status as doc_status,
             d.transaction_type, d.document_type, c.name as contact_name
      FROM payment_reminders pr
      LEFT JOIN documents d ON pr.document_id = d.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE pr.user_id = ?
    `;
    const params = [userId];

    if (transaction_type) {
      query += ' AND d.transaction_type = ?';
      params.push(transaction_type);
    }
    if (status === 'pending') {
      query += ' AND pr.is_sent = 0';
    } else if (status === 'sent') {
      query += ' AND pr.is_sent = 1';
    }

    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.execute(countQuery, params);
    const total = countRows[0].total;

    query += ' ORDER BY pr.reminder_date ASC';
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    query += ' LIMIT ? OFFSET ?';
    params.push(limitNum, (pageNum - 1) * limitNum);

    const [data] = await pool.execute(query, params);
    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  // Get upcoming reminders (due within next N days)
  async getUpcoming(userId, days = 7) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT pr.*, d.document_number, d.total, d.due_date as doc_due_date, d.status as doc_status,
             d.transaction_type, d.document_type, c.name as contact_name
      FROM payment_reminders pr
      LEFT JOIN documents d ON pr.document_id = d.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE pr.user_id = ? AND pr.is_sent = 0
        AND pr.reminder_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND d.status IN ('sent', 'overdue')
      ORDER BY pr.reminder_date ASC
    `, [userId, days]);
    return rows;
  },

  // Get overdue (unpaid) debts  
  async getDebtSummary(userId) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT d.id, d.document_number, d.total, d.due_date, d.status, d.issue_date,
             d.transaction_type, d.document_type,
             c.name as contact_name, c.email as contact_email,
             DATEDIFF(CURDATE(), d.due_date) as days_overdue,
             DATEDIFF(d.due_date, CURDATE()) as days_until_due
      FROM documents d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.user_id = ? AND d.document_type = 'invoice' 
        AND d.status IN ('sent', 'overdue')
      ORDER BY d.due_date ASC
    `, [userId]);

    const debts = {
      purchase: { upcoming: [], overdue: [], total_amount: 0, overdue_amount: 0 },
      sales: { upcoming: [], overdue: [], total_amount: 0, overdue_amount: 0 }
    };

    for (const row of rows) {
      row.total = parseFloat(row.total);
      const type = row.transaction_type;
      debts[type].total_amount += row.total;
      
      if (row.days_overdue > 0) {
        debts[type].overdue.push(row);
        debts[type].overdue_amount += row.total;
      } else {
        debts[type].upcoming.push(row);
      }
    }

    return debts;
  },

  async markSent(id, userId) {
    const pool = getPool();
    await pool.execute(
      'UPDATE payment_reminders SET is_sent = 1, sent_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return this.findById(id, userId);
  },

  async markRead(id, userId) {
    const pool = getPool();
    await pool.execute(
      'UPDATE payment_reminders SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  },

  async delete(id, userId) {
    const pool = getPool();
    const [result] = await pool.execute('DELETE FROM payment_reminders WHERE id = ? AND user_id = ?', [id, userId]);
    return { changes: result.affectedRows };
  },

  // Auto-generate reminders for a document (7 days before, 3 days before, on due date)
  async autoGenerateReminders(userId, documentId) {
    const pool = getPool();
    const [docs] = await pool.execute('SELECT due_date, document_number, total FROM documents WHERE id = ? AND user_id = ?', [documentId, userId]);
    if (!docs[0]) return;

    const doc = docs[0];
    const dueDate = new Date(doc.due_date);
    
    const reminders = [
      { days: 7, type: 'before_due', msg: `Pengingat: Pembayaran ${doc.document_number} sebesar Rp${Number(doc.total).toLocaleString('id-ID')} jatuh tempo dalam 7 hari.` },
      { days: 3, type: 'before_due', msg: `Peringatan: Pembayaran ${doc.document_number} sebesar Rp${Number(doc.total).toLocaleString('id-ID')} jatuh tempo dalam 3 hari!` },
      { days: 0, type: 'on_due', msg: `JATUH TEMPO HARI INI: ${doc.document_number} sebesar Rp${Number(doc.total).toLocaleString('id-ID')} harus dibayar hari ini.` },
    ];

    for (const r of reminders) {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - r.days);
      
      // Only create if reminder date is in the future
      if (reminderDate >= new Date(new Date().toISOString().split('T')[0])) {
        // Check duplicate
        const [existing] = await pool.execute(
          'SELECT id FROM payment_reminders WHERE user_id = ? AND document_id = ? AND days_offset = ? AND reminder_type = ?',
          [userId, documentId, r.days, r.type]
        );
        if (existing.length === 0) {
          await pool.execute(
            'INSERT INTO payment_reminders (user_id, document_id, reminder_date, reminder_type, days_offset, message) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, documentId, reminderDate.toISOString().split('T')[0], r.type, r.days, r.msg]
          );
        }
      }
    }
  },

  // Process pending reminders (called by scheduler)
  async processPendingReminders() {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT pr.*, d.status as doc_status
      FROM payment_reminders pr
      LEFT JOIN documents d ON pr.document_id = d.id
      WHERE pr.is_sent = 0 AND pr.reminder_date <= CURDATE()
        AND d.status IN ('sent', 'overdue')
    `);

    for (const reminder of rows) {
      await pool.execute(
        'UPDATE payment_reminders SET is_sent = 1, sent_at = NOW() WHERE id = ?',
        [reminder.id]
      );
    }
    return rows.length;
  }
};

module.exports = PaymentReminder;
