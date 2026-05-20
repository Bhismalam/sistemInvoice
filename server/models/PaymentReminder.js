const mongoose = require('mongoose');

const paymentReminderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  reminder_date: { type: Date, required: true },
  reminder_type: { type: String, enum: ['before_due', 'on_due', 'after_due', 'custom'], default: 'before_due' },
  days_offset: { type: Number, default: 0 },
  message: { type: String, default: null },
  is_sent: { type: Boolean, default: false },
  is_read: { type: Boolean, default: false },
  sent_at: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

paymentReminderSchema.virtual('id').get(function() { return this._id.toHexString(); });
paymentReminderSchema.set('toJSON', { virtuals: true });
paymentReminderSchema.set('toObject', { virtuals: true });

const PaymentReminderDB = mongoose.model('PaymentReminder', paymentReminderSchema);

const PaymentReminder = {
  PaymentReminder: PaymentReminderDB,

  async create(data) {
    const reminder = new PaymentReminderDB(data);
    await reminder.save();
    return reminder;
  },

  async findAll(userId, { document_id, is_sent, is_read, sort, order, page, limit } = {}, companyId = null) {
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    if (document_id) query.document_id = document_id;
    if (is_sent !== undefined) query.is_sent = is_sent === 'true' || is_sent === true;
    if (is_read !== undefined) query.is_read = is_read === 'true' || is_read === true;

    const sortField = sort || 'reminder_date';
    const sortOrder = order === 'desc' ? -1 : 1;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const pageNum = Math.max(1, parseInt(page) || 1);
    const skipNum = (pageNum - 1) * limitNum;

    const results = await PaymentReminderDB.find(query)
      .populate('document_id', 'document_number total due_date')
      .sort({ [sortField]: sortOrder })
      .skip(skipNum)
      .limit(limitNum);

    const total = await PaymentReminderDB.countDocuments(query);

    const data = results.map(r => {
      const rem = r.toObject();
      return {
        ...rem,
        document_number: rem.document_id ? rem.document_id.document_number : null,
        document_total: rem.document_id ? rem.document_id.total : 0,
        document_due_date: rem.document_id ? rem.document_id.due_date : null,
        document_id: rem.document_id ? rem.document_id._id.toString() : null
      };
    });

    return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
  },

  async findById(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const r = await PaymentReminderDB.findOne(query).populate('document_id');
    if (!r) return null;
    return r.toObject();
  },

  async update(id, userId, data, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    return PaymentReminderDB.findOneAndUpdate(query, data, { new: true });
  },

  async delete(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    const res = await PaymentReminderDB.deleteOne(query);
    return { changes: res.deletedCount };
  },

  async markAsRead(id, userId, companyId = null) {
    let query = companyId ? { _id: id, company_id: companyId } : { _id: id, user_id: userId };
    return PaymentReminderDB.findOneAndUpdate(query, { is_read: true });
  },

  async autoGenerateReminders(userId, documentId, companyId = null) {
    const Document = require('./Document');
    const doc = await Document.findById(documentId, userId, companyId);
    if (!doc || doc.document_type !== 'invoice') return;

    // Delete existing ones
    await PaymentReminderDB.deleteMany({ document_id: documentId });

    const dueDate = new Date(doc.due_date);
    const issueDate = new Date(doc.issue_date);
    
    // Default logic: Before due (if >3 days), On due, After due
    const diffTime = Math.abs(dueDate - issueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const reminders = [];
    
    // On due date
    reminders.push({
      user_id: userId,
      company_id: companyId || null,
      document_id: documentId,
      reminder_date: dueDate,
      reminder_type: 'on_due',
      days_offset: 0,
      message: `Jatuh tempo hari ini untuk Invoice ${doc.document_number}`
    });

    // Before due date (if term > 3 days)
    if (diffDays > 3) {
      const beforeDate = new Date(dueDate);
      beforeDate.setDate(beforeDate.getDate() - 3);
      reminders.push({
        user_id: userId,
        company_id: companyId || null,
        document_id: documentId,
        reminder_date: beforeDate,
        reminder_type: 'before_due',
        days_offset: -3,
        message: `H-3 jatuh tempo untuk Invoice ${doc.document_number}`
      });
    }

    // After due date (D+3)
    const afterDate = new Date(dueDate);
    afterDate.setDate(afterDate.getDate() + 3);
    reminders.push({
      user_id: userId,
      company_id: companyId || null,
      document_id: documentId,
      reminder_date: afterDate,
      reminder_type: 'after_due',
      days_offset: 3,
      message: `Telat 3 hari untuk Invoice ${doc.document_number}`
    });

    await PaymentReminderDB.insertMany(reminders);
  },

  async processPendingReminders() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reminders = await PaymentReminderDB.find({
      is_sent: false,
      reminder_date: { $gte: today, $lt: tomorrow }
    }).populate('document_id');

    let processedCount = 0;
    const { ActivityLog } = require('./ActivityLog');

    for (const reminder of reminders) {
      if (reminder.document_id && reminder.document_id.status === 'paid') {
        reminder.is_sent = true;
        await reminder.save();
        continue;
      }

      const docNumber = reminder.document_id ? reminder.document_id.document_number : 'Unknown';
      await ActivityLog.create({
        user_id: reminder.user_id,
        document_id: reminder.document_id ? reminder.document_id._id : null,
        action: 'PAYMENT_REMINDER',
        details: `Reminder ${reminder.reminder_type}: ${docNumber}`
      });

      reminder.is_sent = true;
      reminder.sent_at = new Date();
      await reminder.save();
      processedCount++;
    }

    return processedCount;
  },
  async getUpcoming(userId, days, companyId = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    let query = companyId ? { company_id: companyId } : { user_id: userId };
    query.is_sent = false;
    query.reminder_date = { $gte: today, $lte: futureDate };

    const reminders = await PaymentReminderDB.find(query).populate('document_id').sort({ reminder_date: 1 });

    return reminders.map(r => r.toObject());
  },

  async getDebtSummary(userId, companyId = null) {
    const mongoose = require('mongoose');
    require('./Document'); // Ensure schema is registered
    const DocumentModel = mongoose.model('Document');
    
    let query = companyId ? { company_id: companyId } : { user_id: userId };
    query.document_type = 'invoice';
    query.status = { $in: ['sent', 'overdue'] };

    const docs = await DocumentModel.find(query).populate('contact_id');

    const summary = {
      sales: { total_amount: 0, overdue_amount: 0, overdue: [], upcoming: [] },
      purchase: { total_amount: 0, overdue_amount: 0, overdue: [], upcoming: [] }
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    docs.forEach(d => {
      const type = d.transaction_type;
      if (!summary[type]) return;

      summary[type].total_amount += d.total;

      const dueDate = new Date(d.due_date);
      const docObj = d.toObject();
      docObj.contact_name = d.contact_id ? d.contact_id.name : null;
      docObj.id = docObj._id.toString();
      
      const diffTime = dueDate - today;
      docObj.days_until_due = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      docObj.days_overdue = -docObj.days_until_due;

      if (dueDate < today) {
        summary[type].overdue_amount += d.total;
        summary[type].overdue.push(docObj);
      } else {
        summary[type].upcoming.push(docObj);
      }
    });

    return summary;
  }
};

module.exports = PaymentReminder;
