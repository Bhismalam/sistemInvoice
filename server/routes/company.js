const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const upload = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const { checkPermission, requireOwner } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// === Company Profile ===
router.get('/', companyController.getCompany);
router.put('/', checkPermission('update:company_settings'), companyController.updateCompany);
router.post('/logo', checkPermission('update:company_settings'), upload.single('logo'), companyController.uploadLogo);
router.delete('/logo', checkPermission('update:company_settings'), companyController.deleteLogo);

// === Members ===
router.get('/members', companyController.getMembers);
router.put('/members/:memberId/role', checkPermission('update:members'), companyController.updateMemberRole);
router.delete('/members/:memberId', checkPermission('delete:members'), companyController.removeMember);

// === Roles (RBAC) ===
router.get('/roles', companyController.getRoles);
router.get('/permissions', companyController.getPermissions);
router.post('/roles', checkPermission('create:roles'), companyController.createRole);
router.put('/roles/:roleId', checkPermission('update:roles'), companyController.updateRole);
router.delete('/roles/:roleId', checkPermission('delete:roles'), companyController.deleteRole);

// === Invitations ===
router.get('/invitations', checkPermission('read:members'), companyController.getInvitations);
router.post('/invitations', checkPermission('create:members'), companyController.createInvitation);
router.delete('/invitations/:invitationId', checkPermission('delete:members'), companyController.revokeInvitation);

module.exports = router;
