const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  password_hash: { type: String, required: true },
  business_name: { type: String, default: '' },
  business_logo: { type: String, default: null },
  business_address: { type: String, default: null },
  npwp: { type: String, default: '' },
  invoice_prefix: { type: String, default: 'INV' },
  invoice_counter: { type: Number, default: 0 },
  default_tax_percent: { type: Number, default: 11 },
  notifications_read_at: { type: Date, default: Date.now },
  refresh_tokens: [{
    token: String,
    expires_at: Date
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual for 'id' so frontend doesn't break
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
userSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password_hash;
    delete ret.refresh_tokens;
    return ret;
  }
});
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

const UserModel = {
  async create(data) {
    const user = new User(data);
    await user.save();
    return user;
  },

  async findByEmail(email) {
    return User.findOne({ email });
  },

  async findById(id) {
    return User.findById(id);
  },

  async update(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true });
  },

  async saveRefreshToken(userId, token, expiresAt) {
    await User.findByIdAndUpdate(userId, {
      $push: { refresh_tokens: { token, expires_at: expiresAt } }
    });
  },

  async verifyRefreshToken(token) {
    const user = await User.findOne({ 'refresh_tokens.token': token });
    if (!user) return null;
    const tokenRecord = user.refresh_tokens.find(rt => rt.token === token);
    if (new Date() > tokenRecord.expires_at) return null;
    return user;
  },

  async clearRefreshToken(userId, token) {
    await User.findByIdAndUpdate(userId, {
      $pull: { refresh_tokens: { token } }
    });
  },

  async updateReadTimestamp(userId) {
    await User.findByIdAndUpdate(userId, { notifications_read_at: new Date() });
  }
};

module.exports = { User, ...UserModel };
