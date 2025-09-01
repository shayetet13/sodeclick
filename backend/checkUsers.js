const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/love');
    console.log('✅ เชื่อมต่อฐานข้อมูลสำเร็จ');

    // ตรวจสอบสถิติต่างๆ
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersWithImages = await User.countDocuments({ profileImages: { $exists: true, $ne: [] } });
    const regularUsers = await User.countDocuments({ 'membership.tier': 'member' });
    const regularUsersWithImages = await User.countDocuments({ 
      'membership.tier': 'member', 
      profileImages: { $exists: true, $ne: [] } 
    });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    console.log('\n📊 สถิติ User ในระบบ:');
    console.log('👥 Total Users:', totalUsers);
    console.log('✅ Active Users:', activeUsers);
    console.log('❌ Banned Users:', bannedUsers);
    console.log('🖼️ Users with Images:', usersWithImages);
    console.log('👤 Regular Users (member):', regularUsers);
    console.log('🖼️ Regular Users with Images:', regularUsersWithImages);

    // ตรวจสอบ user ที่ตรงตามเงื่อนไขของ API /all
    const matchingUsers = await User.countDocuments({
      isActive: true,
      isBanned: false,
      profileImages: { $exists: true, $ne: [] }
    });

    console.log('\n🔍 User ที่ตรงตามเงื่อนไข API /all:', matchingUsers);

    // ดูตัวอย่าง user ที่มีปัญหา
    const usersWithoutImages = await User.find({
      isActive: true,
      isBanned: false,
      $or: [
        { profileImages: { $exists: false } },
        { profileImages: [] }
      ]
    }).limit(5);

    if (usersWithoutImages.length > 0) {
      console.log('\n⚠️ ตัวอย่าง User ที่ไม่มีรูปโปรไฟล์:');
      usersWithoutImages.forEach(user => {
        console.log(`- ${user.displayName || user.firstName} (${user._id}): membership=${user.membership?.tier || 'none'}`);
      });
    }

    // ดูตัวอย่าง user ที่มีรูปโปรไฟล์
    const usersWithImagesSample = await User.find({
      isActive: true,
      isBanned: false,
      profileImages: { $exists: true, $ne: [] }
    }).limit(5);

    if (usersWithImagesSample.length > 0) {
      console.log('\n✅ ตัวอย่าง User ที่มีรูปโปรไฟล์:');
      usersWithImagesSample.forEach(user => {
        console.log(`- ${user.displayName || user.firstName} (${user._id}): membership=${user.membership?.tier || 'none'}, images=${user.profileImages?.length || 0}`);
      });
    }

    await mongoose.disconnect();
    console.log('\n👋 ปิดการเชื่อมต่อฐานข้อมูล');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();
