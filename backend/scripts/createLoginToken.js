const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick';

async function createLoginToken() {
  try {
    // เชื่อมต่อฐานข้อมูล
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ค้นหาผู้ใช้ที่มีอยู่
    const users = await User.find({ isActive: true }).limit(5);
    
    if (users.length === 0) {
      console.log('❌ No active users found');
      return;
    }

    console.log(`📊 Found ${users.length} active users`);

    // สร้าง token สำหรับแต่ละผู้ใช้
    users.forEach((user, index) => {
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   Name: ${user.displayName || user.firstName || user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Token: ${token}`);
      console.log(`   User ID: ${user._id}`);
      
      // แสดงข้อมูลสำหรับใช้ใน frontend
      console.log(`\n📋 Frontend Usage:`);
      console.log(`   localStorage.setItem('token', '${token}');`);
      console.log(`   localStorage.setItem('user', JSON.stringify(${JSON.stringify({
        _id: user._id,
        displayName: user.displayName || user.firstName || user.username,
        email: user.email,
        username: user.username,
        role: user.role
      })}));`);
    });

    // แสดงตัวอย่างการทดสอบ API
    console.log(`\n🧪 API Testing:`);
    console.log(`   curl -H "Authorization: Bearer ${users[0]._id ? jwt.sign({ id: users[0]._id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' }) : 'TOKEN_HERE'}" http://localhost:5000/api/matching/ai-matches`);

  } catch (error) {
    console.error('❌ Error creating login token:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// รันสคริปต์
createLoginToken();
