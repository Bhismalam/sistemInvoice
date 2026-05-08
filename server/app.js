const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database is now initialized in server.js
const { authenticate } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const receiptRoutes = require('./routes/receipts');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contacts');
const productRoutes = require('./routes/products');
const debtRoutes = require('./routes/debts');
const { dashboardRouter, reportRouter, settingsRouter } = require('./routes/dashboard');
const documentController = require('./controllers/documentController');

const notificationRoutes = require('./routes/notifications');

const app = express();

// === SECURITY MIDDLEWARE ===
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting (disabled in test mode)
const isTest = process.env.NODE_ENV === 'test';
const noopLimiter = (req, res, next) => next();
const generalLimiter = isTest ? noopLimiter : rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, message: 'Terlalu banyak request. Coba lagi nanti.' } });
const authLimiter = isTest ? noopLimiter : rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' } });

app.use(generalLimiter);

// === BODY PARSING ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// === STATIC FILES (uploads) ===
const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// === ROUTES ===

// Public routes
app.use('/api/auth', authLimiter, authRoutes);
app.get('/api/documents/public/:paymentLink', documentController.getPublic);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'InvoiceFlow API is running!', timestamp: new Date().toISOString() });
});

// Protected routes (require JWT)
app.get('/api/search', authenticate, documentController.search);
app.use('/api/payments', paymentRoutes); // Some routes like /webhook don't require JWT, so paymentRoutes handles its own auth
app.use('/api/documents', authenticate, documentRoutes);
app.use('/api/receipts', authenticate, receiptRoutes);
app.use('/api/contacts', authenticate, contactRoutes);
app.use('/api/products', authenticate, productRoutes);
app.use('/api/debts', authenticate, debtRoutes);
app.use('/api/dashboard', authenticate, dashboardRouter);
app.use('/api/reports', authenticate, reportRouter);
app.use('/api/settings', authenticate, settingsRouter);
app.use('/api/notifications', authenticate, notificationRoutes);

// === BACKGROUND SCHEDULER === (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  const Document = require('./models/Document');
  const PaymentReminder = require('./models/PaymentReminder');

  // Background scheduler for long-running servers (like Render/VPS)
  if (!process.env.VERCEL) {
    setInterval(async () => {
      try {
        const deleted = await Document.cleanupCancelledDocuments();
        const overdue = await Document.markOverdueDocuments();
        const reminders = await PaymentReminder.processPendingReminders();
        if (deleted > 0 || overdue > 0 || reminders > 0) {
          console.log(`⏰ Scheduler: ${deleted} cancelled deleted, ${overdue} marked overdue, ${reminders} reminders processed`);
        }
      } catch (err) {
        console.error('Scheduler error:', err.message);
      }
    }, 60 * 60 * 1000);
  }

  // API Endpoint for Serverless environments (like Vercel Cron)
  app.get('/api/cron', async (req, res) => {
    try {
      const deleted = await Document.cleanupCancelledDocuments();
      const overdue = await Document.markOverdueDocuments();
      const reminders = await PaymentReminder.processPendingReminders();
      res.json({ success: true, deleted, overdue, reminders });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// === ERROR HANDLING ===
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});
app.use(errorHandler);

module.exports = app;
