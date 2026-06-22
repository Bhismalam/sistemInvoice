const mongoose = require('mongoose');
const crypto = require('crypto');

const invitationSchema = new mongoose.Schema({
  company_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  email: { type: String, default: null }, // Optional: specific email invitation
  token: { type: String, required: true, unique: true },
  invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending' },
  accepted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  accepted_at: { type: Date, default: null },
  expires_at: { type: Date, required: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

invitationSchema.virtual('id').get(function() { return this._id.toHexString(); });
invitationSchema.set('toJSON', { virtuals: true });
invitationSchema.set('toObject', { virtuals: true });

const Invitation = mongoose.model('Invitation', invitationSchema);

const InvitationModel = {
  /**
   * Creates a new invitation with a unique 8-character token.
   */
  async create(data) {
    const token = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char hex code
    const expires_at = data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default

    const invitation = new Invitation({
      ...data,
      token,
      expires_at
    });
    await invitation.save();
    return invitation;
  },

  /**
   * Finds a valid (pending + not expired) invitation by its token.
   */
  async findByToken(token) {
    const invitation = await Invitation.findOne({
      token: token.toUpperCase(),
      status: 'pending',
      expires_at: { $gt: new Date() }
    }).populate('company_id').populate('role_id');

    return invitation;
  },

  /**
   * Marks an invitation as accepted.
   */
  async accept(invitationId, userId) {
    return Invitation.findByIdAndUpdate(invitationId, {
      status: 'accepted',
      accepted_by: userId,
      accepted_at: new Date()
    }, { new: true });
  },

  /**
   * Lists all invitations for a company.
   */
  async findAll(companyId) {
    return Invitation.find({ company_id: companyId })
      .populate('role_id', 'name')
      .populate('invited_by', 'name email')
      .populate('accepted_by', 'name email')
      .sort({ created_at: -1 });
  },

  /**
   * Revokes a pending invitation.
   */
  async revoke(id, companyId) {
    return Invitation.findOneAndUpdate(
      { _id: id, company_id: companyId, status: 'pending' },
      { status: 'revoked' },
      { new: true }
    );
  }
};

module.exports = { Invitation, ...InvitationModel };
