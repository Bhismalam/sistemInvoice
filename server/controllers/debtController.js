const PaymentReminder = require('../models/PaymentReminder');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');

const debtController = {
  // Get debt summary (hutang & piutang)
  async getSummary(req, res, next) {
    try {
      const debts = await PaymentReminder.getDebtSummary(req.user.id);
      res.json({ success: true, data: debts });
    } catch (error) { next(error); }
  },

  // Get upcoming payment reminders
  async getReminders(req, res, next) {
    try {
      const { transaction_type, status, page, limit } = req.query;
      const result = await PaymentReminder.findAll(req.user.id, { transaction_type, status, page, limit });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  },

  // Get upcoming reminders (widget)
  async getUpcomingReminders(req, res, next) {
    try {
      const days = parseInt(req.query.days) || 7;
      const reminders = await PaymentReminder.getUpcoming(req.user.id, days);
      res.json({ success: true, data: reminders });
    } catch (error) { next(error); }
  },

  // Create custom reminder
  async createReminder(req, res, next) {
    try {
      const { document_id, reminder_date, reminder_type, days_offset, message } = req.body;
      
      // Validate document exists
      const doc = await Document.findById(document_id, req.user.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      
      const reminder = await PaymentReminder.create({
        user_id: req.user.id,
        document_id,
        reminder_date,
        reminder_type: reminder_type || 'custom',
        days_offset: days_offset || 0,
        message: message || `Pengingat pembayaran untuk ${doc.document_number}`
      });

      await ActivityLog.log(req.user.id, document_id, `Created payment reminder for ${reminder_date}`);
      res.status(201).json({ success: true, message: 'Pengingat berhasil dibuat!', data: reminder });
    } catch (error) { next(error); }
  },

  // Mark reminder as read
  async markRead(req, res, next) {
    try {
      await PaymentReminder.markRead(req.params.id, req.user.id);
      res.json({ success: true, message: 'Pengingat ditandai telah dibaca.' });
    } catch (error) { next(error); }
  },

  // Delete reminder
  async deleteReminder(req, res, next) {
    try {
      const result = await PaymentReminder.delete(req.params.id, req.user.id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Pengingat tidak ditemukan.' });
      res.json({ success: true, message: 'Pengingat berhasil dihapus.' });
    } catch (error) { next(error); }
  },

  // Get payment tracker for a specific document
  async getTracker(req, res, next) {
    try {
      const tracker = await Document.getPaymentTracker(req.params.documentId, req.user.id);
      if (!tracker) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      res.json({ success: true, data: tracker });
    } catch (error) { next(error); }
  }
};

module.exports = debtController;
