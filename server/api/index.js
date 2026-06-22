const app = require('../app');
const { initDB } = require('../config/database');

// Entri point khusus untuk lingkungan Serverless Vercel
// Vercel akan mengeksekusi fungsi ini untuk setiap request
module.exports = async (req, res) => {
  // Pastikan koneksi ke MongoDB sudah tersambung sebelum memproses request
  await initDB();
  return app(req, res);
};
