const express = require('express');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

router.post('/', receiptController.create);
router.get('/', receiptController.getAll);
router.get('/:id', receiptController.getById);
router.delete('/:id', receiptController.delete);

module.exports = router;
