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
  body('phone').optional().trim(),
  body('company_name').optional().trim(),
  body('invite_token').optional().trim()
], validate, authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid.'),
  body('password').notEmpty().withMessage('Password harus diisi.')
], validate, authController.login);

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid.')
], validate, authController.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token harus diisi.'),
  body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter.')
], validate, authController.resetPassword);

router.post('/google', authController.googleLogin);

router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);

// Validate invitation token (public - no auth needed)
router.get('/invite/:token', authController.validateInvite);

// Profile management (authenticated)
router.put('/update-profile', authenticate, [
  body('name').optional().trim(),
  body('phone').optional().trim()
], validate, authController.updateProfile);

router.put('/change-password', authenticate, [
  body('old_password').notEmpty().withMessage('Password lama harus diisi.'),
  body('new_password').isLength({ min: 8 }).withMessage('Password baru minimal 8 karakter.')
], validate, authController.changePassword);

module.exports = router;
