const express = require('express');
const documentController = require('../controllers/documentController');

const router = express.Router();

router.post('/', documentController.create);
router.get('/', documentController.getAll);
router.get('/:id/tracker', documentController.getPaymentTracker);
router.post('/:id/pay', documentController.processPayment);
router.post('/:id/cancel', documentController.cancelDocument);
router.patch('/:id/status', documentController.updateStatus);
router.get('/:id', documentController.getById);
router.put('/:id', documentController.update);
router.delete('/:id', documentController.delete);

module.exports = router;

