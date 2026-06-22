const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../server/controllers/documentController.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) return res.json({ success: true, data: [] });
      const results = await Document.search(req.user.id, q, req.user.company_id);
      res.json({ success: true, data: results });
    } catch (error) { next(error); }
  }
};`;

const replacementStr = `  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q || q.length < 2) return res.json({ success: true, data: [] });
      const results = await Document.search(req.user.id, q, req.user.company_id);
      res.json({ success: true, data: results });
    } catch (error) { next(error); }
  },

  async downloadPDF(req, res, next) {
    try {
      const doc = await Document.findById(req.params.id, req.user.id, req.user.company_id);
      if (!doc) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      
      const { generateInvoicePDF } = require('../utils/pdfService');
      const pdfBuffer = await generateInvoicePDF(doc);
      
      const cleanFilename = doc.document_number.replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', \`attachment; filename="invoice_\${cleanFilename}.pdf"\`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  },

  async sendInvoiceEmail(req, res, next) {
    try {
      const { to, subject, message } = req.body;
      if (!to) {
        return res.status(400).json({ success: false, message: 'Email penerima wajib diisi.' });
      }

      const doc = await Document.findById(req.params.id, req.user.id, req.user.company_id);
      if (!doc) return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });

      const { generateInvoicePDF } = require('../utils/pdfService');
      const { sendEmailWithAttachment } = require('../utils/emailService');

      const pdfBuffer = await generateInvoicePDF(doc);

      const htmlMessage = \`
        <div style="font-family: sans-serif; max-width: 600px; color: #334155; line-height: 1.6;">
          <p>\${message.replace(/\\n/g, '<br>')}</p>
        </div>
      \`;

      const cleanFilename = doc.document_number.replace(/[^a-zA-Z0-9-_]/g, '_') + '.pdf';
      const mailResult = await sendEmailWithAttachment({
        to,
        subject: subject || \`Invoice No. \${doc.document_number}\`,
        text: message,
        html: htmlMessage,
        attachmentBuffer: pdfBuffer,
        filename: \`invoice_\${cleanFilename}\`
      });

      let updatedDoc = doc;
      if (doc.status === 'draft') {
        updatedDoc = await Document.updateStatus(doc.id, req.user.id, 'sent', req.user.company_id);
        if (doc.document_type === 'invoice') {
          await PaymentReminder.autoGenerateReminders(req.user.id, doc.id);
        }
      }

      await ActivityLog.log(req.user.id, doc.id, \`Sent invoice PDF via email to \${to}\`);

      res.json({
        success: true,
        message: mailResult.isMock
          ? \`Invoice berhasil diproses! (Mode Sandbox: file tersimpan di scratch/last_sent_invoice.pdf)\`
          : \`Invoice berhasil dikirim ke \${to}.\`,
        data: {
          document: updatedDoc,
          mailResult
        }
      });
    } catch (error) {
      next(error);
    }
  }
};`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched documentController.js');
} else {
  console.error('Target string not found in documentController.js!');
}
