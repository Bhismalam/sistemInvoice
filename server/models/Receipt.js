const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  receipt_number: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, default: 0 },
  payment_method: { type: String, default: 'transfer' },
  payment_date: { type: Date, required: true },
  notes: { type: String, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

receiptSchema.virtual('id').get(function() { return this._id.toHexString(); });
receiptSchema.set('toJSON', { virtuals: true });
receiptSchema.set('toObject', { virtuals: true });

const Receipt = mongoose.model('Receipt', receiptSchema);

const ReceiptModel = {
  async create(data) {
    const receipt = new Receipt(data);
    await receipt.save();

    // Auto update document status if paid in full
    const mongoose = require('mongoose');
    const DocumentModel = mongoose.model('Document');
    const doc = await DocumentModel.findOne({ _id: data.document_id, user_id: data.user_id });
    if (doc) {
      const allReceipts = await Receipt.find({ document_id: doc._id });
      const totalPaid = allReceipts.reduce((sum, r) => sum + r.amount, 0);
      if (totalPaid >= doc.total && doc.status !== 'paid') {
        doc.status = 'paid';
        doc.paid_at = new Date();
        await doc.save();
      }
    }

    return receipt;
  },

  async findAll(userId, filters = {}) {
    let query = { user_id: userId };
    if (filters.document_id) query.document_id = filters.document_id;
    if (filters.search) {
      query.receipt_number = new RegExp(filters.search, 'i');
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

    let mongoQuery = Receipt.find(query).sort(sortObj).skip(skip).limit(limit).populate({
      path: 'document_id',
      populate: { path: 'contact_id', select: 'name email' }
    });

    const results = await mongoQuery;
    const total = await Receipt.countDocuments(query);
    
    // Format to match old SQL response
    const data = results.map(r => {
      const rec = r.toObject();
      return {
        ...rec,
        document_number: rec.document_id ? rec.document_id.document_number : null,
        transaction_type: rec.document_id ? rec.document_id.transaction_type : null,
        document_type: rec.document_id ? rec.document_id.document_type : null,
        document_total: rec.document_id ? rec.document_id.total : 0,
        contact_name: rec.document_id && rec.document_id.contact_id ? rec.document_id.contact_id.name : null,
        document_id: rec.document_id ? rec.document_id._id.toString() : null
      };
    });
    
    if (filters.transaction_type) {
      // Manual filter since transaction_type is on document
      const filteredData = data.filter(r => r.transaction_type === filters.transaction_type);
      return { data: filteredData, total: filteredData.length, page, totalPages: Math.ceil(filteredData.length / limit) };
    }

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  async findById(id, userId) {
    const r = await Receipt.findOne({ _id: id, user_id: userId }).populate({
      path: 'document_id',
      populate: { path: 'contact_id', select: 'name email' }
    });
    if (!r) return null;
    const rec = r.toObject();
    return {
      ...rec,
      document_number: rec.document_id ? rec.document_id.document_number : null,
      transaction_type: rec.document_id ? rec.document_id.transaction_type : null,
      document_type: rec.document_id ? rec.document_id.document_type : null,
      document_total: rec.document_id ? rec.document_id.total : 0,
      contact_name: rec.document_id && rec.document_id.contact_id ? rec.document_id.contact_id.name : null,
      document_id: rec.document_id ? rec.document_id._id.toString() : null
    };
  },

  async delete(id, userId) {
    const res = await Receipt.deleteOne({ _id: id, user_id: userId });
    return { changes: res.deletedCount };
  }
};

module.exports = { Receipt, ...ReceiptModel };
