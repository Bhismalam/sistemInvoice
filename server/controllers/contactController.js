const Contact = require('../models/Contact');

const contactController = {
  async list(req, res, next) {
    try {
      const result = await Contact.findAll(req.user.id, req.query, req.user.company_id);
      res.json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    } catch (error) { next(error); }
  },
  async get(req, res, next) {
    try {
      const contact = await Contact.findById(req.params.id, req.user.id, req.user.company_id);
      if (!contact) return res.status(404).json({ success: false, message: 'Kontak tidak ditemukan.' });
      res.json({ success: true, data: contact });
    } catch (error) { next(error); }
  },
  async create(req, res, next) {
    try {
      const contact = await Contact.create({ ...req.body, user_id: req.user.id, company_id: req.user.company_id || null });
      res.status(201).json({ success: true, message: 'Kontak berhasil ditambahkan!', data: contact });
    } catch (error) { next(error); }
  },
  async update(req, res, next) {
    try {
      const contact = await Contact.update(req.params.id, req.user.id, req.body, req.user.company_id);
      if (!contact) return res.status(404).json({ success: false, message: 'Kontak tidak ditemukan.' });
      res.json({ success: true, message: 'Kontak berhasil diupdate!', data: contact });
    } catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      const result = await Contact.delete(req.params.id, req.user.id, req.user.company_id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Kontak tidak ditemukan.' });
      res.json({ success: true, message: 'Kontak berhasil dihapus.' });
    } catch (error) { next(error); }
  }
};

module.exports = contactController;
