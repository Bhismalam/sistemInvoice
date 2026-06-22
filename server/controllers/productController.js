const Product = require('../models/Product');

const productController = {
  async list(req, res, next) {
    try {
      const result = await Product.findAll(req.user.id, req.query, req.user.company_id);
      res.json({ success: true, data: result.data, meta: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } });
    } catch (error) { next(error); }
  },
  async get(req, res, next) {
    try {
      const product = await Product.findById(req.params.id, req.user.id, req.user.company_id);
      if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  },
  async create(req, res, next) {
    try {
      const product = await Product.create({ ...req.body, user_id: req.user.id, company_id: req.user.company_id || null });
      res.status(201).json({ success: true, message: 'Produk berhasil ditambahkan!', data: product });
    } catch (error) { next(error); }
  },
  async update(req, res, next) {
    try {
      const product = await Product.update(req.params.id, req.user.id, req.body, req.user.company_id);
      if (!product) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      res.json({ success: true, message: 'Produk berhasil diupdate!', data: product });
    } catch (error) { next(error); }
  },
  async delete(req, res, next) {
    try {
      const result = await Product.delete(req.params.id, req.user.id, req.user.company_id);
      if (result.changes === 0) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
      res.json({ success: true, message: 'Produk berhasil dihapus.' });
    } catch (error) { next(error); }
  }
};

module.exports = productController;
