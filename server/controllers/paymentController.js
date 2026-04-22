const midtransClient = require('midtrans-client');
const Document = require('../models/Document');
const Receipt = require('../models/Receipt');
const { getPool } = require('../config/database');

// Create Core API instance
let snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
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

      if (doc.status === 'paid') {
        return res.status(400).json({ success: false, message: 'Dokumen sudah lunas.' });
      }

      const parameter = {
        transaction_details: {
          order_id: `INV-${doc.id}-${Date.now()}`,
          gross_amount: doc.total
        },
        customer_details: {
          first_name: doc.contact_name || 'Customer',
          email: doc.contact_email || 'customer@example.com'
        },
        item_details: doc.items.map(item => ({
          id: item.id,
          price: item.unit_price,
          quantity: item.quantity,
          name: item.description.substring(0, 50)
        }))
      };

      const transaction = await snap.createTransaction(parameter);
      
      res.json({ success: true, data: { token: transaction.token, redirect_url: transaction.redirect_url } });
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
      const docId = parseInt(parts[1]);

      if (transactionStatus == 'capture') {
        if (fraudStatus == 'challenge') {
          // TODO set transaction status on your database to 'challenge'
        } else if (fraudStatus == 'accept') {
          await markAsPaid(docId, statusResponse.gross_amount, statusResponse.payment_type);
        }
      } else if (transactionStatus == 'settlement') {
        await markAsPaid(docId, statusResponse.gross_amount, statusResponse.payment_type);
      } else if (transactionStatus == 'cancel' || transactionStatus == 'deny' || transactionStatus == 'expire') {
        // TODO set transaction status on your database to 'failure'
      } else if (transactionStatus == 'pending') {
        // TODO set transaction status on your database to 'pending'
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false });
    }
  }
};

async function markAsPaid(docId, amount, paymentMethod) {
  // Only update if not already paid
  const pool = getPool();
  const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [docId]);
  const doc = rows[0];
  if (doc && doc.status !== 'paid') {
    await Receipt.create({
      user_id: doc.user_id,
      document_id: doc.id,
      receipt_number: `MDTR-${Date.now()}`,
      amount: parseFloat(amount),
      payment_method: paymentMethod || 'midtrans',
      payment_date: new Date().toISOString().split('T')[0],
      notes: 'Pembayaran otomatis dari Midtrans'
    });
  }
}

module.exports = paymentController;
