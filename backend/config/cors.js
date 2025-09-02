const cors = require('cors');

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // อนุญาตให้ requests ที่ไม่มี origin (เช่น mobile apps, postman)
    if (!origin) return callback(null, true);
    
    // อนุญาต localhost และ production domains
    const allowedOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://sodeclick-front-production.up.railway.app',
      'https://sodeclick-back-production.up.railway.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // อนุญาตให้ส่ง cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight request for 24 hours
};

module.exports = { corsOptions };
