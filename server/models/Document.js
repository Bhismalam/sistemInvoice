const mongoose = require('mongoose');
require('./Contact');
require('./Product');

const documentItemSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit_price: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 }
});

const documentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  contact_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  transaction_type: { type: String, enum: ['sales', 'purchase'], required: true },
  document_type: { type: String, enum: ['order', 'invoice'], required: true },
  document_number: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  issue_date: { type: Date, required: true },
  due_date: { type: Date, required: true },
  subtotal: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  tax_percent: { type: Number, default: 11 },
  tax_amount: { type: Number, default: 0 },
  withholding_tax_percent: { type: Number, default: 0 },
  withholding_tax_amount: { type: Number, default: 0 },
  is_recurring: { type: Boolean, default: false },
  recurrence_interval: { type: String, enum: ['monthly', 'yearly', 'weekly'], default: null },
  next_recurrence_date: { type: Date, default: null },
  total: { type: Number, default: 0 },
  notes: { type: String, default: null },
  payment_link: { type: String, default: null },
  midtrans_token: { type: String, default: null },
  paid_at: { type: Date, default: null },
  cancelled_at: { type: Date, default: null },
  items: [documentItemSchema] // Embedded subdocuments
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

documentSchema.virtual('id').get(function() { return this._id.toHexString(); });
documentItemSchema.virtual('id').get(function() { return this._id.toHexString(); });

documentSchema.set('toJSON', { virtuals: true });
documentSchema.set('toObject', { virtuals: true });
documentItemSchema.set('toJSON', { virtuals: true });
documentItemSchema.set('toObject', { virtuals: true });

const DocumentModelDB = mongoose.model('Document', documentSchema);

async function syncStock(oldDoc, newDoc) {
  const { Product } = require('./Product');
  const stockChanges = {}; // productId -> net change

  const getProdId = (item) => {
    if (!item || !item.product_id) return null;
    return item.product_id._id ? item.product_id._id.toString() : item.product_id.toString();
  };

  // 1. Reverse the stock impact of the old document status/items
  if (oldDoc && oldDoc.document_type === 'invoice' && oldDoc.status !== 'cancelled' && oldDoc.items) {
    const factor = oldDoc.transaction_type === 'sales' ? -1 : 1;
    for (const item of oldDoc.items) {
      const pId = getProdId(item);
      if (pId) {
        stockChanges[pId] = (stockChanges[pId] || 0) - (factor * item.quantity);
      }
    }
  }

  // 2. Add the stock impact of the new document status/items
  if (newDoc && newDoc.document_type === 'invoice' && newDoc.status !== 'cancelled' && newDoc.items) {
    const factor = newDoc.transaction_type === 'sales' ? -1 : 1;
    for (const item of newDoc.items) {
      const pId = getProdId(item);
      if (pId) {
        stockChanges[pId] = (stockChanges[pId] || 0) + (factor * item.quantity);
      }
    }
  }

  // 3. Update the database
  for (const [prodId, change] of Object.entries(stockChanges)) {
    if (change !== 0) {
      await Product.findByIdAndUpdate(prodId, { $inc: { stock: change } });
    }
  }

  // 4. Ensure stock never falls below zero
  await Product.updateMany({ stock: { $lt: 0 } }, { stock: 0 });
}

function calculateTotals(data) {
  let subtotal = 0;
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      item.total = item.quantity * item.unit_price;
      subtotal += item.total;
    });
    data.subtotal = subtotal;
  } else {
    subtotal = data.subtotal || 0;
  }
  
  const discount = data.discount_amount || (subtotal * (data.discount_percent || 0) / 100);
  data.discount_amount = discount;
  const taxable = subtotal - discount;
  
  const tax = data.tax_amount || (taxable * (data.tax_percent || 0) / 100);
  data.tax_amount = tax;
  
  const withholding = data.withholding_tax_amount || (taxable * (data.withholding_tax_percent || 0) / 100);
  data.withholding_tax_amount = withholding;
  
  data.total = taxable + tax - withholding;
}

const Document = {
  async create(data) {
    calculateTotals(data);
    const doc = new DocumentModelDB(data);
    await doc.save();

    // Adjust stock
    await syncStock(null, doc);

    return this.findById(doc._id, data.user_id, data.company_id);
  },

  async findById(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const doc = await DocumentModelDB.findOne(query)
      .populate('contact_id')
      .populate('items.product_id', 'name unit');
    
    if (!doc) return null;
    const result = doc.toObject();
    
    // Flatten contact/product details to match old SQL response
    result.contact_name = result.contact_id ? result.contact_id.name : null;
    result.contact_email = result.contact_id ? result.contact_id.email : null;
    result.contact_phone = result.contact_id ? result.contact_id.phone : null;
    result.contact_address = result.contact_id ? result.contact_id.address : null;
    result.contact_id = result.contact_id ? result.contact_id._id.toString() : null;

    result.items = result.items.map(item => ({
      ...item,
      product_name: item.product_id ? item.product_id.name : null,
      product_unit: item.product_id ? item.product_id.unit : null,
      product_id: item.product_id ? item.product_id._id.toString() : null
    }));

    return result;
  },

  async findByPaymentLink(paymentLink) {
    const doc = await DocumentModelDB.findOne({ payment_link: paymentLink })
      .populate('contact_id')
      .populate('user_id', 'business_name business_logo business_address phone')
      .populate('company_id')
      .populate('items.product_id', 'name unit');

    if (!doc) return null;
    const result = doc.toObject();
    
    result.contact_name = result.contact_id ? result.contact_id.name : null;
    result.contact_email = result.contact_id ? result.contact_id.email : null;
    result.contact_id = result.contact_id ? result.contact_id._id.toString() : null;

    result.business_name = result.user_id ? result.user_id.business_name : null;
    result.business_logo = result.user_id ? result.user_id.business_logo : null;
    result.business_address = result.user_id ? result.user_id.business_address : null;
    result.business_phone = result.user_id ? result.user_id.phone : null;
    result.user_id = result.user_id ? result.user_id._id.toString() : null;

    result.company_name = doc.company_id?.name || null;
    result.company_address = doc.company_id?.address || null;
    result.company_phone = doc.company_id?.phone || null;
    result.company_email = doc.company_id?.email || null;
    result.company_npwp = doc.company_id?.npwp || null;
    result.company_bank_name = doc.company_id?.bank_name || null;
    result.company_bank_account_number = doc.company_id?.bank_account_number || null;
    result.company_bank_account_name = doc.company_id?.bank_account_name || null;
    result.company_logo = doc.company_id?.logo || null;

    result.items = result.items.map(item => ({
      ...item,
      product_name: item.product_id ? item.product_id.name : null,
      product_unit: item.product_id ? item.product_id.unit : null,
      product_id: item.product_id ? item.product_id._id.toString() : null
    }));

    return result;
  },

  async findAll(userId, { transaction_type, document_type, status, search, sort, order, page, limit } = {}, companyId = null) {
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    if (transaction_type) query.transaction_type = transaction_type;
    if (document_type) query.document_type = document_type;
    if (status && status !== 'all') query.status = status;

    // Search is tricky because we need to search populated fields (contact.name). 
    // In Mongoose we usually find the contact first, then document, or use aggregate. 
    // For simplicity, we'll search document_number and if search is provided, we fetch matching contacts first.
    if (search) {
      const { Contact } = require('./Contact');
      const contactQuery = companyId ? { company_id: companyId, name: new RegExp(search, 'i') } : { user_id: userId, name: new RegExp(search, 'i') };
      const contacts = await Contact.find(contactQuery).select('_id');
      const contactIds = contacts.map(c => c._id);
      
      query.$or = [
        { document_number: new RegExp(search, 'i') },
        { contact_id: { $in: contactIds } }
      ];
    }

    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 1 : -1;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skipNum = (pageNum - 1) * limitNum;

    const results = await DocumentModelDB.find(query)
      .populate('contact_id', 'name')
      .sort({ [sortField]: sortOrder })
      .skip(skipNum)
      .limit(limitNum);

    const total = await DocumentModelDB.countDocuments(query);

    const data = results.map(doc => {
      const d = doc.toObject();
      return {
        ...d,
        contact_name: d.contact_id ? d.contact_id.name : null,
        contact_id: d.contact_id ? d.contact_id._id.toString() : null
      };
    });

    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async update(id, userId, data, companyId = null) {
    calculateTotals(data);
    if (data.status === 'paid') data.paid_at = new Date();
    
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const oldDoc = await DocumentModelDB.findOne(query);
    if (!oldDoc) return null;

    const newDoc = await DocumentModelDB.findOneAndUpdate(query, data, { new: true });
    
    await syncStock(oldDoc, newDoc);

    return this.findById(id, userId, companyId);
  },

  async updateStatus(id, userId, status, companyId = null) {
    const update = { status };
    if (status === 'paid') update.paid_at = new Date();
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const oldDoc = await DocumentModelDB.findOne(query);
    if (!oldDoc) return null;

    const newDoc = await DocumentModelDB.findOneAndUpdate(query, update, { new: true });
    
    await syncStock(oldDoc, newDoc);

    return this.findById(id, userId, companyId);
  },

  async delete(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const oldDoc = await DocumentModelDB.findOne(query);
    if (!oldDoc) return { changes: 0 };

    const res = await DocumentModelDB.deleteOne(query);
    
    await syncStock(oldDoc, null);

    return { changes: res.deletedCount };
  },

  async getStatusCounts(userId, transaction_type, document_type, companyId = null) {
    let match = companyId
      ? { company_id: new mongoose.Types.ObjectId(companyId) }
      : { user_id: new mongoose.Types.ObjectId(userId) };
    if (transaction_type) match.transaction_type = transaction_type;
    if (document_type) match.document_type = document_type;

    const result = await DocumentModelDB.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          draft: { $sum: { $cond: [ { $eq: ["$status", "draft"] }, 1, 0 ] } },
          sent: { $sum: { $cond: [ { $eq: ["$status", "sent"] }, 1, 0 ] } },
          paid: { $sum: { $cond: [ { $eq: ["$status", "paid"] }, 1, 0 ] } },
          overdue: { $sum: { $cond: [ { $eq: ["$status", "overdue"] }, 1, 0 ] } },
          cancelled: { $sum: { $cond: [ { $eq: ["$status", "cancelled"] }, 1, 0 ] } }
      }}
    ]);

    if (result.length === 0) return { total: 0, draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0 };
    const stats = result[0];
    delete stats._id;
    return stats;
  },

  async search(userId, keyword, companyId = null) {
    const { Contact } = require('./Contact');
    const contactQuery = companyId ? { company_id: companyId, name: new RegExp(keyword, 'i') } : { user_id: userId, name: new RegExp(keyword, 'i') };
    const contacts = await Contact.find(contactQuery).select('_id');
    const contactIds = contacts.map(c => c._id);
    
    const query = companyId ? {
      company_id: companyId,
      $or: [
        { document_number: new RegExp(keyword, 'i') },
        { contact_id: { $in: contactIds } }
      ]
    } : {
      user_id: userId,
      $or: [
        { document_number: new RegExp(keyword, 'i') },
        { contact_id: { $in: contactIds } }
      ]
    };

    const results = await DocumentModelDB.find(query)
      .populate('contact_id', 'name')
      .sort({ created_at: -1 })
      .limit(10);

    return results.map(doc => {
      const d = doc.toObject();
      return {
        id: d.id,
        document_number: d.document_number,
        transaction_type: d.transaction_type,
        document_type: d.document_type,
        status: d.status,
        total: d.total,
        issue_date: d.issue_date,
        contact_name: d.contact_id ? d.contact_id.name : null
      };
    });
  },

  async cancelDocument(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const oldDoc = await DocumentModelDB.findOne(query);
    if (!oldDoc) return null;

    const newDoc = await DocumentModelDB.findOneAndUpdate(
      query,
      { status: 'cancelled', cancelled_at: new Date() },
      { new: true }
    );

    await syncStock(oldDoc, newDoc);

    return this.findById(id, userId, companyId);
  },

  async updatePaymentStatus(id, userId, paymentStatus, companyId = null) {
    const update = { status: paymentStatus };
    if (paymentStatus === 'paid') {
      update.paid_at = new Date();
      update.cancelled_at = null;
    } else if (paymentStatus === 'cancelled') {
      update.cancelled_at = new Date();
    } else {
      update.cancelled_at = null;
    }
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const oldDoc = await DocumentModelDB.findOne(query);
    if (!oldDoc) return null;

    const newDoc = await DocumentModelDB.findOneAndUpdate(query, update, { new: true });

    await syncStock(oldDoc, newDoc);

    return this.findById(id, userId, companyId);
  },

  async cleanupCancelledDocuments() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const docs = await DocumentModelDB.find({
      status: 'cancelled',
      cancelled_at: { $lte: yesterday }
    });
    const ids = docs.map(d => d._id);
    const res = await DocumentModelDB.deleteMany({ _id: { $in: ids } });
    return res.deletedCount;
  },

  async markOverdueDocuments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const res = await DocumentModelDB.updateMany(
      { status: 'sent', document_type: 'invoice', due_date: { $lt: today } },
      { status: 'overdue' }
    );
    return res.modifiedCount;
  },

  async getPaymentTracker(id, userId, companyId = null) {
    const doc = await this.findById(id, userId, companyId);
    if (!doc) return null;

    const { Receipt } = require('./Receipt');
    const receipts = await Receipt.find({ document_id: id }).sort({ created_at: -1 });

    const { PaymentReminder } = require('./PaymentReminder');
    const reminderQuery = companyId ? { document_id: id, company_id: companyId } : { document_id: id, user_id: userId };
    const reminders = await PaymentReminder.find(reminderQuery).sort({ reminder_date: 1 });

    const totalPaid = receipts.reduce((sum, r) => sum + r.amount, 0);
    const remaining = doc.total - totalPaid;
    const dueDate = new Date(doc.due_date);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

    return {
      document: doc,
      receipts: receipts.map(r => r.toObject()),
      reminders: reminders.map(r => r.toObject()),
      totalPaid,
      remaining,
      daysUntilDue,
      isOverdue: daysUntilDue < 0 && doc.status !== 'paid',
      isPaid: doc.status === 'paid',
      percentPaid: doc.total > 0 ? Math.min(100, Math.round((totalPaid / doc.total) * 100)) : 0
    };
  }
};

module.exports = Document;
