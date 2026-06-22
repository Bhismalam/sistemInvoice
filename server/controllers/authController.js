const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const User = UserModel;
const CompanyModel = require('../models/Company');
const RoleModel = require('../models/Role');
const InvitationModel = require('../models/Invitation');

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, company_id: user.company_id || null, role_id: user.role_id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

const authController = {
  /**
   * Register - supports both "Create Company" and "Join Company" flows.
   * If `invite_token` is provided, user joins an existing company.
   * Otherwise, user creates a new company.
   */
  async register(req, res, next) {
    try {
      const { name, email, phone, password, company_name, invite_token } = req.body;

      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email sudah terdaftar.' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      let user, company;

      if (invite_token) {
        // === JOIN COMPANY FLOW ===
        const invitation = await InvitationModel.findByToken(invite_token);
        if (!invitation) {
          return res.status(400).json({ success: false, message: 'Kode undangan tidak valid atau sudah kadaluarsa.' });
        }

        user = await User.create({
          name, email, phone, password_hash,
          company_id: invitation.company_id._id,
          role_id: invitation.role_id._id
        });

        await InvitationModel.accept(invitation._id, user._id);
        company = invitation.company_id;
      } else {
        // === CREATE COMPANY FLOW ===
        user = await User.create({ name, email, phone, password_hash });

        // Create a new company
        company = await CompanyModel.create({
          name: company_name || `Bisnis ${name}`,
          owner_id: user._id
        });

        // Create default roles (Owner & Staff)
        const { ownerRole } = await RoleModel.createDefaultRoles(company._id);

        // Assign Owner role to the user
        user = await User.update(user._id, {
          company_id: company._id,
          role_id: ownerRole._id
        });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await User.saveRefreshToken(user.id, refreshToken, expiresAt);

      res.status(201).json({
        success: true,
        message: invite_token ? `Berhasil bergabung ke ${company.name}!` : 'Registrasi berhasil!',
        data: { user, company, accessToken, refreshToken }
      });
    } catch (error) { next(error); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      let user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }

      // === AUTO-MIGRATE: Create company for legacy users who don't have one ===
      let company = null;
      if (!user.company_id) {
        console.log(`🔄 Auto-migrating user ${user.email} to multi-tenant...`);
        company = await CompanyModel.create({
          name: user.business_name || `Bisnis ${user.name}`,
          owner_id: user._id,
          address: user.business_address || '',
          npwp: user.npwp || '',
          invoice_prefix: user.invoice_prefix || 'INV',
          invoice_counter: user.invoice_counter || 0,
          default_tax_percent: user.default_tax_percent || 11
        });
        const { ownerRole } = await RoleModel.createDefaultRoles(company._id);
        user = await User.update(user._id, {
          company_id: company._id,
          role_id: ownerRole._id
        });

        // Also tag existing data with company_id
        const mongoose = require('mongoose');
        const models = ['Document', 'Contact', 'Product', 'Receipt', 'ActivityLog', 'PaymentReminder'];
        for (const modelName of models) {
          try {
            const Model = mongoose.model(modelName);
            await Model.updateMany(
              { user_id: user._id, $or: [{ company_id: null }, { company_id: { $exists: false } }] },
              { company_id: company._id }
            );
          } catch (e) { /* model may not exist yet, skip */ }
        }
        console.log(`✅ User ${user.email} migrated to company: ${company.name}`);
      } else {
        company = await CompanyModel.findById(user.company_id);
      }

      // Re-fetch user to get updated data
      const userData = await User.findById(user._id || user.id);

      const accessToken = generateAccessToken(userData);
      const refreshToken = generateRefreshToken(userData);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await User.saveRefreshToken(userData.id, refreshToken, expiresAt);

      res.json({ success: true, message: 'Login berhasil!', data: { user: userData, company, accessToken, refreshToken } });
    } catch (error) { next(error); }
  },

  async googleLogin(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token diperlukan.' });

      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      const email = payload.email;
      const name = payload.name;

      let user = await User.findByEmail(email);
      let company = null;

      if (!user) {
        const password_hash = await bcrypt.hash(Math.random().toString(36).slice(-8), 12);
        user = await User.create({ name, email, phone: '', password_hash });

        // Auto-create company for new Google users
        company = await CompanyModel.create({
          name: `Bisnis ${name}`,
          owner_id: user._id
        });
        const { ownerRole } = await RoleModel.createDefaultRoles(company._id);
        user = await User.update(user._id, {
          company_id: company._id,
          role_id: ownerRole._id
        });
      } else {
        // Auto-migrate existing Google user without company
        if (!user.company_id) {
          company = await CompanyModel.create({
            name: user.business_name || `Bisnis ${user.name}`,
            owner_id: user._id
          });
          const { ownerRole } = await RoleModel.createDefaultRoles(company._id);
          user = await User.update(user._id, {
            company_id: company._id,
            role_id: ownerRole._id
          });
        } else {
          company = await CompanyModel.findById(user.company_id);
        }
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await User.saveRefreshToken(user.id, refreshToken, expiresAt);

      const userData = await User.findById(user.id);
      res.json({ success: true, message: 'Google Login berhasil!', data: { user: userData, company, accessToken, refreshToken } });
    } catch (error) { next(error); }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token diperlukan.' });
      }
      const userWithToken = await User.verifyRefreshToken(refreshToken);
      if (!userWithToken) {
        return res.status(403).json({ success: false, message: 'Refresh token tidak valid atau sudah kadaluarsa.' });
      }
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(403).json({ success: false, message: 'User tidak ditemukan.' });
        const newAccessToken = generateAccessToken(user);
        res.json({ success: true, data: { accessToken: newAccessToken } });
      } catch (e) {
        await User.clearRefreshToken(userWithToken.id, refreshToken);
        return res.status(403).json({ success: false, message: 'Refresh token kadaluarsa.' });
      }
    } catch (error) { next(error); }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        try {
            const userWithToken = await User.verifyRefreshToken(refreshToken);
            if(userWithToken) {
                await User.clearRefreshToken(userWithToken.id, refreshToken);
            }
        } catch(e) {}
      }
      res.json({ success: true, message: 'Logout berhasil.' });
    } catch (error) { next(error); }
  },

  async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

      let company = null;
      let role = null;
      if (user.company_id) {
        company = await CompanyModel.findById(user.company_id);
      }
      if (user.role_id) {
        const { Role } = require('../models/Role');
        role = await Role.findById(user.role_id);
      }

      res.json({ success: true, data: { user, company, role } });
    } catch (error) { next(error); }
  },

  /**
   * Validate an invitation token (used by frontend to auto-fill invite form).
   */
  async validateInvite(req, res, next) {
    try {
      const { token } = req.params;
      const invitation = await InvitationModel.findByToken(token);
      if (!invitation) {
        return res.status(404).json({ success: false, message: 'Kode undangan tidak valid atau sudah kadaluarsa.' });
      }
      res.json({
        success: true,
        data: {
          company_name: invitation.company_id.name,
          role_name: invitation.role_id.name,
          email: invitation.email
        }
      });
    } catch (error) { next(error); }
  },

  /**
   * Update user profile (name, phone).
   */
  async updateProfile(req, res, next) {
    try {
      const { name, phone } = req.body;
      const user = await User.update(req.user.id, { name, phone });
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
      res.json({ success: true, message: 'Profil berhasil disimpan!', data: user });
    } catch (error) { next(error); }
  },

  /**
   * Change user password.
   */
  async changePassword(req, res, next) {
    try {
      const { old_password, new_password } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

      const valid = await bcrypt.compare(old_password, user.password_hash);
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Password lama salah.' });
      }

      const password_hash = await bcrypt.hash(new_password, 12);
      await User.update(req.user.id, { password_hash });
      res.json({ success: true, message: 'Password berhasil diganti!' });
    } catch (error) { next(error); }
  },

  /**
   * Request a password reset OTP (forgot password).
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const userObj = await User.User.findOne({ email });
      if (!userObj) {
        // Return success to avoid user enumeration
        return res.json({ success: true, message: 'Kode OTP pemulihan telah dikirim ke email Anda!' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 900000); // 15 minutes expiration

      userObj.otp_code = otp;
      userObj.otp_expires = expires;
      await userObj.save();

      // Return the OTP in development response so the client can simulate it locally
      res.json({
        success: true,
        message: 'Kode OTP pemulihan telah dikirim ke email Anda!',
        dev_otp: otp
      });
    } catch (error) { next(error); }
  },

  /**
   * Verify the 6-digit OTP and generate a temporary reset token.
   */
  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      const userObj = await User.User.findOne({
        email,
        otp_code: otp,
        otp_expires: { $gt: new Date() }
      });

      if (!userObj) {
        return res.status(400).json({ success: false, message: 'Kode OTP tidak valid atau sudah kadaluarsa.' });
      }

      // Generate a highly secure temporary token valid for 15 minutes
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 900000); // 15 minutes

      userObj.otp_code = null;
      userObj.otp_expires = null;
      userObj.reset_password_token = token;
      userObj.reset_password_expires = expires;
      await userObj.save();

      res.json({
        success: true,
        message: 'OTP berhasil diverifikasi!',
        reset_token: token
      });
    } catch (error) { next(error); }
  },

  /**
   * Reset the password using the temporary token.
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      const userObj = await User.User.findOne({
        reset_password_token: token,
        reset_password_expires: { $gt: new Date() }
      });

      if (!userObj) {
        return res.status(400).json({ success: false, message: 'Sesi reset password tidak valid atau sudah kadaluarsa.' });
      }

      const password_hash = await bcrypt.hash(password, 12);
      userObj.password_hash = password_hash;
      userObj.reset_password_token = null;
      userObj.reset_password_expires = null;
      await userObj.save();

      res.json({ success: true, message: 'Password Anda berhasil diatur ulang. Silakan login dengan password baru!' });
    } catch (error) { next(error); }
  }
};

module.exports = authController;
