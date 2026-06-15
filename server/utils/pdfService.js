const PDFDocument = require('pdfkit');
const { Company } = require('../models/Company');
const { User } = require('../models/User');
const path = require('path');
const fs = require('fs');

function formatCurrency(val) {
  return 'Rp' + Number(val || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateVal) {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function generateInvoicePDF(docData) {
  return new Promise(async (resolve, reject) => {
    try {
      const pdf = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];
      pdf.on('data', buffers.push.bind(buffers));
      pdf.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Load company details
      let businessName = '';
      let businessLogo = null;
      let businessAddress = '';
      let businessPhone = '';
      let businessEmail = '';
      let npwp = '';
      let bankName = '';
      let bankAccountNumber = '';
      let bankAccountName = '';

      if (docData.company_id) {
        const company = await Company.findById(docData.company_id);
        if (company) {
          businessName = company.name || '';
          businessLogo = company.logo || null;
          businessAddress = company.address || '';
          businessPhone = company.phone || '';
          businessEmail = company.email || '';
          npwp = company.npwp || '';
          bankName = company.bank_name || '';
          bankAccountNumber = company.bank_account_number || '';
          bankAccountName = company.bank_account_name || '';
        }
      } else {
        const user = await User.findById(docData.user_id);
        if (user) {
          businessName = user.business_name || '';
          businessLogo = user.business_logo || null;
          businessAddress = user.business_address || '';
          businessPhone = user.phone || '';
          businessEmail = user.email || '';
          npwp = user.npwp || '';
        }
      }

      // 1. Header (Logo & Company Info)
      let logoPath = null;
      if (businessLogo) {
        // Look up file in uploads folder
        const filename = path.basename(businessLogo);
        const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.resolve(__dirname, '../../uploads');
        const potentialPath = path.join(uploadDir, filename);
        if (fs.existsSync(potentialPath)) {
          logoPath = potentialPath;
        }
      }

      let logoHeight = 0;
      let logoWidth = 100;
      if (logoPath) {
        try {
          const img = pdf.openImage(logoPath);
          const scaleW = 100 / img.width;
          const scaleH = 70 / img.height;
          const scale = Math.min(scaleW, scaleH);
          logoWidth = img.width * scale;
          logoHeight = img.height * scale;
        } catch (err) {
          console.error('Failed to calculate logo height:', err);
          logoHeight = 50;
          logoWidth = 100;
        }
      }

      if (logoPath) {
        pdf.image(logoPath, 50, 45, { width: logoWidth, height: logoHeight });
      } else {
        pdf.fontSize(18).fillColor('#1e293b').font('Helvetica-Bold').text(businessName || 'INVOICEFLOW', 50, 45);
      }

      // Company info text (right-aligned)
      pdf.fontSize(9)
         .fillColor('#64748b')
         .font('Helvetica')
         .text(businessName, 200, 45, { align: 'right' });
      
      let nextY = 58;
      if (businessAddress) {
        pdf.text(businessAddress, 200, nextY, { align: 'right' });
        nextY += 13;
      }
      
      pdf.text(`Telp: ${businessPhone || '-'} | Email: ${businessEmail || '-'}`, 200, nextY, { align: 'right' });
      nextY += 13;

      if (npwp) {
        pdf.text(`NPWP: ${npwp}`, 200, nextY, { align: 'right' });
      }

      // Dynamically calculate divider line position based on logo/text height
      const headerBottomY = logoPath ? Math.max(110, 45 + logoHeight + 10) : 110;
      pdf.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, headerBottomY).lineTo(545, headerBottomY).stroke();

      // 2. Invoice Details (Title & Metas)
      const docTypeLabel = docData.document_type === 'order' ? 'ORDER' : 'INVOICE';
      const docTransLabel = docData.transaction_type === 'sales' ? 'PENJUALAN' : 'PEMBELIAN';
      
      pdf.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(`${docTypeLabel} ${docTransLabel}`, 50, headerBottomY + 15);
      
      // Metadata (right column)
      pdf.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Nomor Dokumen:', 350, headerBottomY + 15);
      pdf.font('Helvetica-Bold').fillColor('#0f172a').text(docData.document_number, 450, headerBottomY + 15, { align: 'right' });

      pdf.font('Helvetica-Bold').fillColor('#64748b').text('Tanggal Terbit:', 350, headerBottomY + 30);
      pdf.font('Helvetica').fillColor('#0f172a').text(formatDate(docData.issue_date), 450, headerBottomY + 30, { align: 'right' });

      pdf.font('Helvetica-Bold').fillColor('#64748b').text('Tanggal Jatuh Tempo:', 350, headerBottomY + 45);
      pdf.font('Helvetica').fillColor('#0f172a').text(formatDate(docData.due_date), 450, headerBottomY + 45, { align: 'right' });

      // Client Info (Billed To)
      pdf.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('DITAGIHKAN KEPADA:', 50, headerBottomY + 60);
      pdf.font('Helvetica-Bold').fillColor('#0f172a').fontSize(11).text(docData.contact_name || '-', 50, headerBottomY + 75);
      
      let clientNextY = headerBottomY + 90;
      if (docData.contact_address) {
        pdf.font('Helvetica').fontSize(9).fillColor('#64748b').text(docData.contact_address, 50, clientNextY, { width: 250 });
        const addrHeight = pdf.heightOfString(docData.contact_address, { width: 250 });
        clientNextY += Math.max(addrHeight + 5, 25);
      }
      
      pdf.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Email: ${docData.contact_email || '-'} | Telp: ${docData.contact_phone || '-'}`, 50, clientNextY);

      // 3. Table of items
      let startY = headerBottomY + 150;
      pdf.strokeColor('#0f172a').lineWidth(1.5).moveTo(50, startY).lineTo(545, startY).stroke();
      
      // Headers
      pdf.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a')
         .text('No', 50, startY + 8)
         .text('Deskripsi Item', 80, startY + 8)
         .text('Qty', 350, startY + 8, { width: 30, align: 'center' })
         .text('Harga Satuan', 390, startY + 8, { width: 70, align: 'right' })
         .text('Total', 475, startY + 8, { width: 70, align: 'right' });

      pdf.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, startY + 24).lineTo(545, startY + 24).stroke();

      let currentY = startY + 24;
      (docData.items || []).forEach((item, index) => {
        currentY += 8;
        
        pdf.fontSize(9).font('Helvetica').fillColor('#334155')
           .text(String(index + 1), 50, currentY)
           .text(item.description, 80, currentY, { width: 250 })
           .text(String(item.quantity), 350, currentY, { width: 30, align: 'center' })
           .text(formatCurrency(item.unit_price), 390, currentY, { width: 70, align: 'right' })
           .text(formatCurrency(item.total), 475, currentY, { width: 70, align: 'right' });

        // Calculate line spacing based on description length
        const descHeight = pdf.heightOfString(item.description, { width: 250 });
        currentY += Math.max(descHeight + 5, 20);
        
        pdf.strokeColor('#f1f5f9').lineWidth(1).moveTo(50, currentY).lineTo(545, currentY).stroke();
      });

      pdf.strokeColor('#0f172a').lineWidth(1.5).moveTo(50, currentY).lineTo(545, currentY).stroke();
      
      currentY += 15;

      // 4. Totals & Payment info
      // Left side: Payment Info
      if (bankName && bankAccountNumber && bankAccountName) {
        pdf.fontSize(9).font('Helvetica-Bold').fillColor('#0f172a').text('Informasi Transfer Pembayaran:', 50, currentY);
        pdf.fontSize(9).font('Helvetica').fillColor('#64748b')
           .text(`Silakan transfer pembayaran ke rekening berikut:`, 50, currentY + 15)
           .font('Helvetica-Bold').fillColor('#334155')
           .text(`Bank          : ${bankName}`, 50, currentY + 30)
           .text(`No. Rekening : ${bankAccountNumber}`, 50, currentY + 42)
           .text(`Atas Nama     : ${bankAccountName}`, 50, currentY + 54);
      }

      // Right side: Totals
      pdf.fontSize(9).font('Helvetica').fillColor('#64748b').text('Subtotal:', 350, currentY);
      pdf.font('Helvetica').fillColor('#334155').text(formatCurrency(docData.subtotal), 450, currentY, { align: 'right' });

      if (docData.discount_amount > 0) {
        currentY += 15;
        pdf.font('Helvetica').fillColor('#64748b').text(`Diskon (${docData.discount_percent}%):`, 350, currentY);
        pdf.font('Helvetica').fillColor('#334155').text(`-${formatCurrency(docData.discount_amount)}`, 450, currentY, { align: 'right' });
      }

      currentY += 15;
      pdf.font('Helvetica').fillColor('#64748b').text(`PPN (${docData.tax_percent}%):`, 350, currentY);
      pdf.font('Helvetica').fillColor('#334155').text(formatCurrency(docData.tax_amount), 450, currentY, { align: 'right' });

      currentY += 20;
      pdf.strokeColor('#e2e8f0').lineWidth(1).moveTo(350, currentY - 5).lineTo(545, currentY - 5).stroke();
      pdf.font('Helvetica-Bold').fontSize(11).fillColor('#2563eb').text('Total Akhir:', 350, currentY);
      pdf.font('Helvetica-Bold').fontSize(11).fillColor('#2563eb').text(formatCurrency(docData.total), 450, currentY, { align: 'right' });

      // Notes & Footer
      currentY += 60;
      if (docData.notes) {
        pdf.fontSize(9).font('Helvetica-Bold').fillColor('#64748b').text('Catatan:', 50, currentY);
        pdf.font('Helvetica').fillColor('#64748b').text(docData.notes, 50, currentY + 12, { width: 495 });
        currentY += 40;
      }

      pdf.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('Dokumen ini diterbitkan secara digital oleh Sistem InvoiceFlow.', 50, 750, { align: 'center', width: 495 });
      
      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };
