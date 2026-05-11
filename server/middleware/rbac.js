const { Role } = require('../models/Role');

/**
 * Middleware to check if user has a specific permission.
 * Usage: router.post('/products', authenticate, checkPermission('create:product'), controller.create)
 */
function checkPermission(...requiredPermissions) {
  return async (req, res, next) => {
    try {
      // If user has no role (legacy user without company), allow access
      if (!req.user.role_id) {
        return next();
      }

      const role = await Role.findById(req.user.role_id);
      if (!role) {
        return res.status(403).json({
          success: false,
          message: 'Role tidak ditemukan. Hubungi admin perusahaan Anda.'
        });
      }

      // Owner always has full access regardless of permission array
      if (role.name === 'Owner') {
        return next();
      }

      // Check if the role has ALL required permissions
      const hasPermission = requiredPermissions.every(perm => role.permissions.includes(perm));
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk melakukan tindakan ini.'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user is a company Owner.
 */
function requireOwner(req, res, next) {
  if (!req.user.company_id) {
    return res.status(403).json({
      success: false,
      message: 'Anda belum tergabung dalam perusahaan manapun.'
    });
  }

  const CompanyModel = require('../models/Company');
  CompanyModel.findById(req.user.company_id).then(company => {
    if (!company) {
      return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });
    }
    if (company.owner_id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Hanya pemilik perusahaan yang dapat melakukan ini.'
      });
    }
    next();
  }).catch(next);
}

module.exports = { checkPermission, requireOwner };
