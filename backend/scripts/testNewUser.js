const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './env.development' });

// ฟังก์ชันสร้าง user ใหม่สำหรับทดสอบ
const createTestUser = async () => {
  try {
    // เชื่อมต่อ MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love_app');
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // สร้าง user ใหม่
    const newUser = new User({
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      dateOfBirth: new Date('1995-01-01'),
      gender: 'female',
      lookingFor: 'male',
      location: 'กรุงเทพฯ', // เพิ่ม location ที่ required
      coordinates: {
        type: 'Point',
        coordinates: [100.5018, 13.7563] // กรุงเทพฯ
      },
      isActive: true,
      isVerified: true
    });

    await newUser.save();
    console.log(`✅ สร้าง user ใหม่: ${newUser.username}`);

    // ตรวจสอบว่า user มี gpsLocation หรือไม่
    const userWithLocation = await User.findById(newUser._id);
    console.log('📍 gpsLocation:', userWithLocation.gpsLocation);

    // รัน script auto-add GPS location
    const autoAddGpsLocation = require('./autoAddGpsLocation');
    await autoAddGpsLocation();

    // ตรวจสอบอีกครั้ง
    const updatedUser = await User.findById(newUser._id);
    console.log('📍 gpsLocation หลังอัปเดต:', updatedUser.gpsLocation);

    // นับจำนวน user ทั้งหมด
    const totalUsers = await User.countDocuments();
    const usersWithLocation = await User.countDocuments({
      gpsLocation: { $exists: true, $ne: null },
      'gpsLocation.lat': { $exists: true },
      'gpsLocation.lng': { $exists: true }
    });

    console.log(`📈 สถิติ:`);
    console.log(`   - User ทั้งหมด: ${totalUsers} คน`);
    console.log(`   - User ที่มี gpsLocation: ${usersWithLocation} คน`);
    console.log(`   - User ที่ไม่มี gpsLocation: ${totalUsers - usersWithLocation} คน`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    // ปิดการเชื่อมต่อ
    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');
  }
};

// รัน script
if (require.main === module) {
  createTestUser();
}

module.exports = createTestUser;
