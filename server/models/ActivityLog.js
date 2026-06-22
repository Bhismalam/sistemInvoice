const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  action: { type: String, required: true },
  details: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

activityLogSchema.virtual('id').get(function() { return this._id.toHexString(); });
activityLogSchema.set('toJSON', { virtuals: true });
activityLogSchema.set('toObject', { virtuals: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

const ActivityLogModel = {
  async create({ user_id, company_id = null, document_id, action, details }) {
    if (!company_id && user_id) {
      try {
        const { User } = require('./User');
        const user = await User.findById(user_id);
        if (user) company_id = user.company_id || null;
      } catch (err) {
        // Fallback silently if user query fails
      }
    }
    const log = new ActivityLog({ user_id, company_id, document_id, action, details });
    await log.save();
    return log;
  },

  async log(user_id, document_id, action, details = '', company_id = null) {
    return this.create({ user_id, company_id, document_id, action, details });
  },

  async findAll(userId, limit = 20, companyId = null) {
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    return ActivityLog.find(query)
      .sort({ created_at: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: 'document_id',
        select: 'document_number contact_id transaction_type document_type',
        populate: { path: 'contact_id', select: 'name' }
      })
      .then(logs => logs.map(log => {
        const doc = log.toObject();
        return {
          ...doc,
          document_number: doc.document_id ? doc.document_id.document_number : null,
          contact_name: doc.document_id && doc.document_id.contact_id ? doc.document_id.contact_id.name : null,
          document_id: doc.document_id ? doc.document_id._id.toString() : null,
          transaction_type: doc.document_id ? doc.document_id.transaction_type : null,
          document_type: doc.document_id ? doc.document_id.document_type : null
        };
      }));
  },

  async countUnread(userId, companyId = null) {
    const { User } = require('./User');
    const user = await User.findById(userId);
    const since = user && user.notifications_read_at ? user.notifications_read_at : new Date(0);
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    query.created_at = { $gt: since };
    return ActivityLog.countDocuments(query);
  }
};

module.exports = { ActivityLog, ...ActivityLogModel };
