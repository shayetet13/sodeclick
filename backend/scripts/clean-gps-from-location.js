const mongoose = require('mongoose');
const User = require('../models/User');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sodeclick';

async function cleanGPSFromLocation() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // ค้นหาผู้ใช้ที่มี location เป็นพิกัด GPS (รูปแบบ: "13.123,100.456" หรือ "13.123456789,100.123456789")
    const coordinatePattern = /^\d+\.?\d*,\s*\d+\.?\d*$/;
    
    const users = await User.find({});
    console.log(`📊 Found ${users.length} total users`);

    let cleanedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      if (user.location && coordinatePattern.test(user.location)) {
        console.log(`🧹 Cleaning GPS coordinates for user ${user._id} (${user.firstName} ${user.lastName}): "${user.location}"`);
        
        // ลบพิกัด GPS ออกจาก location (เซ็ตเป็นค่าว่าง)
        user.location = '';
        await user.save();
        
        cleanedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Cleaned: ${cleanedCount} users`);
    console.log(`⏭️  Skipped: ${skippedCount} users (already clean)`);
    console.log(`📈 Total: ${users.length} users processed`);

    console.log('\n✅ GPS coordinates cleaned successfully!');

  } catch (error) {
    console.error('❌ Error cleaning GPS coordinates:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
cleanGPSFromLocation();

