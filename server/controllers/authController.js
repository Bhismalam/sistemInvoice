const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, RefreshToken } = require('../models/User');

function generateAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
}

const authController = {
  async register(req, res, next) {
    try {
      const { name, email, phone, password } = req.body;
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email sudah terdaftar.' });
      }
      const password_hash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, phone, password_hash });
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' '); // MySQL format
      await RefreshToken.create(user.id, refreshToken, expiresAtStr);
      
      res.status(201).json({ success: true, message: 'Registrasi berhasil!', data: { user, accessToken, refreshToken } });
    } catch (error) { next(error); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Email atau password salah.' });
      }
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' '); // MySQL format
      await RefreshToken.create(user.id, refreshToken, expiresAtStr);
      
      const userData = await User.findById(user.id);
      res.json({ success: true, message: 'Login berhasil!', data: { user: userData, accessToken, refreshToken } });
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
      if (!user) {
        const password_hash = await bcrypt.hash(Math.random().toString(36).slice(-8), 12);
        user = await User.create({ name, email, phone: '', password_hash });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' '); // MySQL format
      await RefreshToken.create(user.id, refreshToken, expiresAtStr);
      
      const userData = await User.findById(user.id);
      res.json({ success: true, message: 'Google Login berhasil!', data: { user: userData, accessToken, refreshToken } });
    } catch (error) { next(error); }
  },

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token diperlukan.' });
      }
      const stored = await RefreshToken.find(refreshToken);
      if (!stored) {
        return res.status(403).json({ success: false, message: 'Refresh token tidak valid.' });
      }
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(403).json({ success: false, message: 'User tidak ditemukan.' });
        const newAccessToken = generateAccessToken(user);
        res.json({ success: true, data: { accessToken: newAccessToken } });
      } catch (e) {
        await RefreshToken.delete(refreshToken);
        return res.status(403).json({ success: false, message: 'Refresh token kadaluarsa.' });
      }
    } catch (error) { next(error); }
  },

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await RefreshToken.delete(refreshToken);
      res.json({ success: true, message: 'Logout berhasil.' });
    } catch (error) { next(error); }
  },

  async me(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
      res.json({ success: true, data: user });
    } catch (error) { next(error); }
  }
};

module.exports = authController;
