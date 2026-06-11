const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Configure SMTP transporter if env variables are set
const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;

let transporter = null;
if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log('EmailService: SMTP configured successfully.');
} else {
  console.log('EmailService: SMTP credentials not found. Running in MOCK/SANDBOX mode.');
}

async function sendEmailWithAttachment({ to, subject, text, html, attachmentBuffer, filename }) {
  if (hasSmtpConfig && transporter) {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    const mailOptions = {
      from: `"InvoiceFlow" <${fromAddress}>`,
      to,
      subject,
      text,
      html,
      attachments: [
        {
          filename,
          content: attachmentBuffer
        }
      ]
    };
    return transporter.sendMail(mailOptions);
  } else {
    // MOCK MODE: Write the email details and attachment to local scratch folder for developer inspection
    const scratchDir = path.resolve(__dirname, '../../scratch');
    
    // Ensure scratch directory exists
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const emailDetailsPath = path.join(scratchDir, 'last_sent_email.json');
    const attachmentPath = path.join(scratchDir, filename || 'last_sent_invoice.pdf');

    const emailData = {
      timestamp: new Date().toISOString(),
      to,
      subject,
      text,
      html,
      attachment_file: filename || 'last_sent_invoice.pdf'
    };

    // Save JSON details
    fs.writeFileSync(emailDetailsPath, JSON.stringify(emailData, null, 2), 'utf8');

    // Save PDF attachment
    if (attachmentBuffer) {
      fs.writeFileSync(attachmentPath, attachmentBuffer);
    }

    console.log('================ [MOCK EMAIL SERVICE] ================');
    console.log(`To         : ${to}`);
    console.log(`Subject    : ${subject}`);
    console.log(`Saved JSON : scratch/last_sent_email.json`);
    console.log(`Saved PDF  : scratch/${filename}`);
    console.log('======================================================');

    return {
      messageId: 'mock-id-' + Math.random().toString(36).substring(2, 9),
      isMock: true,
      emailDataPath: emailDetailsPath,
      pdfPath: attachmentPath
    };
  }
}

module.exports = { sendEmailWithAttachment };
