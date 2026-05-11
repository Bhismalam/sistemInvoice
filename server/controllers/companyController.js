const CompanyModel = require('../models/Company');
const RoleModel = require('../models/Role');
const InvitationModel = require('../models/Invitation');
const { User } = require('../models/User');

const companyController = {
  // === COMPANY PROFILE ===
  async getCompany(req, res, next) {
    try {
      const company = await CompanyModel.findById(req.user.company_id);
      if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });
      res.json({ success: true, data: company });
    } catch (error) { next(error); }
  },

  async updateCompany(req, res, next) {
    try {
      const company = await CompanyModel.update(req.user.company_id, req.body);
      res.json({ success: true, message: 'Pengaturan perusahaan berhasil disimpan!', data: company });
    } catch (error) { next(error); }
  },

  // === MEMBERS ===
  async getMembers(req, res, next) {
    try {
      const members = await User.find({ company_id: req.user.company_id })
        .populate('role_id', 'name')
        .select('-password_hash -refresh_tokens');
      
      const company = await CompanyModel.findById(req.user.company_id);

      const data = members.map(m => {
        const member = m.toObject();
        return {
          ...member,
          id: member._id.toString(),
          role_name: member.role_id ? member.role_id.name : 'Tanpa Role',
          is_owner: company ? company.owner_id.toString() === member._id.toString() : false
        };
      });

      res.json({ success: true, data });
    } catch (error) { next(error); }
  },

  async updateMemberRole(req, res, next) {
    try {
      const { memberId } = req.params;
      const { role_id } = req.body;

      // Verify the member belongs to the same company
      const member = await User.findOne({ _id: memberId, company_id: req.user.company_id });
      if (!member) return res.status(404).json({ success: false, message: 'Anggota tidak ditemukan.' });

      // Verify role belongs to the same company
      const role = await RoleModel.findById(role_id, req.user.company_id);
      if (!role) return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });

      // Prevent changing owner's role
      const company = await CompanyModel.findById(req.user.company_id);
      if (company.owner_id.toString() === memberId) {
        return res.status(400).json({ success: false, message: 'Tidak dapat mengubah role pemilik perusahaan.' });
      }

      await User.findByIdAndUpdate(memberId, { role_id });
      res.json({ success: true, message: 'Role anggota berhasil diubah.' });
    } catch (error) { next(error); }
  },

  async removeMember(req, res, next) {
    try {
      const { memberId } = req.params;

      // Prevent removing the owner
      const company = await CompanyModel.findById(req.user.company_id);
      if (company.owner_id.toString() === memberId) {
        return res.status(400).json({ success: false, message: 'Pemilik perusahaan tidak dapat dihapus.' });
      }

      const member = await User.findOne({ _id: memberId, company_id: req.user.company_id });
      if (!member) return res.status(404).json({ success: false, message: 'Anggota tidak ditemukan.' });

      // Remove company and role association
      await User.findByIdAndUpdate(memberId, { company_id: null, role_id: null });
      res.json({ success: true, message: 'Anggota berhasil dihapus dari perusahaan.' });
    } catch (error) { next(error); }
  },

  // === ROLES (RBAC) ===
  async getRoles(req, res, next) {
    try {
      const roles = await RoleModel.findAll(req.user.company_id);
      res.json({ success: true, data: roles });
    } catch (error) { next(error); }
  },

  async createRole(req, res, next) {
    try {
      const role = await RoleModel.create({
        ...req.body,
        company_id: req.user.company_id
      });
      res.status(201).json({ success: true, message: 'Role berhasil dibuat!', data: role });
    } catch (error) { next(error); }
  },

  async updateRole(req, res, next) {
    try {
      const role = await RoleModel.update(req.params.roleId, req.user.company_id, req.body);
      if (!role) return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });
      res.json({ success: true, message: 'Role berhasil diperbarui!', data: role });
    } catch (error) { next(error); }
  },

  async deleteRole(req, res, next) {
    try {
      // Check if any member is using this role
      const membersWithRole = await User.countDocuments({
        company_id: req.user.company_id,
        role_id: req.params.roleId
      });
      if (membersWithRole > 0) {
        return res.status(400).json({
          success: false,
          message: `Role ini masih digunakan oleh ${membersWithRole} anggota. Pindahkan mereka ke role lain terlebih dahulu.`
        });
      }
      await RoleModel.delete(req.params.roleId, req.user.company_id);
      res.json({ success: true, message: 'Role berhasil dihapus.' });
    } catch (error) { next(error); }
  },

  async getPermissions(req, res, next) {
    try {
      res.json({ success: true, data: RoleModel.ALL_PERMISSIONS });
    } catch (error) { next(error); }
  },

  // === INVITATIONS ===
  async createInvitation(req, res, next) {
    try {
      const { email, role_id } = req.body;

      // Validate role belongs to company
      const role = await RoleModel.findById(role_id, req.user.company_id);
      if (!role) return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });

      // Check if email already in company
      if (email) {
        const existingMember = await User.findOne({ email, company_id: req.user.company_id });
        if (existingMember) {
          return res.status(400).json({ success: false, message: 'Email ini sudah terdaftar di perusahaan Anda.' });
        }
      }

      const invitation = await InvitationModel.create({
        company_id: req.user.company_id,
        role_id,
        email: email || null,
        invited_by: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Undangan berhasil dibuat!',
        data: {
          token: invitation.token,
          expires_at: invitation.expires_at,
          invite_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/register?invite=${invitation.token}`
        }
      });
    } catch (error) { next(error); }
  },

  async getInvitations(req, res, next) {
    try {
      const invitations = await InvitationModel.findAll(req.user.company_id);
      res.json({ success: true, data: invitations });
    } catch (error) { next(error); }
  },

  async revokeInvitation(req, res, next) {
    try {
      const invitation = await InvitationModel.revoke(req.params.invitationId, req.user.company_id);
      if (!invitation) return res.status(404).json({ success: false, message: 'Undangan tidak ditemukan.' });
      res.json({ success: true, message: 'Undangan berhasil dibatalkan.' });
    } catch (error) { next(error); }
  }
};

module.exports = companyController;
