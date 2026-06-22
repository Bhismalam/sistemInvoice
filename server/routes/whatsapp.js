const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Send invoice with PDF attachment via WhatsApp
router.post('/send-invoice/:documentId', whatsappController.sendInvoice);

// Send text-only invoice summary via WhatsApp
router.post('/send-text/:documentId', whatsappController.sendText);

// Check WhatsApp connection status
router.get('/status', whatsappController.getStatus);

// Get WhatsApp send logs (optional documentId filter)
router.get('/logs', whatsappController.getLogs);
router.get('/logs/:documentId', whatsappController.getLogs);

module.exports = router;
