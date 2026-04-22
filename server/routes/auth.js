const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Nama harus diisi.'),
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid.'),
  body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter.'),
  body('phone').optional().trim()
], validate, authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid.'),
  body('password').notEmpty().withMessage('Password harus diisi.')
], validate, authController.login);

router.post('/google', authController.googleLogin);

router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

module.exports = router;
