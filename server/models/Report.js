const { getPool } = require('../config/database');

const Report = {
  async getDashboardStats(userId) {
    const pool = getPool();
    const [statsRows] = await pool.execute(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) as outstanding,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN total ELSE 0 END), 0) as overdue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as paid,
        COUNT(*) as total_invoices
      FROM documents 
      WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice'
    `, [userId]);
    const stats = statsRows[0];

    const [expRows] = await pool.execute(`
      SELECT COALESCE(SUM(total), 0) as total 
      FROM documents 
      WHERE user_id = ? AND transaction_type = 'purchase' AND document_type = 'invoice' AND status = 'paid'
    `, [userId]);

    stats.total_expenses = expRows[0].total;
    stats.net_profit = stats.total_revenue - expRows[0].total;
    return stats;
  },

  async getRevenueChart(userId, months = 6) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT 
        DATE_FORMAT(paid_at, '%Y-%m') as month,
        COALESCE(SUM(total), 0) as revenue
      FROM documents
      WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice' AND status = 'paid' AND paid_at IS NOT NULL
        AND paid_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
      ORDER BY month ASC
    `, [userId, months]);
    return rows;
  },

  async getAgingReport(userId) {
    const pool = getPool();
    const ranges = [
      { label: '0-30 hari', min: 0, max: 30 },
      { label: '31-60 hari', min: 31, max: 60 },
      { label: '61-90 hari', min: 61, max: 90 },
      { label: '90+ hari', min: 91, max: 9999 }
    ];

    const results = [];
    for (const range of ranges) {
      const [rows] = await pool.execute(`
        SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as amount
        FROM documents
        WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice' AND status IN ('sent', 'overdue')
          AND DATEDIFF(NOW(), due_date) BETWEEN ? AND ?
      `, [userId, range.min, range.max]);
      results.push({ label: range.label, ...rows[0] });
    }
    return results;
  },

  async getProfitLoss(userId, startDate, endDate) {
    const pool = getPool();
    const [incomeRows] = await pool.execute(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM documents
      WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice' AND status = 'paid' AND paid_at BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    const [expenseRows] = await pool.execute(`
      SELECT COALESCE(SUM(total), 0) as total
      FROM documents
      WHERE user_id = ? AND transaction_type = 'purchase' AND document_type = 'invoice' AND status = 'paid' AND paid_at BETWEEN ? AND ?
    `, [userId, startDate, endDate]);

    return {
      income: incomeRows[0].total,
      expenses: expenseRows[0].total,
      profit: incomeRows[0].total - expenseRows[0].total
    };
  },

  async getCashflow(userId, months = 6) {
    const pool = getPool();
    const [cashIn] = await pool.execute(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m') as month, COALESCE(SUM(total), 0) as amount
      FROM documents 
      WHERE user_id = ? AND transaction_type = 'sales' AND document_type = 'invoice' AND status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY month ORDER BY month
    `, [userId, months]);

    const [cashOut] = await pool.execute(`
      SELECT DATE_FORMAT(paid_at, '%Y-%m') as month, COALESCE(SUM(total), 0) as amount
      FROM documents 
      WHERE user_id = ? AND transaction_type = 'purchase' AND document_type = 'invoice' AND status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY month ORDER BY month
    `, [userId, months]);

    return { cashIn, cashOut };
  },

  async getRecentInvoices(userId, limit = 5) {
    const pool = getPool();
    const [rows] = await pool.execute(`
      SELECT d.*, c.name as contact_name
      FROM documents d LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.user_id = ? AND d.transaction_type = 'sales' AND d.document_type = 'invoice'
      ORDER BY d.created_at DESC LIMIT ?
    `, [userId, limit]);
    return rows;
  }
};

module.exports = Report;
