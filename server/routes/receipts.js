const express = require('express');
const { checkPermission } = require('../middleware/rbac');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

router.post('/', checkPermission('create:receipt'), receiptController.create);
router.get('/', checkPermission('read:receipt'), receiptController.getAll);
router.get('/:id', checkPermission('read:receipt'), receiptController.getById);
router.delete('/:id', checkPermission('delete:receipt'), receiptController.delete);

module.exports = router;
