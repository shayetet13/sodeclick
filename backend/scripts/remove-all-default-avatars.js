const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

async function removeAllDefaultAvatars() {
  try {
    console.log('🔍 Finding users with default avatars...');
    
    // ค้นหา users ทั้งหมด
    const users = await User.find({});
    console.log(`📊 Total users: ${users.length}`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      if (!user.profileImages || user.profileImages.length === 0) {
        continue;
      }
      
      // กรองเฉพาะรูปจริง (ไม่ใช่ default avatar)
      const realImages = user.profileImages.filter(img => {
        return img && typeof img === 'string' && !img.startsWith('data:image/svg+xml');
      });
      
      // ถ้ามีการเปลี่ยนแปลง
      if (realImages.length !== user.profileImages.length) {
        user.profileImages = realImages;
        
        // ถ้า mainProfileImageIndex ชี้ไปที่รูปที่ถูกลบ ให้ reset เป็น 0
        if (user.mainProfileImageIndex >= realImages.length) {
          user.mainProfileImageIndex = 0;
        }
        
        await user.save();
        updatedCount++;
        
        console.log(`✅ Updated user ${user.username || user._id}: ${user.profileImages.length} -> ${realImages.length} images`);
      }
    }
    
    console.log(`\n✅ Done! Updated ${updatedCount} users`);
    console.log(`📊 Summary:`);
    console.log(`   - Total users: ${users.length}`);
    console.log(`   - Users updated: ${updatedCount}`);
    console.log(`   - Users unchanged: ${users.length - updatedCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeAllDefaultAvatars();

