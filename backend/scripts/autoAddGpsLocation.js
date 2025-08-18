const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: './env.development' });

// ฟังก์ชันสร้างตำแหน่งสุ่มในประเทศไทย
const generateRandomLocationInThailand = () => {
  // พิกัดของประเทศไทย (ประมาณ)
  const thailandBounds = {
    north: 20.465, // ละติจูดเหนือสุด
    south: 5.612,  // ละติจูดใต้สุด
    east: 105.639, // ลองจิจูดตะวันออกสุด
    west: 97.344   // ลองจิจูดตะวันตกสุด
  };

  const lat = Math.random() * (thailandBounds.north - thailandBounds.south) + thailandBounds.south;
  const lng = Math.random() * (thailandBounds.east - thailandBounds.west) + thailandBounds.west;

  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6))
  };
};

// ฟังก์ชันเพิ่ม gpsLocation ให้กับ user ใหม่
const addGpsLocationToNewUsers = async () => {
  try {
    // เชื่อมต่อ MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/love_app');
    console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');

    // ดึง user ที่ไม่มี gpsLocation
    const usersWithoutLocation = await User.find({
      $or: [
        { gpsLocation: { $exists: false } },
        { gpsLocation: null },
        { 'gpsLocation.lat': { $exists: false } },
        { 'gpsLocation.lng': { $exists: false } }
      ]
    });

    if (usersWithoutLocation.length === 0) {
      console.log('✅ ไม่มี user ใหม่ที่ต้องการ gpsLocation');
      return;
    }

    console.log(`📊 พบ user ที่ไม่มี gpsLocation: ${usersWithoutLocation.length} คน`);

    // อัปเดต gpsLocation ให้กับ user แต่ละคน
    let updatedCount = 0;
    for (const user of usersWithoutLocation) {
      const location = generateRandomLocationInThailand();
      
      await User.findByIdAndUpdate(user._id, {
        gpsLocation: location,
        lastLocationUpdate: new Date()
      });

      updatedCount++;
      console.log(`📍 อัปเดต user: ${user.username || user.email} -> ${location.lat}, ${location.lng}`);
    }

    console.log(`✅ อัปเดต gpsLocation สำเร็จ: ${updatedCount} คน`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    // ปิดการเชื่อมต่อ
    await mongoose.disconnect();
    console.log('🔌 ปิดการเชื่อมต่อ MongoDB');
  }
};

// ฟังก์ชันที่สามารถเรียกใช้จากภายนอก
const autoAddGpsLocation = async () => {
  await addGpsLocationToNewUsers();
};

// รัน script ถ้าเรียกโดยตรง
if (require.main === module) {
  autoAddGpsLocation();
}

module.exports = autoAddGpsLocation;
