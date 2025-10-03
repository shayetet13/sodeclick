const mongoose = require('mongoose');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

// Script สำหรับลบ test tier ออกจากฐานข้อมูล
async function removeTestTier() {
  try {
    // เชื่อมต่อฐานข้อมูล
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sodeclick');

    console.log('🔄 กำลังลบ test tier ออกจากฐานข้อมูล...');

    // ลบผู้ใช้ที่เป็น test tier
    const testUsers = await User.find({ 'membership.tier': 'test' });
    console.log(`📊 พบผู้ใช้ test tier จำนวน: ${testUsers.length} คน`);

    if (testUsers.length > 0) {
      // ลบผู้ใช้ที่เป็น test tier
      const deleteResult = await User.deleteMany({ 'membership.tier': 'test' });
      console.log(`✅ ลบผู้ใช้ test tier สำเร็จ: ${deleteResult.deletedCount} คน`);
    }

    // ลบแพ็คเกจ test tier
    const testPlans = await MembershipPlan.find({ tier: 'test' });
    console.log(`📦 พบแพ็คเกจ test tier จำนวน: ${testPlans.length} แพ็คเกจ`);

    if (testPlans.length > 0) {
      const deletePlanResult = await MembershipPlan.deleteMany({ tier: 'test' });
      console.log(`✅ ลบแพ็คเกจ test tier สำเร็จ: ${deletePlanResult.deletedCount} แพ็คเกจ`);
    }

    // อัปเดตผู้ใช้ที่อาจมีข้อมูล test tier ในส่วนอื่นๆ
    const updateResult = await User.updateMany(
      { 'membership.tier': 'test' },
      { $unset: { 'membership.tier': 1 } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(`🔄 อัปเดตผู้ใช้ที่เหลือ: ${updateResult.modifiedCount} คน`);
    }

    console.log('🎉 การลบ test tier เสร็จสิ้นแล้ว');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการลบ test tier:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 ปิดการเชื่อมต่อฐานข้อมูล');
  }
}

// รัน script
if (require.main === module) {
  removeTestTier();
}

module.exports = { removeTestTier };
