const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.get('/', contactController.list);
router.get('/:id', contactController.get);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Nama kontak harus diisi.'),
  body('type').isIn(['customer', 'supplier']).withMessage('Tipe harus customer atau supplier.')
], validate, contactController.create);
router.put('/:id', contactController.update);
router.delete('/:id', contactController.delete);

module.exports = router;
