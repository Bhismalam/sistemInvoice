const express = require('express');
const documentController = require('../controllers/documentController');

const router = express.Router();

router.post('/', documentController.create);
router.get('/', documentController.getAll);
router.get('/:id', documentController.getById);
router.put('/:id', documentController.update);
router.patch('/:id/status', documentController.updateStatus);
router.delete('/:id', documentController.delete);

module.exports = router;
