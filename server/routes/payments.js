const express = require('express');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/charge', authenticate, paymentController.createCharge);
router.post('/charge-public', paymentController.createPublicCharge);
router.get('/status/:orderId', authenticate, paymentController.getStatus);
router.post('/webhook', paymentController.webhook);

module.exports = router;
