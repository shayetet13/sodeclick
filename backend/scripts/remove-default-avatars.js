const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick';

async function removeDefaultAvatars() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ค้นหาผู้ใช้ทั้งหมด
    const users = await User.find({});
    console.log(`📊 Found ${users.length} total users`);

    let cleanedCount = 0;
    let skippedCount = 0;
    let noImagesCount = 0;

    for (const user of users) {
      if (!user.profileImages || user.profileImages.length === 0) {
        noImagesCount++;
        continue;
      }

      // กรองรูปภาพที่ไม่ใช่ default avatar (SVG base64)
      const realImages = user.profileImages.filter(img => {
        const imagePath = typeof img === 'string' ? img : img?.url || '';
        return !imagePath.startsWith('data:image/svg+xml');
      });

      // ถ้ามีรูปจริงอยู่ ให้ลบ default avatar ออก
      if (realImages.length > 0 && realImages.length < user.profileImages.length) {
        console.log(`🧹 Cleaning user ${user._id} (${user.firstName} ${user.lastName})`);
        console.log(`   Before: ${user.profileImages.length} images`);
        console.log(`   After: ${realImages.length} images`);
        
        user.profileImages = realImages;
        
        // ตรวจสอบและปรับ mainProfileImageIndex ถ้าจำเป็น
        if (user.mainProfileImageIndex >= realImages.length) {
          user.mainProfileImageIndex = 0;
          console.log(`   ⚠️  Reset mainProfileImageIndex to 0`);
        }
        
        await user.save();
        cleanedCount++;
      } else if (realImages.length === user.profileImages.length) {
        // ไม่มี default avatar อยู่แล้ว
        skippedCount++;
      } else {
        // มีแต่ default avatar อย่างเดียว - ไม่ลบ
        console.log(`⏭️  User ${user._id} has only default avatar, skipping...`);
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Cleaned: ${cleanedCount} users (removed default avatars)`);
    console.log(`⏭️  Skipped: ${skippedCount} users (no default avatar or only default)`);
    console.log(`📭 No images: ${noImagesCount} users`);
    console.log(`📈 Total: ${users.length} users processed`);

    console.log('\n✅ Default avatars removed successfully!');

  } catch (error) {
    console.error('❌ Error removing default avatars:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
removeDefaultAvatars();

