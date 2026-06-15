const Document = require('../models/Document');
const { User } = require('../models/User');
const WhatsAppService = require('../utils/whatsappService');
const { generateInvoicePDF } = require('../utils/pdfService');
const ActivityLog = require('../models/ActivityLog');
const { WhatsAppLog } = require('../models/WhatsAppLog');

const whatsappController = {
  /**
   * POST /api/whatsapp/send-invoice/:documentId
   * Generate invoice PDF and send to contact via WhatsApp
   */
  async sendInvoice(req, res, next) {
    try {
      const { documentId } = req.params;
      const { phoneNumber, includePaymentLink } = req.body;

      // Fetch document with full details
      const doc = await Document.findById(documentId, req.user.id, req.user.company_id);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      }

      // Determine phone number: use provided, or fallback to contact_phone (stored in the document/contact)
      const targetPhone = phoneNumber || doc.contact_phone;
      if (!targetPhone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nomor WhatsApp tidak tersedia. Tambahkan nomor telepon di kontak atau masukkan secara manual.' 
        });
      }

      // Get user/business info for the PDF
      const user = await User.findById(req.user.id);

      const wa = new WhatsAppService();
      if (!wa.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp belum dikonfigurasi. Tambahkan FONNTE_API_KEY di pengaturan server (.env).'
        });
      }

      // Generate invoice PDF
      const pdfBuffer = await generateInvoicePDF(doc);
      const pdfFilename = `${doc.document_number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;

      // Build the WhatsApp message
      const typeLabel = doc.document_type === 'invoice' ? 'INVOICE' : 'ORDER';
      const totalFormatted = `Rp ${parseFloat(doc.total).toLocaleString('id-ID')}`;
      const dueDate = new Date(doc.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let message = `📄 *${typeLabel} BARU*

`;
      message += `Halo ${doc.contact_name || 'Pelanggan'},

`;
      message += `Berikut ${typeLabel.toLowerCase()} dari *${user.business_name || 'kami'}*:

`;
      message += `📋 No: ${doc.document_number}
`;
      message += `💰 Total: *${totalFormatted}*
`;
      message += `📅 Jatuh Tempo: ${dueDate}
`;

      // Add payment link if available and requested
      if (includePaymentLink !== false && doc.payment_link) {
        const paymentUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/#/pay/${doc.payment_link}`;
        message += `
🔗 Lihat & Bayar: ${paymentUrl}
`;
      }

      message += `
Terima kasih! 🙏
— ${user.business_name || 'InvoiceFlow'}`;

      // Send PDF + message via WhatsApp
      const result = await wa.sendDocument(targetPhone, pdfBuffer, pdfFilename, message);

      // Log the WhatsApp send using Mongoose model
      const log = new WhatsAppLog({
        user_id: req.user.id,
        document_id: doc.id,
        recipient_phone: WhatsAppService.formatPhoneNumber(targetPhone),
        message_type: 'invoice',
        message_text: message,
        file_sent: pdfFilename,
        status: 'sent',
        provider_message_id: result.messageId || null
      });
      await log.save();

      // Activity log
      await ActivityLog.log(req.user.id, doc.id, `Invoice dikirim via WhatsApp ke ${targetPhone}`);

      res.json({
        success: true,
        message: `Invoice berhasil dikirim via WhatsApp ke ${targetPhone}! 📱`,
        data: { messageId: result.messageId }
      });

    } catch (error) {
      // Log failed attempt
      try {
        const log = new WhatsAppLog({
          user_id: req.user.id,
          document_id: req.params.documentId || null,
          recipient_phone: req.body.phoneNumber || '',
          message_type: 'invoice',
          status: 'failed',
          error_message: error.message
        });
        await log.save();
      } catch (logErr) {
        console.error('Failed to log WA error:', logErr.message);
      }
      next(error);
    }
  },

  /**
   * POST /api/whatsapp/send-text/:documentId
   * Send a text-only invoice summary via WhatsApp (no PDF attachment)
   */
  async sendText(req, res, next) {
    try {
      const { documentId } = req.params;
      const { phoneNumber, customMessage } = req.body;

      const doc = await Document.findById(documentId, req.user.id, req.user.company_id);
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      }

      const targetPhone = phoneNumber || doc.contact_phone;
      if (!targetPhone) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nomor WhatsApp tidak tersedia.' 
        });
      }

      const user = await User.findById(req.user.id);
      const wa = new WhatsAppService();
      if (!wa.isConfigured()) {
        return res.status(400).json({ success: false, message: 'WhatsApp belum dikonfigurasi.' });
      }

      // Build message
      const totalFormatted = `Rp ${parseFloat(doc.total).toLocaleString('id-ID')}`;
      const dueDate = new Date(doc.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      let message = customMessage || '';
      if (!customMessage) {
        message = `📄 *INVOICE*

`;
        message += `Halo ${doc.contact_name || 'Pelanggan'},

`;
        message += `Berikut ringkasan invoice dari *${user.business_name || 'kami'}*:

`;
        message += `📋 No: ${doc.document_number}
`;
        message += `💰 Total: *${totalFormatted}*
`;
        message += `📅 Jatuh Tempo: ${dueDate}
`;

        // Items summary
        if (doc.items && doc.items.length > 0) {
          message += `
📦 *Rincian:*
`;
          for (const item of doc.items) {
            message += `  • ${item.description} (${item.quantity}x) — Rp ${parseFloat(item.total).toLocaleString('id-ID')}
`;
          }
        }

        if (doc.payment_link) {
          const paymentUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/#/pay/${doc.payment_link}`;
          message += `
🔗 Bayar: ${paymentUrl}
`;
        }

        message += `
Terima kasih! 🙏
— ${user.business_name || 'InvoiceFlow'}`;
      }

      const result = await wa.sendMessage(targetPhone, message);

      // Log the WhatsApp send using Mongoose model
      const log = new WhatsAppLog({
        user_id: req.user.id,
        document_id: doc.id,
        recipient_phone: WhatsAppService.formatPhoneNumber(targetPhone),
        message_type: 'invoice',
        message_text: message,
        status: 'sent',
        provider_message_id: result.messageId || null
      });
      await log.save();

      await ActivityLog.log(req.user.id, doc.id, `Invoice text dikirim via WhatsApp ke ${targetPhone}`);

      res.json({
        success: true,
        message: `Pesan invoice berhasil dikirim via WhatsApp! 📱`,
        data: { messageId: result.messageId }
      });

    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/whatsapp/status
   * Check WhatsApp connection status
   */
  async getStatus(req, res, next) {
    try {
      const wa = new WhatsAppService();
      const status = await wa.testConnection();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/whatsapp/logs/:documentId?
   * Get WhatsApp send logs for a document or all
   */
  async getLogs(req, res, next) {
    try {
      const query = { user_id: req.user.id };

      if (req.params.documentId) {
        query.document_id = req.params.documentId;
      }

      const rows = await WhatsAppLog.find(query).sort({ sent_at: -1 }).limit(50);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = whatsappController;
