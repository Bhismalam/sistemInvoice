const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { checkPermission } = require('../middleware/rbac');
const productController = require('../controllers/productController');

const router = express.Router();

router.get('/', checkPermission('read:product'), productController.list);
router.get('/:id', checkPermission('read:product'), productController.get);
router.post('/', checkPermission('create:product'), [
  body('name').trim().notEmpty().withMessage('Nama produk harus diisi.'),
  body('price').isNumeric().withMessage('Harga harus angka.')
], validate, productController.create);
router.put('/:id', checkPermission('update:product'), productController.update);
router.delete('/:id', checkPermission('delete:product'), productController.delete);

module.exports = router;
