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
  async create({ user_id, document_id, action, details }) {
    const log = new ActivityLog({ user_id, document_id, action, details });
    await log.save();
    return log;
  },

  async log(user_id, document_id, action, details = '') {
    return this.create({ user_id, document_id, action, details });
  },

  async findAll(userId, limit = 20) {
    return ActivityLog.find({ user_id: userId })
      .sort({ created_at: -1, _id: -1 })
      .limit(limit)
      .populate({
        path: 'document_id',
        select: 'document_number contact_id',
        populate: { path: 'contact_id', select: 'name' }
      })
      .then(logs => logs.map(log => {
        const doc = log.toObject();
        return {
          ...doc,
          document_number: doc.document_id ? doc.document_id.document_number : null,
          contact_name: doc.document_id && doc.document_id.contact_id ? doc.document_id.contact_id.name : null,
          document_id: doc.document_id ? doc.document_id._id.toString() : null
        };
      }));
  },

  async countUnread(userId) {
    const { User } = require('./User');
    const user = await User.findById(userId);
    const since = user && user.notifications_read_at ? user.notifications_read_at : new Date(0);
    return ActivityLog.countDocuments({ user_id: userId, created_at: { $gt: since } });
  }
};

module.exports = { ActivityLog, ...ActivityLogModel };
