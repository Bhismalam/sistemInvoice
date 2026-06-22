const midtransClient = require('midtrans-client');
const Document = require('../models/Document');
const Receipt = require('../models/Receipt');


// Create Core API instance
let snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true', // boolean
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

const paymentController = {
  async createCharge(req, res, next) {
    try {
      const { document_id } = req.body;
      const doc = await Document.findById(document_id, req.user.id);

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
      }

      const transaction = await createMidtransTransaction(doc);
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  },

  async createPublicCharge(req, res, next) {
    try {
      const { payment_link } = req.body;
      if (!payment_link) return res.status(400).json({ success: false, message: 'Payment link required.' });

      const doc = await Document.findByPaymentLink(payment_link);

      if (!doc) {
        return res.status(404).json({ success: false, message: 'Invoice tidak valid.' });
      }

      const transaction = await createMidtransTransaction(doc);
      res.json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  },

  async webhook(req, res, next) {
    try {
      const statusResponse = await snap.transaction.notification(req.body);
      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;

      // Extrapolate doc id from orderId: INV-{doc.id}-{timestamp}
      const parts = orderId.split('-');
      if (parts.length < 3) return res.status(400).send('Invalid Order ID');
      const docId = parts[1];

      let paymentSucceeded = false;
      let paymentType = null;

      if (transactionStatus === 'capture') {
        if (fraudStatus === 'accept') {
          await markAsPaid(docId, statusResponse.gross_amount, statusResponse.payment_type);
          paymentSucceeded = true;
          paymentType = statusResponse.payment_type;
        }
        // fraudStatus === 'challenge': biarkan pending, tangani manual di dashboard Midtrans
      } else if (transactionStatus === 'settlement') {
        await markAsPaid(docId, statusResponse.gross_amount, statusResponse.payment_type);
        paymentSucceeded = true;
        paymentType = statusResponse.payment_type;
      }
      // 'cancel', 'deny', 'expire', 'pending': tidak perlu action untuk sekarang

      // Send notifications to owner after successful payment
      if (paymentSucceeded) {
        try {
          const NotificationService = require('../services/notificationService');
          const docForNotif = await require('mongoose').model('Document').findById(docId)
            .populate('user_id', 'phone email business_name')
            .populate('contact_id', 'name email phone');
          if (docForNotif) {
            const notifDoc = {
              ...docForNotif.toObject(),
              contact_name: docForNotif.contact_id?.name,
              contact_phone: docForNotif.contact_id?.phone,
              contact_email: docForNotif.contact_id?.email,
              business_name: docForNotif.user_id?.business_name
            };
            await NotificationService.notifyMidtransPayment(notifDoc, paymentType || 'Midtrans');
          }
        } catch (notifErr) {
          console.error('Notification after Midtrans payment failed:', notifErr.message);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false });
    }
  },

  async getStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const statusResponse = await snap.transaction.status(orderId);

      // If status is settlement or capture, ensure document is marked as paid
      if (statusResponse.transaction_status === 'settlement' || statusResponse.transaction_status === 'capture') {
        const parts = orderId.split('-');
        if (parts.length >= 3) {
          const docId = parts[1];
          await markAsPaid(docId, statusResponse.gross_amount, statusResponse.payment_type);
        }
      }

      res.json({ success: true, data: statusResponse });
    } catch (error) {
      if (error.httpStatusCode === 404) {
        return res.json({ success: false, message: 'Transaksi tidak ditemukan.' });
      }
      next(error);
    }
  }
};

async function createMidtransTransaction(doc) {
  if (doc.status === 'paid') {
    throw new Error('Dokumen sudah lunas.');
  }

  // RETURN CACHED TOKEN IF EXISTS
  // Note: Simple caching, assumes token is still valid (usually 24h)
  if (doc.midtrans_token) {
    return { token: doc.midtrans_token, cached: true };
  }

  // Ensure items have integer quantities and prices
  const items = doc.items.map(item => ({
    id: `item-${item.id}`,
    price: Math.round(item.unit_price),
    quantity: Math.round(item.quantity) || 1,
    name: item.description.substring(0, 50)
  }));

  // Include Tax as an item line
  if (doc.tax_amount && parseFloat(doc.tax_amount) > 0) {
    items.push({
      id: 'tax',
      price: Math.round(doc.tax_amount),
      quantity: 1,
      name: `PPN (${doc.tax_percent}%)`
    });
  }

  // Include Discount as a negative item line
  if (doc.discount_amount && parseFloat(doc.discount_amount) > 0) {
    items.push({
      id: 'discount',
      price: -Math.round(doc.discount_amount),
      quantity: 1,
      name: `Diskon (${doc.discount_percent}%)`
    });
  }

  const grossAmount = Math.round(doc.total);
  const currentSum = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const diff = grossAmount - currentSum;

  // Final adjustment for rounding differences
  if (diff !== 0) {
    items.push({
      id: 'adjustment',
      price: diff,
      quantity: 1,
      name: 'Penyesuaian Pembulatan'
    });
  }

  const parameter = {
    transaction_details: {
      order_id: `INV-${doc.id}-${Date.now()}`,
      gross_amount: grossAmount
    },
    customer_details: {
      first_name: doc.contact_name || 'Customer',
      email: doc.contact_email || 'customer@example.com'
    },
    item_details: items
  };

  const transaction = await snap.createTransaction(parameter);
  
  // SAVE TOKEN TO DATABASE FOR CACHING
  const mongoose = require('mongoose');
  const DocumentModel = mongoose.model('Document');
  await DocumentModel.updateOne({ _id: doc.id }, { midtrans_token: transaction.token });
  
  return { token: transaction.token, redirect_url: transaction.redirect_url };
}

async function markAsPaid(docId, amount, paymentMethod) {
  const mongoose = require('mongoose');
  const DocumentModel = mongoose.model('Document');
  const doc = await DocumentModel.findById(docId);
  
  if (doc && doc.status !== 'paid') {
    await Receipt.create({
      user_id: doc.user_id,
      document_id: doc._id,
      receipt_number: `MDTR-${Date.now()}`,
      amount: parseFloat(amount),
      payment_method: paymentMethod || 'midtrans',
      payment_date: new Date().toISOString().split('T')[0],
      notes: 'Pembayaran otomatis dari Midtrans'
    });
  }
}

module.exports = paymentController;