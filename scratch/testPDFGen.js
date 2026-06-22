require('dotenv').config({ path: 'server/.env' });
const mongoose = require('mongoose');
const { Document } = require('./server/models/Document');
const { generateInvoicePDF } = require('./server/utils/pdfService');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Fetch one document from DB
    const DocumentModelDB = mongoose.model('Document');
    const doc = await DocumentModelDB.findOne().populate('contact_id');
    if (!doc) {
      console.log('No documents found in database. Cannot run test.');
      mongoose.disconnect();
      return;
    }

    // Convert using findById implementation to map items
    const docData = await Document.findById(doc._id, doc.user_id, doc.company_id);
    console.log('Found Document:', docData.document_number);

    console.log('Generating PDF...');
    const pdfBuffer = await generateInvoicePDF(docData);
    
    const outputPath = path.resolve(__dirname, 'test_invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF saved successfully to: ${outputPath}`);
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run();
