const mongoose = require('mongoose');
const CoinPackage = require('../models/CoinPackage');

// Script สำหรับลบ Test Package ออกจากฐานข้อมูล
async function removeTestPackage() {
  try {
    // เชื่อมต่อฐานข้อมูล
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick');

    console.log('🔄 กำลังลบ Test Package ออกจากฐานข้อมูล...');

    // ลบ Test Package
    const testPackages = await CoinPackage.find({ name: 'Test Package' });
    console.log(`📦 พบ Test Package จำนวน: ${testPackages.length} แพ็คเกจ`);

    if (testPackages.length > 0) {
      // ลบ Test Package
      const deleteResult = await CoinPackage.deleteMany({ name: 'Test Package' });
      console.log(`✅ ลบ Test Package สำเร็จ: ${deleteResult.deletedCount} แพ็คเกจ`);
    } else {
      console.log('✅ ไม่พบ Test Package ในฐานข้อมูล');
    }

    console.log('🎉 การลบ Test Package เสร็จสิ้นแล้ว');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลบ Test Package:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
  }
}

// รัน script
if (require.main === module) {
  removeTestPackage();
}

module.exports = { removeTestPackage };
