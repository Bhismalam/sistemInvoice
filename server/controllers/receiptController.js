const Receipt = require('../models/Receipt');
const ActivityLog = require('../models/ActivityLog');

const receiptController = {
  async create(req, res, next) {
    try {
      const data = { ...req.body, user_id: req.user.id, company_id: req.user.company_id || null };
      
      if (!data.receipt_number) {
        const timestamp = new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0');
        data.receipt_number = `RCP-${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const receipt = await Receipt.create(data);
      await ActivityLog.log(req.user.id, data.document_id, `Created receipt ${receipt.receipt_number} for amount ${receipt.amount}`);
      
      res.status(201).json({ success: true, message: 'Kuitansi berhasil dibuat!', data: receipt });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Nomor kuitansi sudah digunakan.' });
      }
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const { transaction_type, document_id, search, sort, order, page, limit } = req.query;
      const result = await Receipt.findAll(req.user.id, { transaction_type, document_id, search, sort, order, page, limit }, req.user.company_id);
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  },

  async getById(req, res, next) {
    try {
      const receipt = await Receipt.findById(req.params.id, req.user.id, req.user.company_id);
      if (!receipt) return res.status(404).json({ success: false, message: 'Kuitansi tidak ditemukan.' });
      res.json({ success: true, data: receipt });
    } catch (error) { next(error); }
  },

  async delete(req, res, next) {
    try {
      const result = await Receipt.delete(req.params.id, req.user.id, req.user.company_id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Kuitansi tidak ditemukan.' });
      res.json({ success: true, message: 'Kuitansi berhasil dihapus.' });
    } catch (error) { next(error); }
  }
};

module.exports = receiptController;
