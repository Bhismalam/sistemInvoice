const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { checkPermission } = require('../middleware/rbac');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.get('/', checkPermission('read:contact'), contactController.list);
router.get('/:id', checkPermission('read:contact'), contactController.get);
router.post('/', checkPermission('create:contact'), [
  body('name').trim().notEmpty().withMessage('Nama kontak harus diisi.'),
  body('type').isIn(['customer', 'supplier']).withMessage('Tipe harus customer atau supplier.')
], validate, contactController.create);
router.put('/:id', checkPermission('update:contact'), contactController.update);
router.delete('/:id', checkPermission('delete:contact'), contactController.delete);

module.exports = router;
