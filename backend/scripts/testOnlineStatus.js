const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/love', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ เชื่อมต่อ MongoDB สำเร็จ');
  testOnlineStatus();
}).catch((error) => {
  console.error('❌ ไม่สามารถเชื่อมต่อ MongoDB:', error);
  process.exit(1);
});

async function testOnlineStatus() {
  try {
    console.log('🔍 ตรวจสอบสถานะออนไลน์ของผู้ใช้...\n');

    // นับจำนวนผู้ใช้ทั้งหมด
    const totalUsers = await User.countDocuments();
    console.log(`📊 จำนวนผู้ใช้ทั้งหมด: ${totalUsers}`);

    // นับจำนวนผู้ใช้ออนไลน์ทั้งหมด
    const onlineUsers = await User.countDocuments({ isOnline: true });
    console.log(`🟢 จำนวนผู้ใช้ออนไลน์ทั้งหมด: ${onlineUsers}`);

    // นับจำนวนผู้ใช้ออฟไลน์
    const offlineUsers = await User.countDocuments({ isOnline: false });
    console.log(`🔴 จำนวนผู้ใช้ออฟไลน์: ${offlineUsers}`);

    // แสดงรายละเอียดผู้ใช้ออนไลน์
    const onlineUserDetails = await User.find({ isOnline: true })
      .select('username displayName email lastActive isOnline _id')
      .limit(5);

    console.log('\n👥 รายละเอียดผู้ใช้ออนไลน์ (5 คนแรก):');
    onlineUserDetails.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName || user.username} (${user.email})`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - isOnline: ${user.isOnline}`);
      console.log(`   - lastActive: ${user.lastActive}`);
      console.log('');
    });

    // แสดงรายละเอียดผู้ใช้ออฟไลน์
    const offlineUserDetails = await User.find({ isOnline: false })
      .select('username displayName email lastActive isOnline _id')
      .limit(5);

    console.log('👤 รายละเอียดผู้ใช้ออฟไลน์ (5 คนแรก):');
    offlineUserDetails.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName || user.username} (${user.email})`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - isOnline: ${user.isOnline}`);
      console.log(`   - lastActive: ${user.lastActive}`);
      console.log('');
    });

    // ตรวจสอบผู้ใช้ที่เข้าสู่ระบบล่าสุด
    const recentUsers = await User.find()
      .select('username displayName email lastLogin isOnline _id')
      .sort({ lastLogin: -1 })
      .limit(3);

    console.log('🕒 ผู้ใช้ที่เข้าสู่ระบบล่าสุด:');
    recentUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.displayName || user.username} (${user.email})`);
      console.log(`   - ID: ${user._id}`);
      console.log(`   - isOnline: ${user.isOnline}`);
      console.log(`   - lastLogin: ${user.lastLogin}`);
      console.log('');
    });

    // ทดสอบการนับแบบเดียวกับ API (ไม่รวมตัวเอง)
    const sampleUserId = recentUsers[0]?._id;
    if (sampleUserId) {
      console.log('🧪 ทดสอบการนับแบบ API (ไม่รวมตัวเอง):');
      console.log(`   - ใช้ User ID: ${sampleUserId}`);
      
      const apiStyleUsers = await User.find({
        _id: { $ne: sampleUserId },
        isActive: true,
        isBanned: false
      }).select('isOnline');
      
      const apiStyleOnlineCount = apiStyleUsers.filter(u => u.isOnline).length;
      console.log(`   - จำนวนผู้ใช้ทั้งหมด (ไม่รวมตัวเอง): ${apiStyleUsers.length}`);
      console.log(`   - จำนวนผู้ใช้ออนไลน์ (ไม่รวมตัวเอง): ${apiStyleOnlineCount}`);
      console.log('');
    }

    console.log('✅ การตรวจสอบเสร็จสิ้น');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    mongoose.connection.close();
  }
}
