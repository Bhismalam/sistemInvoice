const express = require('express');
const { checkPermission } = require('../middleware/rbac');
const documentController = require('../controllers/documentController');

const router = express.Router();

router.post('/', checkPermission('create:document'), documentController.create);
router.get('/', checkPermission('read:document'), documentController.getAll);
router.get('/:id/tracker', checkPermission('read:document'), documentController.getPaymentTracker);
router.post('/:id/pay', checkPermission('update:document'), documentController.processPayment);
router.post('/:id/cancel', checkPermission('update:document'), documentController.cancelDocument);
router.patch('/:id/status', checkPermission('update:document'), documentController.updateStatus);
router.get('/:id', checkPermission('read:document'), documentController.getById);
router.put('/:id', checkPermission('update:document'), documentController.update);
router.delete('/:id', checkPermission('delete:document'), documentController.delete);

module.exports = router;
