const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  name: { type: String, required: true },
  description: { type: String, default: null },
  unit: { type: String, default: 'pcs' },
  price: { type: Number, required: true, default: 0 },
  stock: { type: Number, default: 0 },
  category: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

productSchema.virtual('id').get(function() { return this._id.toHexString(); });
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

const ProductModel = {
  async create(data) {
    const prod = new Product(data);
    await prod.save();
    return prod;
  },
  async findAll(userId, filters = {}) {
    let query = { user_id: userId };
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { description: new RegExp(filters.search, 'i') },
        { category: new RegExp(filters.search, 'i') }
      ];
    }
    
    let sortObj = {};
    if (filters.sort) {
      sortObj[filters.sort] = filters.order === 'desc' ? -1 : 1;
    } else {
      sortObj['created_at'] = -1;
    }

    const limit = filters.limit ? parseInt(filters.limit) : 20;
    const page = filters.page ? parseInt(filters.page) : 1;
    const skip = (page - 1) * limit;

    const data = await Product.find(query).sort(sortObj).skip(skip).limit(limit);
    const total = await Product.countDocuments(query);
    
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },
  async findById(id, userId) {
    return Product.findOne({ _id: id, user_id: userId });
  },
  async update(id, userId, data) {
    return Product.findOneAndUpdate({ _id: id, user_id: userId }, data, { new: true });
  },
  async delete(id, userId) {
    const res = await Product.deleteOne({ _id: id, user_id: userId });
    return { changes: res.deletedCount };
  }
};

module.exports = { Product, ...ProductModel };
