const mongoose = require('mongoose');

// Default permissions available in the system
const ALL_PERMISSIONS = [
  // Documents (Invoice & Order)
  'create:document', 'read:document', 'update:document', 'delete:document',
  // Products
  'create:product', 'read:product', 'update:product', 'delete:product',
  // Contacts
  'create:contact', 'read:contact', 'update:contact', 'delete:contact',
  // Receipts
  'create:receipt', 'read:receipt', 'delete:receipt',
  // Reports & Dashboard
  'read:dashboard', 'read:report',
  // Payment Reminders
  'create:reminder', 'read:reminder', 'update:reminder', 'delete:reminder',
  // Company Management (Admin-only typically)
  'manage:members', 'manage:roles', 'manage:company_settings'
];

const roleSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  permissions: [{ type: String, enum: ALL_PERMISSIONS }],
  is_default: { type: Boolean, default: false } // Marker for system-generated roles
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

roleSchema.virtual('id').get(function() { return this._id.toHexString(); });
roleSchema.set('toJSON', { virtuals: true });
roleSchema.set('toObject', { virtuals: true });

// Ensure role name is unique within a company
roleSchema.index({ company_id: 1, name: 1 }, { unique: true });

const Role = mongoose.model('Role', roleSchema);

const RoleModel = {
  ALL_PERMISSIONS,

  async create(data) {
    const role = new Role(data);
    await role.save();
    return role;
  },

  async findAll(companyId) {
    return Role.find({ company_id: companyId }).sort({ is_default: -1, name: 1 });
  },

  async findById(id, companyId) {
    return Role.findOne({ _id: id, company_id: companyId });
  },

  async update(id, companyId, data) {
    return Role.findOneAndUpdate({ _id: id, company_id: companyId }, data, { new: true });
  },

  async delete(id, companyId) {
    // Prevent deletion of default roles
    const role = await Role.findOne({ _id: id, company_id: companyId });
    if (role && role.is_default) {
      throw new Error('Role bawaan tidak dapat dihapus.');
    }
    const res = await Role.deleteOne({ _id: id, company_id: companyId });
    return { changes: res.deletedCount };
  },

  /**
   * Creates the default "Owner" and "Staff" roles for a new company.
   */
  async createDefaultRoles(companyId) {
    const ownerRole = await this.create({
      company_id: companyId,
      name: 'Owner',
      description: 'Pemilik perusahaan dengan akses penuh.',
      permissions: [...ALL_PERMISSIONS],
      is_default: true
    });

    const staffRole = await this.create({
      company_id: companyId,
      name: 'Staff',
      description: 'Staf dengan akses dasar.',
      permissions: [
        'create:document', 'read:document', 'update:document',
        'create:product', 'read:product',
        'create:contact', 'read:contact', 'update:contact',
        'create:receipt', 'read:receipt',
        'read:dashboard',
        'read:reminder'
      ],
      is_default: true
    });

    return { ownerRole, staffRole };
  }
};

module.exports = { Role, ...RoleModel };
