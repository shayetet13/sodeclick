const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './env.development' });

// เชื่อมต่อ MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createSuperAdmin() {
  try {
    console.log('🔧 กำลังสร้าง SuperAdmin...');

    // ตรวจสอบว่ามี SuperAdmin อยู่แล้วหรือไม่
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️  มี SuperAdmin อยู่แล้ว:', existingSuperAdmin.username);
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('🔑 Role:', existingSuperAdmin.role);
      return;
    }

    // สร้าง SuperAdmin ใหม่
    const superAdminData = {
      username: 'superadmin',
      email: 'superadmin@love-app.com',
      password: 'SuperAdmin123!',
      firstName: 'Super',
      lastName: 'Admin',
      displayName: 'Super Admin',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'other',
      lookingFor: 'both',
      location: 'Thailand',
      role: 'superadmin',
      membership: {
        tier: 'platinum',
        startDate: new Date(),
        endDate: null // ไม่หมดอายุ
      },
      isActive: true,
      isVerified: true,
      isBanned: false,
      dailyUsage: {
        chatCount: 0,
        imageUploadCount: 0,
        videoUploadCount: 0,
        lastReset: new Date()
      }
    };

    const superAdmin = new User(superAdminData);
    await superAdmin.save();

    console.log('✅ สร้าง SuperAdmin สำเร็จ!');
    console.log('👤 Username:', superAdmin.username);
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password:', superAdminData.password);
    console.log('🔐 Role:', superAdmin.role);
    console.log('💎 Tier:', superAdmin.membership.tier);
    console.log('');
    console.log('🚀 สิทธิ์พิเศษของ SuperAdmin:');
    console.log('   • สร้างห้องแชทได้ไม่จำกัด');
    console.log('   • ส่งข้อความได้ไม่จำกัด');
    console.log('   • อัปโหลดรูปภาพ/วิดีโอได้ไม่จำกัด');
    console.log('   • ไม่โดนแบน/ลบ/แก้ไข tier');
    console.log('   • มีสิทธิ์สูงสุดในระบบ');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');
  }
}

// รันฟังก์ชัน
createSuperAdmin();
