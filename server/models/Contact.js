const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  type: { type: String, enum: ['customer', 'supplier'], required: true },
  name: { type: String, required: true },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  whatsapp_number: { type: String, default: null },
  address: { type: String, default: null },
  notes: { type: String, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

contactSchema.virtual('id').get(function() { return this._id.toHexString(); });
contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

const Contact = mongoose.model('Contact', contactSchema);

const ContactModel = {
  async create(data) {
    const contact = new Contact(data);
    await contact.save();
    return contact;
  },
  async findAll(userId, filters = {}, companyId = null) {
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.$or = [
        { name: new RegExp(filters.search, 'i') },
        { email: new RegExp(filters.search, 'i') },
        { phone: new RegExp(filters.search, 'i') }
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

    const data = await Contact.find(query).sort(sortObj).skip(skip).limit(limit);
    const total = await Contact.countDocuments(query);
    
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },
  async findById(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    return Contact.findOne(query);
  },
  async update(id, userId, data, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    return Contact.findOneAndUpdate(query, data, { new: true });
  },
  async delete(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const res = await Contact.deleteOne(query);
    return { changes: res.deletedCount };
  }
};

module.exports = { Contact, ...ContactModel };
