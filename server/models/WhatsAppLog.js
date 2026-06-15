const mongoose = require('mongoose');

const whatsappLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  recipient_phone: { type: String, required: true },
  message_type: { type: String, enum: ['invoice', 'reminder', 'payment_confirmation', 'payment_link', 'custom'], required: true },
  message_text: { type: String, default: null },
  file_sent: { type: String, default: null },
  status: { type: String, enum: ['pending', 'sent', 'delivered', 'read', 'failed'], default: 'pending' },
  error_message: { type: String, default: null },
  provider_message_id: { type: String, default: null }
}, {
  timestamps: { createdAt: 'sent_at', updatedAt: false }
});

whatsappLogSchema.virtual('id').get(function() { return this._id.toHexString(); });
whatsappLogSchema.set('toJSON', { virtuals: true });
whatsappLogSchema.set('toObject', { virtuals: true });

const WhatsAppLog = mongoose.model('WhatsAppLog', whatsappLogSchema);

module.exports = { WhatsAppLog };
