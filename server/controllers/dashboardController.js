const Report = require('../models/Report');
const { User } = require('../models/User');

const dashboardController = {
  getStats(req, res, next) {
    try {
      const stats = Report.getDashboardStats(req.user.id);
      const counts = require('../models/Document').getStatusCounts(req.user.id, 'sales', 'invoice');
      res.json({ success: true, data: { stats, counts } });
    } catch (error) { next(error); }
  },

  getChart(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = Report.getRevenueChart(req.user.id, months);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  getRecent(req, res, next) {
    try {
      const data = Report.getRecentInvoices(req.user.id, 5);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
};

const reportController = {
  aging(req, res, next) {
    try {
      const data = Report.getAgingReport(req.user.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  profitLoss(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];
      const data = Report.getProfitLoss(req.user.id, startDate, endDate);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  cashflow(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = Report.getCashflow(req.user.id, months);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
};

const settingsController = {
  get(req, res, next) {
    try {
      const user = User.findById(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  },

  update(req, res, next) {
    try {
      const user = User.update(req.user.id, req.body);
      res.json({ success: true, message: 'Pengaturan berhasil disimpan!', data: user });
    } catch (error) { next(error); }
  }
};

module.exports = { dashboardController, reportController, settingsController };
