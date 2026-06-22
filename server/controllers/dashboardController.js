const Report = require('../models/Report');
const { User } = require('../models/User');

const dashboardController = {
  async getStats(req, res, next) {
    try {
      const stats = await Report.getDashboardStats(req.user.id, req.user.company_id);
      const counts = await require('../models/Document').getStatusCounts(req.user.id, null, 'invoice', req.user.company_id);
      res.json({ success: true, data: { stats, counts } });
    } catch (error) { next(error); }
  },

  async getChart(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = await Report.getRevenueChart(req.user.id, months, req.user.company_id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  async getRecent(req, res, next) {
    try {
      const data = await Report.getRecentInvoices(req.user.id, 5, req.user.company_id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
};

const reportController = {
  async aging(req, res, next) {
    try {
      const data = await Report.getAgingReport(req.user.id, req.user.company_id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  async profitLoss(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const startDate = start_date || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
      const endDate = end_date || new Date().toISOString().split('T')[0];
      const data = await Report.getProfitLoss(req.user.id, startDate, endDate, req.user.company_id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  async cashflow(req, res, next) {
    try {
      const months = parseInt(req.query.months) || 6;
      const data = await Report.getCashflow(req.user.id, months, req.user.company_id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
};

const settingsController = {
  async get(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  },

  async update(req, res, next) {
    try {
      const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
      res.json({ success: true, message: 'Pengaturan berhasil disimpan!', data: user });
    } catch (error) { next(error); }
  }
};

module.exports = { dashboardController, reportController, settingsController };
