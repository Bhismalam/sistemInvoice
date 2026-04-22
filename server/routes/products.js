const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const productController = require('../controllers/productController');

const router = express.Router();

router.get('/', productController.list);
router.get('/:id', productController.get);
router.post('/', [
  body('name').trim().notEmpty().withMessage('Nama produk harus diisi.'),
  body('price').isNumeric().withMessage('Harga harus angka.')
], validate, productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.delete);

module.exports = router;
