const app = require('./app');
const { initDB } = require('./config/database');

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║     🧾 InvoiceFlow API Server           ║
    ║     Running on http://localhost:${PORT}     ║
    ║     Environment: ${process.env.NODE_ENV || 'development'}          ║
    ╚══════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
