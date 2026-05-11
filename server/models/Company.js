const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logo: { type: String, default: null },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  npwp: { type: String, default: '' },
  bank_name: { type: String, default: '' },
  bank_account_number: { type: String, default: '' },
  bank_account_name: { type: String, default: '' },
  invoice_prefix: { type: String, default: 'INV' },
  invoice_counter: { type: Number, default: 0 },
  default_tax_percent: { type: Number, default: 11 }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

companySchema.virtual('id').get(function() { return this._id.toHexString(); });
companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

const Company = mongoose.model('Company', companySchema);

const CompanyModel = {
  async create(data) {
    const company = new Company(data);
    await company.save();
    return company;
  },

  async findById(id) {
    return Company.findById(id);
  },

  async update(id, data) {
    return Company.findByIdAndUpdate(id, data, { new: true });
  },

  async findByOwnerId(ownerId) {
    return Company.findOne({ owner_id: ownerId });
  },

  async getMembers(companyId) {
    const { User } = require('./User');
    return User.find({ company_id: companyId }).populate('role_id');
  }
};

module.exports = { Company, ...CompanyModel };
