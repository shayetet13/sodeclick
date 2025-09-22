const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createSuperAdminTest() {
  try {
    console.log('🔌 เชื่อมต่อ MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love-app');
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // ตรวจสอบว่ามี SuperAdmin อยู่แล้วหรือไม่
    const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
    if (existingSuperAdmin) {
      console.log('⚠️  พบ SuperAdmin อยู่แล้ว:', existingSuperAdmin.username);
      console.log('🔄 อัปเดตข้อมูล SuperAdmin...');
      
      // อัปเดตข้อมูล SuperAdmin
      existingSuperAdmin.coins = 999999;
      existingSuperAdmin.votePoints = 999999;
      existingSuperAdmin.membership = {
        tier: 'platinum',
        startDate: new Date(),
        endDate: null, // ไม่หมดอายุ
        autoRenew: false,
        planId: null
      };
      existingSuperAdmin.isActive = true;
      existingSuperAdmin.isBanned = false;
      
      await existingSuperAdmin.save();
      
      console.log('✅ อัปเดต SuperAdmin สำเร็จ');
      console.log('👤 Username:', existingSuperAdmin.username);
      console.log('📧 Email:', existingSuperAdmin.email);
      console.log('💰 Coins:', existingSuperAdmin.coins);
      console.log('⭐ Vote Points:', existingSuperAdmin.votePoints);
      console.log('💎 Tier:', existingSuperAdmin.membership.tier);
      console.log('');
      console.log('🚀 สิทธิ์พิเศษของ SuperAdmin:');
      console.log('   • โหวตให้ใครก็ได้ไม่จำกัด');
      console.log('   • เพิ่มเหรียญให้ใครก็ได้ไม่จำกัด');
      console.log('   • เพิ่มคะแนนโหวตให้ใครก็ได้ไม่จำกัด');
      console.log('   • มีสิทธิ์สูงสุดในระบบ');
      console.log('   • ไม่โดนแบน/ลบ/แก้ไข tier');
      
    } else {
      console.log('🆕 สร้าง SuperAdmin ใหม่...');
      
      // สร้าง SuperAdmin ใหม่
      const hashedPassword = await bcrypt.hash('priktai', 12);
      
      const superAdmin = new User({
        username: 'kao',
        email: 'kao@loveapp.com',
        password: hashedPassword,
        firstName: 'Kao',
        lastName: 'SuperAdmin',
        displayName: 'Kao SuperAdmin',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        lookingFor: 'both',
        location: 'กรุงเทพมหานคร',
        role: 'superadmin',
        membership: {
          tier: 'platinum',
          startDate: new Date(),
          endDate: null, // ไม่หมดอายุ
          autoRenew: false,
          planId: null
        },
        coins: 999999,
        votePoints: 999999,
        isActive: true,
        isBanned: false,
        gpsLocation: {
          lat: 13.7563,
          lng: 100.5018
        },
        coordinates: {
          type: 'Point',
          coordinates: [100.5018, 13.7563]
        },
        dailyUsage: {
          chatCount: 0,
          imageUploadCount: 0,
          videoUploadCount: 0,
          lastReset: new Date(),
          lastDailyBonusClaim: null,
          lastSpinWheelTime: null
        },
        lastActive: new Date(),
        profileImages: [],
        likes: [],
        blurredPhotosViewed: [],
        pinnedPosts: [],
        blurredPrivatePhotos: [],
        createdChatRooms: [],
        loginHistory: []
      });
      
      await superAdmin.save();
      
      console.log('✅ สร้าง SuperAdmin สำเร็จ');
      console.log('👤 Username: kao');
      console.log('🔑 Password: priktai');
      console.log('📧 Email: kao@loveapp.com');
      console.log('💰 Coins: 999,999');
      console.log('⭐ Vote Points: 999,999');
      console.log('💎 Tier: Platinum');
      console.log('');
      console.log('🚀 สิทธิ์พิเศษของ SuperAdmin:');
      console.log('   • โหวตให้ใครก็ได้ไม่จำกัด');
      console.log('   • เพิ่มเหรียญให้ใครก็ได้ไม่จำกัด');
      console.log('   • เพิ่มคะแนนโหวตให้ใครก็ได้ไม่จำกัด');
      console.log('   • มีสิทธิ์สูงสุดในระบบ');
      console.log('   • ไม่โดนแบน/ลบ/แก้ไข tier');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');
  }
}

// รันฟังก์ชัน
createSuperAdminTest();
