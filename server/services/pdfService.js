const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

/**
 * Generate a professional invoice PDF
 * @param {Object} document - Document data with items
 * @param {Object} user - User/business data
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoicePDF(document, user) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50,
        info: {
          Title: `Invoice ${document.document_number}`,
          Author: user.business_name || 'InvoiceFlow',
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // margins

      // === HEADER ===
      doc.fontSize(24).font('Helvetica-Bold')
         .text(document.document_type === 'invoice' ? 'INVOICE' : 'ORDER', 50, 50);
      
      doc.fontSize(10).font('Helvetica')
         .fillColor('#666666')
         .text(`No: ${document.document_number}`, 50, 80);

      // Business info (right side)
      const businessName = user.business_name || 'InvoiceFlow';
      doc.fontSize(12).font('Helvetica-Bold')
         .fillColor('#333333')
         .text(businessName, 300, 50, { align: 'right', width: pageWidth - 250 });
      
      if (user.business_address) {
        doc.fontSize(9).font('Helvetica')
           .fillColor('#666666')
           .text(user.business_address, 300, 68, { align: 'right', width: pageWidth - 250 });
      }
      if (user.phone) {
        doc.fontSize(9).text(`Tel: ${user.phone}`, 300, doc.y + 2, { align: 'right', width: pageWidth - 250 });
      }

      // Divider
      doc.moveTo(50, 110).lineTo(50 + pageWidth, 110).strokeColor('#E0E0E0').lineWidth(1).stroke();

      // === BILL TO & DATES ===
      let yPos = 125;

      // Left: Bill to
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#999999').text('KEPADA:', 50, yPos);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
         .text(document.contact_name || '-', 50, yPos + 14);
      if (document.contact_email) {
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
           .text(document.contact_email, 50, yPos + 30);
      }
      if (document.contact_phone) {
        doc.fontSize(9).text(document.contact_phone, 50, doc.y + 2);
      }

      // Right: Dates
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#999999')
         .text('TANGGAL:', 380, yPos);
      doc.fontSize(10).font('Helvetica').fillColor('#333333')
         .text(formatDatePDF(document.issue_date), 380, yPos + 14);
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#999999')
         .text('JATUH TEMPO:', 380, yPos + 32);
      doc.fontSize(10).font('Helvetica').fillColor('#333333')
         .text(formatDatePDF(document.due_date), 380, yPos + 46);
      
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#999999')
         .text('STATUS:', 380, yPos + 64);
      const statusLabel = getStatusLabelPDF(document.status);
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor(document.status === 'paid' ? '#10B981' : document.status === 'overdue' ? '#EF4444' : '#3B82F6')
         .text(statusLabel, 380, yPos + 78);

      // === ITEMS TABLE ===
      yPos = 230;
      
      // Table header
      doc.rect(50, yPos, pageWidth, 25).fill('#1a1a2e');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('DESKRIPSI', 60, yPos + 8, { width: 200 });
      doc.text('QTY', 280, yPos + 8, { width: 60, align: 'right' });
      doc.text('HARGA SATUAN', 340, yPos + 8, { width: 100, align: 'right' });
      doc.text('TOTAL', 440, yPos + 8, { width: pageWidth - 400, align: 'right' });

      yPos += 25;

      // Table rows
      const items = document.items || [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowColor = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        
        doc.rect(50, yPos, pageWidth, 22).fill(rowColor);
        doc.fontSize(9).font('Helvetica').fillColor('#333333');
        doc.text(item.description || item.product_name || '-', 60, yPos + 6, { width: 200 });
        doc.text(String(item.quantity), 280, yPos + 6, { width: 60, align: 'right' });
        doc.text(formatCurrencyPDF(item.unit_price), 340, yPos + 6, { width: 100, align: 'right' });
        doc.text(formatCurrencyPDF(item.total || item.quantity * item.unit_price), 440, yPos + 6, { width: pageWidth - 400, align: 'right' });
        
        yPos += 22;
      }

      // Bottom line of table
      doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#E0E0E0').lineWidth(1).stroke();

      // === TOTALS ===
      yPos += 15;
      const totalsX = 350;
      const totalsWidth = pageWidth - 300;

      // Subtotal
      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('Subtotal', totalsX, yPos, { width: 100 });
      doc.text(formatCurrencyPDF(document.subtotal), totalsX + 100, yPos, { width: totalsWidth - 100, align: 'right' });
      yPos += 18;

      // Discount
      if (parseFloat(document.discount_amount) > 0) {
        doc.text(`Diskon (${document.discount_percent}%)`, totalsX, yPos, { width: 100 });
        doc.text(`-${formatCurrencyPDF(document.discount_amount)}`, totalsX + 100, yPos, { width: totalsWidth - 100, align: 'right' });
        yPos += 18;
      }

      // Tax
      doc.text(`PPN (${document.tax_percent}%)`, totalsX, yPos, { width: 100 });
      doc.text(formatCurrencyPDF(document.tax_amount), totalsX + 100, yPos, { width: totalsWidth - 100, align: 'right' });
      yPos += 18;

      // Total divider
      doc.moveTo(totalsX, yPos).lineTo(50 + pageWidth, yPos).strokeColor('#1a1a2e').lineWidth(2).stroke();
      yPos += 8;

      // Grand Total
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a2e');
      doc.text('TOTAL', totalsX, yPos, { width: 100 });
      doc.text(formatCurrencyPDF(document.total), totalsX + 100, yPos, { width: totalsWidth - 100, align: 'right' });

      // === NOTES ===
      if (document.notes) {
        yPos += 40;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#999999')
           .text('CATATAN:', 50, yPos);
        doc.fontSize(9).font('Helvetica').fillColor('#666666')
           .text(document.notes, 50, yPos + 14, { width: pageWidth });
      }

      // === FOOTER ===
      doc.fontSize(8).font('Helvetica').fillColor('#AAAAAA')
         .text(
           `Dokumen ini dihasilkan oleh InvoiceFlow — ${new Date().toLocaleDateString('id-ID')}`,
           50, 
           doc.page.height - 50, 
           { align: 'center', width: pageWidth }
         );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function formatDatePDF(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatCurrencyPDF(amount) {
  const num = parseFloat(amount) || 0;
  return 'Rp ' + num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getStatusLabelPDF(status) {
  const labels = {
    draft: 'Draft',
    sent: 'Terkirim',
    paid: 'Lunas',
    overdue: 'Jatuh Tempo',
    cancelled: 'Dibatalkan'
  };
  return labels[status] || status;
}

module.exports = { generateInvoicePDF };
