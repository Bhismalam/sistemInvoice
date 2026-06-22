const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class NotificationService {
  /**
   * Notify the business owner about a payment proof upload.
   * Sends: WhatsApp, Email, and In-App notification.
   */
  static async notifyPaymentProof(doc, proofData) {
    const promises = [];

    // 1. In-App Notification (ActivityLog)
    promises.push(this._createInAppNotification(doc, proofData));

    // 2. WhatsApp to Business Owner
    promises.push(this._sendOwnerWhatsApp(doc, proofData));

    // 3. Email to Business Owner
    promises.push(this._sendOwnerEmail(doc, proofData));

    // Run all in parallel, don't let one failure block others
    const results = await Promise.allSettled(promises);
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`Notification ${i} failed:`, r.reason?.message || r.reason);
      }
    });

    return results;
  }

  /**
   * Send WhatsApp confirmation to the customer after they upload proof.
   */
  static async sendCustomerConfirmation(doc) {
    try {
      const WhatsAppService = require('../utils/whatsappService');
      const wa = new WhatsAppService();
      if (!wa.isConfigured()) return;

      const message = `✅ *BUKTI PEMBAYARAN DITERIMA*\n\nHalo ${doc.contact_name || 'Pelanggan'},\n\nBukti pembayaran Anda untuk ${doc.document_number} sebesar Rp ${Number(doc.total).toLocaleString('id-ID')} telah kami terima.\n\nKami akan segera memverifikasinya dan mengonfirmasi pembayaran Anda.\n\nTerima kasih! 🙏\n\n_${doc.business_name || 'InvoiceFlow'}_`;

      await wa.sendMessage(doc.contact_phone, message);
    } catch (error) {
      console.error('Customer WhatsApp confirmation failed:', error.message);
    }
  }

  /**
   * Notify owner when Midtrans payment is successful (called from payment webhook).
   */
  static async notifyMidtransPayment(doc, paymentMethod) {
    const promises = [];

    // In-App
    promises.push(this._createInAppNotification(doc, {
      sender_name: doc.contact_name || 'Pelanggan',
      sender_bank: paymentMethod || 'Midtrans',
      transfer_amount: doc.total,
      notes: 'Pembayaran otomatis via Midtrans'
    }));

    // WhatsApp to owner
    promises.push(this._sendOwnerWhatsApp(doc, {
      sender_name: doc.contact_name || 'Pelanggan',
      sender_bank: paymentMethod || 'Midtrans',
      transfer_amount: doc.total,
      notes: 'Pembayaran otomatis via Midtrans (sudah terverifikasi)'
    }));

    // Email to owner
    promises.push(this._sendOwnerEmail(doc, {
      sender_name: doc.contact_name || 'Pelanggan',
      sender_bank: paymentMethod || 'Midtrans',
      transfer_amount: doc.total,
      notes: 'Pembayaran otomatis via Midtrans (sudah terverifikasi)'
    }));

    // WhatsApp confirmation to customer
    if (doc.contact_phone) {
      promises.push(this.sendCustomerConfirmation(doc));
    }

    await Promise.allSettled(promises);
  }

  // ===== PRIVATE HELPERS =====

  static async _createInAppNotification(doc, proofData) {
    try {
      const ActivityLog = require('../models/ActivityLog');
      // We need the user_id (owner). doc.user_id could be populated or just an ObjectId
      const userId = doc.user_id?._id || doc.user_id;
      const companyId = doc.company_id?._id || doc.company_id || null;

      await ActivityLog.log(
        userId,
        doc._id || doc.id,
        `💰 Pembayaran diterima dari ${proofData.sender_name} untuk ${doc.document_number} sebesar Rp ${Number(proofData.transfer_amount).toLocaleString('id-ID')} via ${proofData.sender_bank}`,
        proofData.notes || '',
        companyId
      );
    } catch (error) {
      console.error('In-app notification failed:', error.message);
      throw error;
    }
  }

  static async _sendOwnerWhatsApp(doc, proofData) {
    try {
      const WhatsAppService = require('../utils/whatsappService');
      const wa = new WhatsAppService();
      if (!wa.isConfigured()) return;

      // Get owner's phone number
      const User = require('../models/User');
      const userId = doc.user_id?._id || doc.user_id;
      const UserModelDB = require('mongoose').model('User');
      const owner = await UserModelDB.findById(userId).select('phone business_name');
      if (!owner?.phone) return;

      const message = `💰 *PEMBAYARAN BARU DITERIMA*\n\n📋 Invoice: *${doc.document_number}*\n👤 Pelanggan: ${proofData.sender_name}\n💵 Jumlah: *Rp ${Number(proofData.transfer_amount).toLocaleString('id-ID')}*\n🏦 Via: ${proofData.sender_bank}\n📝 Catatan: ${proofData.notes || '-'}\n\nSegera cek dashboard Anda untuk verifikasi.\n\n_InvoiceFlow Notification_`;

      await wa.sendMessage(owner.phone, message);
    } catch (error) {
      console.error('Owner WhatsApp notification failed:', error.message);
      throw error;
    }
  }

  static async _sendOwnerEmail(doc, proofData) {
    try {
      const { sendEmailWithAttachment } = require('../utils/emailService');
      
      // Get owner's email
      const UserModelDB = require('mongoose').model('User');
      const userId = doc.user_id?._id || doc.user_id;
      const owner = await UserModelDB.findById(userId).select('email business_name');
      if (!owner?.email) return;

      const subject = `💰 Pembayaran Diterima - ${doc.document_number}`;
      const html = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">💰 Pembayaran Diterima</h1>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #64748b;">Invoice</td><td style="padding: 8px 0; font-weight: 600;">${doc.document_number}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Pelanggan</td><td style="padding: 8px 0; font-weight: 600;">${proofData.sender_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Jumlah</td><td style="padding: 8px 0; font-weight: 600; color: #10b981;">Rp ${Number(proofData.transfer_amount).toLocaleString('id-ID')}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Metode</td><td style="padding: 8px 0; font-weight: 600;">${proofData.sender_bank}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Catatan</td><td style="padding: 8px 0;">${proofData.notes || '-'}</td></tr>
            </table>
            <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #065f46;">Segera cek dashboard Anda untuk memverifikasi pembayaran ini.</p>
            </div>
          </div>
          <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">InvoiceFlow Notification System</div>
        </div>
      `;

      await sendEmailWithAttachment({
        to: owner.email,
        subject,
        text: `Pembayaran diterima untuk ${doc.document_number} dari ${proofData.sender_name} sebesar Rp ${Number(proofData.transfer_amount).toLocaleString('id-ID')}`,
        html
      });
    } catch (error) {
      console.error('Owner email notification failed:', error.message);
      throw error;
    }
  }
}

module.exports = NotificationService;
