const mongoose = require('mongoose');
const { initDB } = require('./config/database');
const { User } = require('./models/User');
const ProductModel = require('./models/Product');
const ContactModel = require('./models/Contact');
const Document = require('./models/Document');
const Receipt = require('./models/Receipt');
const PaymentReminder = require('./models/PaymentReminder');
const Report = require('./models/Report');

async function runVerification() {
  console.log('Connecting to database...');
  await initDB();

  // Clean test-specific data to make run repeatable
  console.log('Cleaning existing test users...');
  await User.deleteMany({ email: /@tenant-test\.com$/ });
  
  const ownerId = new mongoose.Types.ObjectId();
  const staffId = new mongoose.Types.ObjectId();
  const companyId = new mongoose.Types.ObjectId();
  const ownerRoleId = new mongoose.Types.ObjectId();
  const staffRoleId = new mongoose.Types.ObjectId();

  console.log('Creating Test Owner and Staff Users...');
  const owner = new User({
    _id: ownerId,
    name: 'Owner User',
    email: 'owner@tenant-test.com',
    phone: '08999999990',
    password_hash: 'dummy',
    company_id: companyId,
    role_id: ownerRoleId
  });
  await owner.save();

  const staff = new User({
    _id: staffId,
    name: 'Staff User',
    email: 'staff@tenant-test.com',
    phone: '08999999991',
    password_hash: 'dummy',
    company_id: companyId,
    role_id: staffRoleId
  });
  await staff.save();

  console.log('1. Verifying Product Scoping & Creation...');
  // Owner creates a product
  const productData = {
    name: 'Premium Coffee Beans',
    description: 'Shared espresso blend',
    unit: 'pack',
    price: 150000,
    stock: 50,
    category: 'Coffee',
    user_id: ownerId,
    company_id: companyId
  };
  const product = new ProductModel.Product(productData);
  await product.save();
  console.log(`Product created by Owner: ${product.name} (ID: ${product.id})`);

  // Staff retrieves all products
  const staffProducts = await ProductModel.findAll(staffId, {}, companyId);
  console.log(`Staff retrieved ${staffProducts.data.length} products (Should be 1):`, staffProducts.data.map(p => p.name));
  
  if (staffProducts.data.length !== 1 || staffProducts.data[0].name !== 'Premium Coffee Beans') {
    throw new Error('Verification failed: Staff did not find Owner\'s product');
  }

  console.log('2. Verifying Contact Scoping & Creation...');
  // Owner creates a contact
  const contactData = {
    user_id: ownerId,
    company_id: companyId,
    type: 'customer',
    name: 'PT Kopi Sukses',
    email: 'kopi@sukses.com',
    phone: '021888888'
  };
  const contact = new ContactModel.Contact(contactData);
  await contact.save();
  console.log(`Contact created by Owner: ${contact.name} (ID: ${contact.id})`);

  // Staff retrieves all contacts
  const staffContacts = await ContactModel.findAll(staffId, {}, companyId);
  console.log(`Staff retrieved ${staffContacts.data.length} contacts (Should be 1):`, staffContacts.data.map(c => c.name));

  if (staffContacts.data.length !== 1 || staffContacts.data[0].name !== 'PT Kopi Sukses') {
    throw new Error('Verification failed: Staff did not find Owner\'s contact');
  }

  console.log('3. Verifying Document (Invoice) Generation & Scope...');
  // Staff creates an invoice using the shared product and contact
  const invoiceData = {
    user_id: staffId,
    company_id: companyId,
    contact_id: contact._id,
    transaction_type: 'sales',
    document_type: 'invoice',
    document_number: `INV-VERIFY-${Date.now()}`,
    status: 'sent',
    issue_date: '2026-05-01',
    due_date: '2026-06-01',
    subtotal: 150000,
    tax_percent: 0,
    tax_amount: 0,
    total: 150000,
    items: [
      {
        product_id: product._id,
        description: product.name,
        quantity: 1,
        unit_price: product.price,
        total: product.price
      }
    ]
  };

  const invoice = await Document.create(invoiceData);
  console.log(`Invoice created by Staff: ${invoice.document_number} (ID: ${invoice.id})`);

  // Verify product stock auto-decremented (Staff created invoice, product was Owner's but same company)
  const updatedProduct = await ProductModel.findById(product._id, ownerId, companyId);
  console.log(`Initial stock: 50. Updated stock: ${updatedProduct.stock} (Should be 49)`);

  if (updatedProduct.stock !== 49) {
    throw new Error(`Verification failed: Stock not properly decremented for shared company product. Expected 49, got ${updatedProduct.stock}`);
  }

  console.log('4. Verifying Receipts & Payment Scopes...');
  // Owner creates a receipt for staff's invoice
  const receiptData = {
    user_id: ownerId,
    company_id: companyId,
    document_id: invoice._id,
    receipt_number: `REC-VERIFY-${Date.now()}`,
    amount: 150000,
    payment_method: 'transfer',
    payment_date: new Date(),
    notes: 'Paid in full'
  };
  const receipt = await Receipt.create(receiptData);
  console.log(`Receipt created by Owner: ${receipt.receipt_number} (ID: ${receipt.id})`);

  // Check that invoice auto-updated to paid
  const updatedInvoice = await Document.findById(invoice._id, staffId, companyId);
  console.log(`Invoice status: ${updatedInvoice.status} (Should be paid)`);
  if (updatedInvoice.status !== 'paid') {
    throw new Error(`Verification failed: Invoice not automatically paid. Expected "paid", got "${updatedInvoice.status}"`);
  }

  // Staff retrieves receipts
  const staffReceipts = await Receipt.findAll(staffId, {}, companyId);
  console.log(`Staff retrieved ${staffReceipts.data.length} receipts (Should be 1):`, staffReceipts.data.map(r => r.receipt_number));
  if (staffReceipts.data.length !== 1) {
    throw new Error('Verification failed: Staff did not find Owner\'s receipt');
  }

  console.log('5. Verifying Report Scoping...');
  // Get dashboard stats for Owner and Staff
  const ownerStats = await Report.getDashboardStats(ownerId, companyId);
  const staffStats = await Report.getDashboardStats(staffId, companyId);
  console.log(`Owner stats total revenue: ${ownerStats.total_revenue} (Should be 150000)`);
  console.log(`Staff stats total revenue: ${staffStats.total_revenue} (Should be 150000)`);

  if (ownerStats.total_revenue !== 150000 || staffStats.total_revenue !== 150000) {
    throw new Error('Verification failed: Dashboard statistics not fully shared across the company');
  }

  console.log('Cleaning up verification data...');
  await User.deleteOne({ _id: ownerId });
  await User.deleteOne({ _id: staffId });
  await ProductModel.Product.deleteOne({ _id: product._id });
  await ContactModel.Contact.deleteOne({ _id: contact._id });
  await mongoose.model('Document').deleteOne({ _id: invoice._id });
  await Receipt.Receipt.deleteOne({ _id: receipt._id });

  console.log('🎉 ALL MULTI-TENANCY VERIFICATIONS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runVerification().catch(err => {
  console.error('❌ Verification failed with error:', err);
  process.exit(1);
});
