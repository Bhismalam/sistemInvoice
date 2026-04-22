const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const { v4: uuidv4 } = require('uuid');

const documentController = {
  async create(req, res, next) {
    try {
      const data = { ...req.body, user_id: req.user.id };
      
      // Auto generate document number if not provided
      if (!data.document_number) {
        const prefix = data.document_type === 'order' 
          ? (data.transaction_type === 'sales' ? 'SO-' : 'PO-')
          : (data.transaction_type === 'sales' ? 'INV-' : 'PINV-');
        const timestamp = new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0');
        data.document_number = `${prefix}${timestamp}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      if (data.document_type === 'invoice' && !data.payment_link && data.transaction_type === 'sales') {
        data.payment_link = uuidv4();
      }

      const doc = await Document.create(data);
      await ActivityLog.log(req.user.id, doc.id, `Created ${data.transaction_type} ${data.document_type}`);
      
      res.status(201).json({ success: true, message: 'Dokumen berhasil dibuat!', data: doc });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'Nomor dokumen sudah digunakan.' });
      }
      next(error);
    }
  },

  async getAll(req, res, next) {
    try {
      const { transaction_type, document_type, status, search, sort, order, page, limit } = req.query;
      const result = await Document.findAll(req.user.id, { transaction_type, document_type, status, search, sort, order, page, limit });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  },

  async getById(req, res, next) {
    try {
      const doc = await Document.findById(req.params.id, req.user.id);
      if (!doc) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      res.json({ success: true, data: doc });
    } catch (error) { next(error); }
  },

  async getPublic(req, res, next) {
    try {
      const doc = await Document.findByPaymentLink(req.params.paymentLink);
      if (!doc) return res.status(404).json({ success: false, message: 'Invoice tidak valid atau tidak ditemukan.' });
      
      const publicData = {
        id: doc.id,
        document_number: doc.document_number,
        status: doc.status,
        issue_date: doc.issue_date,
        due_date: doc.due_date,
        subtotal: doc.subtotal,
        discount_percent: doc.discount_percent,
        discount_amount: doc.discount_amount,
        tax_percent: doc.tax_percent,
        tax_amount: doc.tax_amount,
        total: doc.total,
        notes: doc.notes,
        contact_name: doc.contact_name,
        contact_email: doc.contact_email,
        business_name: doc.business_name,
        business_logo: doc.business_logo,
        business_address: doc.business_address,
        business_phone: doc.business_phone,
        items: doc.items
      };
      res.json({ success: true, data: publicData });
    } catch (error) { next(error); }
  },

  async update(req, res, next) {
    try {
      const existing = await Document.findById(req.params.id, req.user.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      
      if (existing.status === 'paid' && req.body.status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Dokumen yang sudah lunas tidak dapat diubah statusnya.' });
      }

      const updated = await Document.update(req.params.id, req.user.id, req.body);
      await ActivityLog.log(req.user.id, updated.id, 'Updated document');
      res.json({ success: true, message: 'Dokumen berhasil diupdate.', data: updated });
    } catch (error) { next(error); }
  },

  async updateStatus(req, res, next) {
    try {
      const { status } = req.body;
      const existing = await Document.findById(req.params.id, req.user.id);
      if (!existing) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      
      const updated = await Document.updateStatus(req.params.id, req.user.id, status);
      await ActivityLog.log(req.user.id, updated.id, `Changed status to ${status}`);
      res.json({ success: true, message: `Status berhasil diubah menjadi ${status}`, data: updated });
    } catch (error) { next(error); }
  },

  async delete(req, res, next) {
    try {
      const result = await Document.delete(req.params.id, req.user.id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
    } catch (error) { next(error); }
  },

  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) return res.json({ success: true, data: [] });
      const results = await Document.search(req.user.id, q);
      res.json({ success: true, data: results });
    } catch (error) { next(error); }
  }
};

module.exports = documentController;
