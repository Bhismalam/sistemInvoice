const mongoose = require('mongoose');
require('./Document'); // Ensure schema is registered

const Report = {
  async getDashboardStats(userId) {
    const Document = mongoose.model('Document');
    
    const docs = await Document.find({
      user_id: userId,
      document_type: 'invoice',
      transaction_type: { $in: ['sales', 'purchase'] }
    });

    const stats = {
      total_revenue: 0,
      total_expense: 0,
      outstanding_sales: 0,
      outstanding_purchase: 0,
      overdue_sales: 0,
      overdue_purchase: 0,
      total_invoices_sales: 0,
      total_invoices_purchase: 0,
      total_invoices: docs.length
    };

    docs.forEach(d => {
      const isSales = d.transaction_type === 'sales';
      const isPurchase = d.transaction_type === 'purchase';
      const val = d.total || 0;

      if (isSales) stats.total_invoices_sales++;
      if (isPurchase) stats.total_invoices_purchase++;

      if (d.status === 'paid') {
        if (isSales) stats.total_revenue += val;
        if (isPurchase) stats.total_expense += val;
      } else if (d.status === 'sent' || d.status === 'overdue') {
        if (isSales) stats.outstanding_sales += val;
        if (isPurchase) stats.outstanding_purchase += val;

        if (d.status === 'overdue') {
          if (isSales) stats.overdue_sales += val;
          if (isPurchase) stats.overdue_purchase += val;
        }
      }
    });

    stats.net_profit = stats.total_revenue - stats.total_expense;
    stats.outstanding = stats.outstanding_sales + stats.outstanding_purchase;
    stats.overdue = stats.overdue_sales + stats.overdue_purchase;

    return stats;
  },

  async getRevenueChart(userId, months = 6) {
    const Document = mongoose.model('Document');
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - months);
    
    const docs = await Document.find({
      user_id: userId,
      transaction_type: 'sales',
      document_type: 'invoice',
      status: 'paid',
      paid_at: { $gte: pastDate }
    });

    const grouped = {};
    docs.forEach(d => {
      if (!d.paid_at) return;
      const month = d.paid_at.toISOString().slice(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = 0;
      grouped[month] += d.total;
    });

    return Object.keys(grouped).sort().map(month => ({
      month,
      revenue: grouped[month]
    }));
  },

  async getAgingReport(userId) {
    const Document = mongoose.model('Document');
    const docs = await Document.find({
      user_id: userId,
      transaction_type: 'sales',
      document_type: 'invoice',
      status: { $in: ['sent', 'overdue'] }
    });

    const ranges = [
      { label: '0-30 hari', min: 0, max: 30, count: 0, amount: 0 },
      { label: '31-60 hari', min: 31, max: 60, count: 0, amount: 0 },
      { label: '61-90 hari', min: 61, max: 90, count: 0, amount: 0 },
      { label: '90+ hari', min: 91, max: 9999, count: 0, amount: 0 }
    ];

    const now = new Date();
    docs.forEach(d => {
      const due = new Date(d.due_date);
      const diffTime = Math.abs(now - due);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      for (let r of ranges) {
        if (diffDays >= r.min && diffDays <= r.max) {
          r.count++;
          r.amount += d.total;
          break;
        }
      }
    });

    return ranges;
  },

  async getProfitLoss(userId, startDate, endDate) {
    const Document = mongoose.model('Document');
    
    const docs = await Document.find({
      user_id: userId,
      document_type: 'invoice',
      status: 'paid',
      paid_at: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59Z') }
    });

    let income = 0;
    let expenses = 0;

    docs.forEach(d => {
      if (d.transaction_type === 'sales') income += d.total;
      if (d.transaction_type === 'purchase') expenses += d.total;
    });

    return {
      income,
      expenses,
      profit: income - expenses
    };
  },

  async getCashflow(userId, months = 6) {
    const Document = mongoose.model('Document');
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - months);
    
    const docs = await Document.find({
      user_id: userId,
      document_type: 'invoice',
      status: 'paid',
      paid_at: { $gte: pastDate }
    });

    const cashIn = {};
    const cashOut = {};

    docs.forEach(d => {
      if (!d.paid_at) return;
      const month = d.paid_at.toISOString().slice(0, 7);
      
      if (d.transaction_type === 'sales') {
        if (!cashIn[month]) cashIn[month] = 0;
        cashIn[month] += d.total;
      } else if (d.transaction_type === 'purchase') {
        if (!cashOut[month]) cashOut[month] = 0;
        cashOut[month] += d.total;
      }
    });

    const formatArray = (obj) => Object.keys(obj).sort().map(month => ({ month, amount: obj[month] }));

    return {
      cashIn: formatArray(cashIn),
      cashOut: formatArray(cashOut)
    };
  },

  async getRecentInvoices(userId, limit = 5) {
    const Document = mongoose.model('Document');
    const docs = await Document.find({
      user_id: userId,
      transaction_type: 'sales',
      document_type: 'invoice'
    }).populate('contact_id').sort({ created_at: -1 }).limit(limit);

    return docs.map(doc => {
      const d = doc.toObject();
      return {
        ...d,
        contact_name: d.contact_id ? d.contact_id.name : null,
        contact_id: d.contact_id ? d.contact_id._id.toString() : null,
        id: d._id.toString()
      };
    });
  }
};

module.exports = Report;
