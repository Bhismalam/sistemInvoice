const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

let isConnected = false;

async function initDB() {
  if (isConnected) {
    console.log('✅ Using existing MongoDB connection');
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in .env file');
  }

  try {
    const db = await mongoose.connect(uri);
    
    isConnected = db.connections[0].readyState;
    console.log('✅ MongoDB connected successfully');
    
    return db.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Dummy getPool for transitional phase so app.js doesn't crash before models are fully rewritten
function getPool() {
  if (!isConnected) throw new Error('Database not initialized. Call initDB() first.');
  return {
    execute: async () => {
      throw new Error('MySQL getPool().execute() is no longer supported. Model needs migration to Mongoose.');
    }
  };
}

module.exports = { initDB, getPool };
