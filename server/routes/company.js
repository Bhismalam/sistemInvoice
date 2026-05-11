const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate } = require('../middleware/auth');
const { checkPermission, requireOwner } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// === Company Profile ===
router.get('/', companyController.getCompany);
router.put('/', checkPermission('manage:company_settings'), companyController.updateCompany);

// === Members ===
router.get('/members', companyController.getMembers);
router.put('/members/:memberId/role', checkPermission('manage:members'), companyController.updateMemberRole);
router.delete('/members/:memberId', checkPermission('manage:members'), companyController.removeMember);

// === Roles (RBAC) ===
router.get('/roles', companyController.getRoles);
router.get('/permissions', companyController.getPermissions);
router.post('/roles', checkPermission('manage:roles'), companyController.createRole);
router.put('/roles/:roleId', checkPermission('manage:roles'), companyController.updateRole);
router.delete('/roles/:roleId', checkPermission('manage:roles'), companyController.deleteRole);

// === Invitations ===
router.get('/invitations', checkPermission('manage:members'), companyController.getInvitations);
router.post('/invitations', checkPermission('manage:members'), companyController.createInvitation);
router.delete('/invitations/:invitationId', checkPermission('manage:members'), companyController.revokeInvitation);

module.exports = router;
